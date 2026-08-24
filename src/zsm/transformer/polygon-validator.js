/**
 * Polygon Validator and Fixer
 * Detects and fixes self-intersecting polygons
 */

/**
 * Check if two line segments intersect
 * @param {Array} p1 - Start point of line 1 [lon, lat]
 * @param {Array} p2 - End point of line 1 [lon, lat]
 * @param {Array} p3 - Start point of line 2 [lon, lat]
 * @param {Array} p4 - End point of line 2 [lon, lat]
 * @returns {boolean} True if segments intersect
 */
function segmentsIntersect(p1, p2, p3, p4) {
  const ccw = (A, B, C) => (C[1] - A[1]) * (B[0] - A[0]) > (B[1] - A[1]) * (C[0] - A[0]);
  return ccw(p1, p3, p4) !== ccw(p2, p3, p4) && ccw(p1, p2, p3) !== ccw(p1, p2, p4);
}

/**
 * Detect self-intersections in a polygon
 * Only checks open polygon (without closure point)
 * @param {Array} coordinates - Array of [lon, lat] points (can be open or closed)
 * @returns {Array} Array of intersection objects or empty if valid
 */
function detectIntersections(coordinates) {
  const intersections = [];
  
  // Remove closure point if present for consistent checking
  let points = coordinates;
  if (coordinates.length > 1 && 
      coordinates[0][0] === coordinates[coordinates.length - 1][0] &&
      coordinates[0][1] === coordinates[coordinates.length - 1][1]) {
    points = coordinates.slice(0, -1);
  }
  
  if (points.length < 4) {
    return intersections; // Need at least 4 points for self-intersection
  }

  // Check each line segment against non-adjacent segments
  for (let i = 0; i < points.length; i++) {
    for (let j = i + 2; j < points.length; j++) {
      // Skip checking adjacent segments
      if (j === i + 1) continue;
      
      // Skip checking the wrapping edges for open polygon
      if (i === 0 && j === points.length - 1) continue;
      
      const p1 = points[i];
      const p2 = points[(i + 1) % points.length];
      const p3 = points[j];
      const p4 = points[(j + 1) % points.length];
      
      if (segmentsIntersect(p1, p2, p3, p4)) {
        intersections.push({
          segment1: { start: i, end: (i + 1) % points.length },
          segment2: { start: j, end: (j + 1) % points.length }
        });
      }
    }
  }

  return intersections;
}

/**
 * Check if a point is very close to another (potential duplicate)
 * @param {Array} p1 - Point 1 [lon, lat]
 * @param {Array} p2 - Point 2 [lon, lat]
 * @param {number} threshold - Distance threshold in degrees
 * @returns {boolean}
 */
function isNearDuplicate(p1, p2, threshold = 0.00001) {
  const lonDiff = Math.abs(p1[0] - p2[0]);
  const latDiff = Math.abs(p1[1] - p2[1]);
  return lonDiff < threshold && latDiff < threshold;
}

/**
 * Calculate distance between two points
 * @param {Array} p1 - Point 1 [lon, lat]
 * @param {Array} p2 - Point 2 [lon, lat]
 * @returns {number} Distance in degrees
 */
function distance(p1, p2) {
  const dx = p1[0] - p2[0];
  const dy = p1[1] - p2[1];
  return Math.sqrt(dx * dx + dy * dy);
}

/**
 * Douglas-Peucker polygon simplification algorithm
 * Reduces points while maintaining overall shape
 * @param {Array} coordinates - Array of [lon, lat] points
 * @param {number} epsilon - Simplification tolerance
 * @returns {Array} Simplified coordinates
 */
function simplifyPolygon(coordinates, epsilon = 0.0001) {
  if (coordinates.length <= 3) {
    return coordinates;
  }

  const dmax = { distance: 0, index: 0 };
  const end = coordinates.length - 1;

  // Find point with maximum distance from line
  for (let i = 1; i < end; i++) {
    const d = perpendicularDistance(coordinates[i], coordinates[0], coordinates[end]);
    if (d > dmax.distance) {
      dmax.distance = d;
      dmax.index = i;
    }
  }

  // If max distance is greater than epsilon, recursively simplify
  if (dmax.distance > epsilon) {
    const recResults1 = simplifyPolygon(coordinates.slice(0, dmax.index + 1), epsilon);
    const recResults2 = simplifyPolygon(coordinates.slice(dmax.index), epsilon);
    return recResults1.slice(0, -1).concat(recResults2);
  } else {
    return [coordinates[0], coordinates[end]];
  }
}

/**
 * Calculate perpendicular distance from point to line
 * @param {Array} point - Point [lon, lat]
 * @param {Array} lineStart - Line start [lon, lat]
 * @param {Array} lineEnd - Line end [lon, lat]
 * @returns {number} Distance
 */
