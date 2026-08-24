/**
 * Builds OpenAir format output from normalized zone data
 * Generates consistent OpenAir headers and DP entries for all adapters
 */

/**
 * Generate OpenAir section header for a zone
 * @param {string} zoneName - Zone identifier/name for AN field
 * @returns {string} OpenAir formatted section header
 */
function generateSectionHeader(zoneName) {
  return `\n\n**ZONE SENSIBILITE MAXIMUM**\n**Site ZSM Gypaete  Bird Protection Tampon**\nAC UNC\nAY P\nAN ${zoneName}\n`;
}

/**
 * Generate OpenAir DP (data point) entry for a coordinate
 * @param {string} latDMS - Latitude in DMS format
 * @param {string} lonDMS - Longitude in DMS format
 * @returns {string} OpenAir DP formatted line
 */
function generateDPEntry(latDMS, lonDMS) {
  return `DP ${latDMS} ${lonDMS}\n`;
}

/**
 * Generate complete OpenAir zone section
 * @param {Object} zoneData - Zone data object
 * @param {string} zoneData.zoneName - Zone identifier
 * @param {string} zoneData.altitudeString - Altitude lines from altitude-transformer
 * @param {Array<Array<number>>} zoneData.coordinates - [[lon, lat], ...]
 * @param {Function} coordinateConverter - convertCoordinateToDMS function from coordinate-transformer
 * @returns {string} Complete OpenAir zone section with closing DP
 */
function generateZoneSection(zoneData, coordinateConverter) {
  let openairData = generateSectionHeader(zoneData.zoneName);
  openairData += zoneData.altitudeString;

  if (!zoneData.coordinates || zoneData.coordinates.length === 0) {
    return openairData;
  }

  // Store first DP to close the polygon
  let firstDP = null;

  // Generate DP entries for all coordinates
  for (let i = 0; i < zoneData.coordinates.length; i++) {
    const [lon, lat] = zoneData.coordinates[i];
    const { lonDMS, latDMS } = coordinateConverter(lon, lat);
    const dpEntry = generateDPEntry(latDMS, lonDMS);

    openairData += dpEntry;

    if (i === 0) {
      firstDP = dpEntry;
    }
  }

  // Close the polygon by repeating first point
  if (firstDP) {
    openairData += firstDP;
  }

  return openairData;
}

module.exports = {
  generateSectionHeader,
  generateDPEntry,
  generateZoneSection
};
