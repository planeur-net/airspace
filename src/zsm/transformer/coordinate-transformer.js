/**
 * Converts decimal degrees coordinates to DMS (Degrees Minutes Seconds) format
 * Used by both KML and JSON adapters for consistent coordinate output
 */

/**
 * Convert decimal degrees to DMS format
 * @param {number} deg - Decimal degree value
 * @param {boolean} lng - true for longitude (E/W), false for latitude (N/S)
 * @returns {string} DMS formatted string (e.g., "048:30:45 N")
 */
function convertDDToDMS(deg, lng) {
  let d = parseInt(deg.toString());
  let minfloat = Math.abs((deg - d) * 60);
  let m = Math.floor(minfloat);
  const secfloat = (minfloat - m) * 60;
  let s = Math.round((secfloat + Number.EPSILON) * 100) / 100;
  s = Math.floor(s); // Do not keep decimal places for seconds

  // Handle seconds rollover - increment minutes if seconds reach 60
  if (s >= 60) {
    s = 0;
    m += 1;
  }

  // Handle minutes rollover - increment degrees if minutes reach 60
  if (m >= 60) {
    m = 0;
    d += 1;
  }

  // Determine direction
  const dir = deg < 0 ? (lng ? 'W' : 'S') : (lng ? 'E' : 'N');
  const absDeg = Math.abs(d);

  // Format with leading zeros
  const degreesStr = absDeg < 10 ? `00${absDeg}` : (absDeg < 100 ? `0${absDeg}` : absDeg);
  const minutesStr = m < 10 ? `0${m}` : m;
  const secondsStr = s < 10 ? `0${s}` : s;

  return `${degreesStr}:${minutesStr}:${secondsStr} ${dir}`;
}

/**
 * Convert coordinate pair to DMS strings
 * @param {number} lon - Longitude in decimal degrees
 * @param {number} lat - Latitude in decimal degrees
 * @returns {Object} { lonDMS: string, latDMS: string }
 */
function convertCoordinateToDMS(lon, lat) {
  return {
    lonDMS: convertDDToDMS(lon, true),
    latDMS: convertDDToDMS(lat, false)
  };
}

module.exports = {
  convertDDToDMS,
  convertCoordinateToDMS
};
