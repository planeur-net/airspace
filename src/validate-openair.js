const { Parser } = require('@openaip/openair-parser');

/*
 The default parser configuration for reference.
 */
const config = {
version: '2.0',
    // Defines a set of allowed values -  default ICAO classes.
    allowedClasses: ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'UNC'],
    // Defines a set of allowed "AY" values if version 2 is used. If empty, allows all used types.
    allowedTypes: [
        'ACCSEC',
        'ADIZ',
        'ALERT',
        'ASRA',
        'ATZ',
        'AWY',
        'CTA',
        'CTR',
        'CUSTOM',
        'FIR',
        'FIS',
        'GSEC',
        'HTZ',
        'LTA',
        'MATZ',
        'MTA',
        'MTR',
        'N',
        'NONE',
        'OFR',
        'P',
        'Q',
        'R',
        'RMZ',
        'TFR',
        'TIA',
        'TIZ',
        'TMA',
        'TMZ',
        'TRA',
        'TRAFR',
        'TRZ',
        'TSA',
        'UIR',
        'UTA',
        'VFRR',
        'VFRSEC',
        'WARNING',
    ],
    // flight level value to set for upper ceilings defined as "UNLIMITED"
    unlimited: 999,
    // defines the level of detail (smoothness) of arc/circular geometries
    geometryDetail: 100,
    // if true, validates each built airspace geometry to be valid/simple geometry - also checks for self intersections
    validateGeometry: true,
    // if true, uses "convexHull" to fix an invalid geometry - note that this may change the original airspace geometry!
    fixGeometry: false,
    // Defines the minimum distance between two points in meters. If two points are closer than this value, they will be merged into one point. Defaults to 0.
    consumeDuplicateBuffer: 100,
    // Sets the output geometry. Can be either "POLYGON" or "LINESTRING". Defaults to "POLYGON". "LINESTRING" can be used
    // to visualize invalid geometry definitions. Note that "validateGeometry" and "fixGeometry" has NO effect on "LINESTRING" geometry output!
    outputGeometry: 'POLYGON',
    // If true, the GeoJSON output will contain the original OpenAIR airspace definition block for each airspace. Note that this will considerably increase JSON object size!
    includeOpenair: false,
    // Defines the target unit to convert to.  Allowed units are: 'ft' and 'm'.
    targetAltUnit: 'FT',
    // round altitude values
    roundAltValues: false,
};

(async () => {
    const parser = new Parser(config);
    const { success, error  } = await parser.parse('./france.txt');
    if (success) {
        console.info('OpenAIR file successfully parsed.');
    } else {
        const { errorMessage, lineNumber } = error;
        console.error(`Error in line ${lineNumber}: ${errorMessage}`);
    }
})();
