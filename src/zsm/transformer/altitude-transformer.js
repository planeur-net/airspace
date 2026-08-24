/**
 * Handles altitude calculations and conversions for ZSM airspaces
 * Provides consistent altitude handling across KML and JSON sources
 */

/**
 * Calculate altitude AMSL from feet value
 * Converts feet to meters (no buffer added)
 * 
 * @param {number|undefined} altitudeFeet - Altitude in feet (or undefined)
 * @returns {Object} { hasAltitude: boolean, altitudeString: string }
 *                   - hasAltitude: true if altitude was provided
 *                   - altitudeString: OpenAir format altitude lines (AH and AL)
 */
function calculateAltitude(altitudeFeet) {
  if (altitudeFeet === undefined || altitudeFeet === null) {
    // Fallback when altitude not available: ground level with 1000m AGL
    return {
      hasAltitude: false,
      altitudeString: 'AL GND\nAH 1000M AGL\n'
    };
  }

  // Convert feet to meters
  const altitudeMeters = Math.floor(altitudeFeet * 0.3048);
  return {
    hasAltitude: true,
    altitudeString: `AH ${altitudeMeters}m AMSL\nAL GND\n`
  };
}

module.exports = {
  calculateAltitude
};
