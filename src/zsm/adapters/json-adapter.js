/**
 * JSON Adapter - Parses GeoJSON from WFS endpoint to OpenAir format
 * Handles SIA ZSM GeoJSON data source with required Referer header
 */

const got = require('got');
const fs = require('fs');
const { convertCoordinateToDMS } = require('../transformer/coordinate-transformer');
const { calculateAltitude } = require('../transformer/altitude-transformer');
const { generateZoneSection } = require('../transformer/openair-builder');

/**
 * Download JSON from URL with required Referer header
 * @param {string} url - WFS endpoint URL
 * @returns {Promise<string>} JSON data as string
 */
async function downloadJSON(url) {
  console.log(`Downloading JSON from: ${url}`);
  
  try {
    const response = await got.default(url, {
      headers: {
        'Referer': 'https://www.sia.aviation-civile.gouv.fr/'
      },
      retry: { limit: 3 }
    });
    
    console.log('JSON downloaded successfully');
    return response.body;
  } catch (error) {
    console.error(`Download failed: ${error.message}`);
    throw error;
  }
}

/**
 * Parse GeoJSON FeatureCollection and extract zone data
 * @param {string} jsonData - Raw JSON string
 * @returns {Object} Object with zones array and timeStamp
 */
function parseGeoJSON(jsonData) {
  const geojson = JSON.parse(jsonData);
  
  if (!geojson.features || !Array.isArray(geojson.features)) {
    throw new Error('Invalid GeoJSON: missing features array');
  }

  // Extract timeStamp from root level
  const timeStamp = geojson.timeStamp;

  const zones = geojson.features.map(feature => {
    const props = feature.properties || {};
    const geom = feature.geometry || {};

    // Extract zone name from nom_aire and id_zsm_tampon properties
    const nomAire = props.nom_aire || 'UNNAMED';
    const idZsmTampon = props.id_zsm_tampon;
    const zoneName = idZsmTampon ? `${nomAire} (${idZsmTampon})` : nomAire;

    // Extract altitude from h_survol_ft property (optional)
    const altitudeFeet = props.h_survol_ft;

    // Extract polygon coordinates
    let coordinates = [];
    if (geom.type === 'Polygon' && geom.coordinates && geom.coordinates[0]) {
      coordinates = geom.coordinates[0].map(coord => [
        parseFloat(coord[0]), // longitude
        parseFloat(coord[1])  // latitude
      ]);
    } else if (geom.type === 'MultiPolygon' && geom.coordinates) {
      // For MultiPolygon, use first polygon's outer ring
      if (geom.coordinates[0] && geom.coordinates[0][0]) {
        coordinates = geom.coordinates[0][0].map(coord => [
          parseFloat(coord[0]), // longitude
          parseFloat(coord[1])  // latitude
        ]);
      }
    }

    return {
      zoneName,
      altitudeFeet,
      coordinates
    };
  });

  return { zones, timeStamp };
}

/**
 * Transform parsed zone data to OpenAir format
 * @param {Array<Object>} zones - Array of zone objects from parseGeoJSON
 * @param {string} timeStamp - Optional timeStamp from GeoJSON
 * @returns {string} Complete OpenAir formatted data
 */
function transformToOpenAir(zones, timeStamp) {
  let openairData = '';

  // Add timeStamp comment at top if available
  if (timeStamp) {
    openairData += `* timeStamp= ${timeStamp}\n`;
  }

  zones.forEach(zone => {
    // Calculate altitude (handles undefined case)
    const { altitudeString } = calculateAltitude(zone.altitudeFeet);

    // Create zone data for OpenAir generation
    const zoneData = {
      zoneName: zone.zoneName,
      altitudeString,
      coordinates: zone.coordinates
    };

    // Generate OpenAir section
    openairData += generateZoneSection(zoneData, convertCoordinateToDMS);
  });

  return openairData;
}

/**
 * Main JSON adapter function
 * @param {string} url - WFS endpoint URL
 * @param {string} outputFilename - Output file path
 * @returns {Promise<void>}
 */
async function processJSON(url, outputFilename) {
  try {
    // Download JSON
    const jsonData = await downloadJSON(url);

    // Parse GeoJSON
    const { zones, timeStamp } = parseGeoJSON(jsonData);
    console.log(`Parsed ${zones.length} zones from GeoJSON`);
    if (timeStamp) {
      console.log(`TimeStamp: ${timeStamp}`);
    }

    // Transform to OpenAir format
    const openairData = transformToOpenAir(zones, timeStamp);

    // Write output file
    fs.writeFile(outputFilename, openairData, (err) => {
      if (err) throw err;
      console.log(`OpenAir file saved to: ${outputFilename}`);
    });
  } catch (error) {
    console.error(`JSON processing failed: ${error.message}`);
    throw error;
  }
}

module.exports = {
  processJSON,
  downloadJSON,
  parseGeoJSON,
  transformToOpenAir
};