function perpendicularDistance(point, lineStart, lineEnd) {
  const dx = lineEnd[0] - lineStart[0];
  const dy = lineEnd[1] - lineStart[1];
  const t = Math.max(0, Math.min(1, ((point[0] - lineStart[0]) * dx + (point[1] - lineStart[1]) * dy) / (dx * dx + dy * dy)));
  const closest = [lineStart[0] + t * dx, lineStart[1] + t * dy];
  return distance(point, closest);
}

/**
 * Simplify polygon by removing duplicate/very close points
 * @param {Array} coordinates - Array of [lon, lat] points
 * @returns {Array} Simplified coordinates (without forced closure)
 */
function removeNearDuplicates(coordinates) {
  if (coordinates.length < 3) {
    return coordinates;
  }

  const simplified = [coordinates[0]];

  for (let i = 1; i < coordinates.length; i++) {
    if (!isNearDuplicate(simplified[simplified.length - 1], coordinates[i])) {
      simplified.push(coordinates[i]);
    }
  }

  return simplified;
}

/**
 * Remove collinear points (3+ consecutive points in a line)
 * These often cause self-intersection issues
 * @param {Array} coordinates - Array of [lon, lat] points
 * @returns {Array} Coordinates with collinear points removed
 */
function removeCollinearPoints(coordinates) {
  if (coordinates.length <= 3) return coordinates;

  const result = [coordinates[0]];
  const angleThreshold = 0.01; // radians - very small angle tolerance

  for (let i = 1; i < coordinates.length - 1; i++) {
    const prev = result[result.length - 1];
    const curr = coordinates[i];
    const next = coordinates[i + 1];

    // Calculate angles
    const angle1 = Math.atan2(curr[1] - prev[1], curr[0] - prev[0]);
    const angle2 = Math.atan2(next[1] - curr[1], next[0] - curr[0]);
    
    // If angles differ significantly, point is not collinear
    let angleDiff = Math.abs(angle2 - angle1);
    if (angleDiff > Math.PI) {
      angleDiff = 2 * Math.PI - angleDiff;
    }

    if (angleDiff > angleThreshold) {
      result.push(curr);
    }
  }

  // Always include last point
  if (result[result.length - 1] !== coordinates[coordinates.length - 1]) {
    result.push(coordinates[coordinates.length - 1]);
  }

  return result;
}

/**
 * Visvalingam-Whyatt simplification (more effective for self-intersections than Douglas-Peucker)
 * @param {Array} coordinates - Array of [lon, lat] points
 * @param {number} threshold - Area threshold for point removal
 * @returns {Array} Simplified coordinates
 */
function simplifyVisvalingam(coordinates, threshold = 0.0000001) {
  if (coordinates.length <= 3) return coordinates;

  // Remove closing point for processing
  const points = coordinates[coordinates.length - 1][0] === coordinates[0][0] &&
                 coordinates[coordinates.length - 1][1] === coordinates[0][1]
    ? coordinates.slice(0, -1)
    : coordinates;

  if (points.length <= 3) {
    return points.concat([points[0]]);
  }

  // Calculate area of triangle for each point
  const areas = [];
  for (let i = 0; i < points.length; i++) {
    const prev = points[(i - 1 + points.length) % points.length];
    const curr = points[i];
    const next = points[(i + 1) % points.length];

    // Triangle area using cross product
    const area = Math.abs(
      (curr[0] - prev[0]) * (next[1] - curr[1]) -
      (curr[1] - prev[1]) * (next[0] - curr[0])
    ) / 2;

    areas.push({ index: i, area });
  }

  // Remove points with smallest area repeatedly
  let indices = Array.from({ length: points.length }, (_, i) => i);
  
  while (indices.length > 3) {
    let minArea = Infinity;
    let minIdx = -1;

    for (let i = 0; i < indices.length; i++) {
      const idx = indices[i];
      const prevIdx = indices[(i - 1 + indices.length) % indices.length];
      const nextIdx = indices[(i + 1) % indices.length];

      const prev = points[prevIdx];
      const curr = points[idx];
      const next = points[nextIdx];

      const area = Math.abs(
        (curr[0] - prev[0]) * (next[1] - curr[1]) -
        (curr[1] - prev[1]) * (next[0] - curr[0])
      ) / 2;

      if (area < minArea) {
        minArea = area;
        minIdx = i;
      }
    }

    if (minArea > threshold) break;
    indices.splice(minIdx, 1);
  }

  const result = indices.map(i => points[i]);
  result.push(result[0]); // Ensure closure
  return result;
}

/**
 * Validate and fix polygon
 * @param {Array} coordinates - Array of [lon, lat] points
 * @param {string} zoneName - Zone name for logging
 * @returns {Object} { isValid: boolean, coordinates: Array, issues: Array }
 */
function validateAndFixPolygon(coordinates, zoneName) {
  const issues = [];

  if (coordinates.length < 3) {
    issues.push('Polygon has fewer than 3 points');
    return { isValid: false, coordinates, issues };
  }

  // Ensure input has closure for consistency
  let input = coordinates.slice();
  const hasClosure = input.length > 1 && 
                     input[0][0] === input[input.length - 1][0] &&
                     input[0][1] === input[input.length - 1][1];
  
  if (!hasClosure) {
    input.push(input[0]);
  }

  // Step 1: Check RAW geometry for self-intersections FIRST
  let rawIntersections = detectIntersections(input);
  
  // If raw geometry is valid, just clean duplicates and return
  if (rawIntersections.length === 0) {
    let fixed = removeNearDuplicates(input);
    const dupsRemoved = input.length - fixed.length;
    if (dupsRemoved > 0) {
      issues.push(`Removed ${dupsRemoved} duplicate/near-duplicate points`);
    }
    
    // Re-ensure closure after dedup
    if (fixed.length > 1 && (fixed[0][0] !== fixed[fixed.length - 1][0] || fixed[0][1] !== fixed[fixed.length - 1][1])) {
      fixed.push(fixed[0]);
    }
    
    issues.push('Raw geometry valid - no self-intersections detected');
    console.warn(`✓ Zone '${zoneName}': ${issues.join(' | ')}`);
    return {
      isValid: true,
      coordinates: fixed,
      issues
    };
  }

  // Step 2: Raw geometry HAS intersections - apply fixes
  let fixed = removeNearDuplicates(input);
  const dupsRemoved = input.length - fixed.length;
  if (dupsRemoved > 0) {
    issues.push(`Removed ${dupsRemoved} duplicates`);
  }

  // Step 3: Remove collinear points (often cause self-intersections)
  const beforeCollinear = fixed.length;
  fixed = removeCollinearPoints(fixed);
  if (fixed.length !== beforeCollinear) {
    issues.push(`Removed ${beforeCollinear - fixed.length} collinear points`);
  }

  // Ensure closure for intersection checking
  if (fixed.length > 1 && (fixed[0][0] !== fixed[fixed.length - 1][0] || fixed[0][1] !== fixed[fixed.length - 1][1])) {
    fixed.push(fixed[0]);
  }

  // Step 4: Re-check for self-intersections after cleaning
  let intersections = detectIntersections(fixed);
  
  // Step 5: If STILL has intersections, apply stronger fixes
  if (intersections.length > 0) {
    issues.push(`Detected ${intersections.length} self-intersection(s)`);
    
    // Try polar angle sort first
    const pointsToSort = fixed[fixed.length - 1][0] === fixed[0][0] && 
                         fixed[fixed.length - 1][1] === fixed[0][1] 
      ? fixed.slice(0, -1) 
      : fixed;
    
    fixed = sortByPolarAngle(pointsToSort);
    if (fixed[fixed.length - 1][0] !== fixed[0][0] || fixed[fixed.length - 1][1] !== fixed[0][1]) {
      fixed.push(fixed[0]);
    }
    
    intersections = detectIntersections(fixed);
    
    // If polar sort didn't work, try Visvalingam-Whyatt simplification
    if (intersections.length > 0) {
      issues.push(`Polar angle sort didn't resolve - trying Visvalingam-Whyatt simplification`);
      const pointsToSimplify = fixed.slice(0, -1);
      fixed = simplifyVisvalingam(pointsToSimplify, 0.00000001);
      
      intersections = detectIntersections(fixed);
      
      if (intersections.length === 0) {
        issues.push('Resolved by Visvalingam-Whyatt simplification');
      }
    } else {
      issues.push('Resolved by polar angle reordering');
    }
  }

  console.warn(`⚠ Zone '${zoneName}': ${issues.join(' | ')}`);

  return {
    isValid: intersections.length === 0,
    coordinates: fixed,
    issues
  };
}

/**
 * Sort polygon points by polar angle from centroid
 * This effectively fixes self-intersecting polygons by ensuring circular order
 * @param {Array} coordinates - Array of [lon, lat] points
 * @returns {Array} Sorted coordinates with closure
 */
function sortByPolarAngle(coordinates) {
  if (coordinates.length <= 3) {
    return coordinates;
  }

  // Calculate centroid
  let sumLon = 0, sumLat = 0;
  coordinates.forEach(coord => {
    sumLon += coord[0];
    sumLat += coord[1];
  });
  
  const centroid = [sumLon / coordinates.length, sumLat / coordinates.length];

  // Sort by polar angle from centroid
  const sorted = coordinates.slice().sort((a, b) => {
    const angleA = Math.atan2(a[1] - centroid[1], a[0] - centroid[0]);
    const angleB = Math.atan2(b[1] - centroid[1], b[0] - centroid[0]);
    return angleA - angleB;
  });

  // Ensure polygon closure
  if (sorted[sorted.length - 1][0] !== sorted[0][0] || sorted[sorted.length - 1][1] !== sorted[0][1]) {
    sorted.push(sorted[0]);
  }

  return sorted;
}

module.exports = {
  validateAndFixPolygon,
  detectIntersections,
  removeNearDuplicates,
  removeCollinearPoints,
  simplifyPolygon,
  simplifyVisvalingam
};
