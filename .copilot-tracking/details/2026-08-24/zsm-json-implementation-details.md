<!-- markdownlint-disable-file -->
# Implementation Details: ZSM JSON Parser and Factory Pattern Refactoring

## Context Reference

Sources: 
* Research: `.copilot-tracking/research/2026-08-24/zsm-json-implementation-research.md`
* User conversation: JSON support for ZSM airspace, WFS endpoint with Referer header
* Existing codebase: `src/zsm/main.js` (current KML implementation)

## Implementation Phase 1: Shared Transformer Modules

<!-- parallelizable: true -->

### Step 1.1: Create Coordinate Transformer Module

**Purpose**: Centralize decimal degrees to DMS (Degrees Minutes Seconds) conversion logic used by both adapters.

**File**: `src/zsm/transformer/coordinate-transformer.js`

**Implementation**:
1. Create module with `convertDDToDMS(deg, lng)` function
2. Handle direction calculation (N/S for latitude, E/W for longitude)
3. Handle coordinate rollover (60 seconds → minute, 60 minutes → degree)
4. Format output with leading zeros (e.g., "048:30:45 N")
5. Export convenience function `convertCoordinateToDMS(lon, lat)` returning object with lonDMS and latDMS

**Key Logic**:
* Input: Decimal degrees (positive/negative)
* Process: Extract degrees, calculate minutes and seconds from fractional part
* Output: "DDD:MM:SS D" format (e.g., "048:30:45 E")

**Used by**: KML adapter, JSON adapter

**Success criteria**:
* Function converts -3.5 degrees to "003:30:00 W" (longitude)
* Function converts 45.25 degrees to "045:15:00 N" (latitude)
* No decimal places in seconds output
* Rollover handled correctly

---

### Step 1.2: Create Altitude Transformer Module

**Purpose**: Calculate altitude AMSL values with consistent fallback behavior across formats.

**File**: `src/zsm/transformer/altitude-transformer.js`

**Implementation**:
1. Create `calculateAltitude(altitudeFeet)` function
2. When altitudeFeet is provided:
   - Convert feet to meters: `Math.floor(feet_value * 0.3048)`
   - Return object with `hasAltitude: true` and `altitudeString: "AH {meters}m AMSL\nAL GND\n"`
3. When altitudeFeet is undefined/null:
   - Return object with `hasAltitude: false` and `altitudeString: "AL GND\nAH 300M AGL\n"`
   - This provides safe ground-level reference with 300m AGL buffer

**Design Note**: KML adapter will add its own +300m offset before calling this function, JSON adapter will call directly.

**Used by**: KML adapter, JSON adapter

**Success criteria**:
* `calculateAltitude(3000)` returns altitude string "AH 914m AMSL\nAL GND\n" (3000 * 0.3048 ≈ 914m)
* `calculateAltitude(undefined)` returns "AL GND\nAH 300M AGL\n"
* No errors when altitude is null or missing

---

### Step 1.3: Create OpenAir Builder Module

**Purpose**: Generate consistent OpenAir format sections from normalized zone data.

**File**: `src/zsm/transformer/openair-builder.js`

**Implementation**:
1. Create `generateSectionHeader(zoneName)` function
   - Returns OpenAir header template with zone name in AN field
   - Template: Zone type (UNC), airspace class (P), and name

2. Create `generateDPEntry(latDMS, lonDMS)` function
   - Returns single DP (data point) line: `"DP {lat} {lon}\n"`

3. Create `generateZoneSection(zoneData, coordinateConverter)` function
   - Input: zoneData object with zoneName, altitudeString, coordinates array
   - Generate header + altitude lines
   - Iterate all coordinates, convert each to DMS, generate DP entries
   - Close polygon by repeating first point as last point
   - Return complete zone section

**Used by**: KML adapter, JSON adapter

**Success criteria**:
* Output includes AC, AY, AN, AH, AL, DP lines in correct order
* Polygon properly closed (first point repeated at end)
* All coordinates converted to DMS format
* Zone name properly substituted in AN field

---

## Implementation Phase 2: Format Adapters

<!-- parallelizable: true -->

### Step 2.1: Create KML Adapter

**Purpose**: Parse KML/XML data and transform to OpenAir format using shared transformer modules.

**File**: `src/zsm/adapters/kml-adapter.js`

**Implementation Steps**:

1. **Import dependencies**:
   - `xml2js` for XML parsing
   - `got` for HTTP streaming
   - `fs` for file operations
   - Shared transformers: coordinate, altitude, openair-builder

2. **Implement `downloadKML(kmlUrl)` async function**:
   - Return Promise
   - Use got.stream() for efficient large file handling
   - Log download progress
   - Write to `france.kml` temp file
   - Reject on download/write errors

3. **Implement `parseKML(xmlData)` async function**:
   - Parse XML using xml2js.parseString()
   - Extract zones from `result.kml.Document[0].Folder[0].Placemark`
   - For each placemark:
     - Extract `code_zsm` from ExtendedData.SchemaData.SimpleData (zone name)
     - Extract `h_max` from same location (altitude in feet)
     - Extract polygon coordinates from Polygon.outerBoundaryIs.LinearRing.coordinates
     - Parse coordinate string (lon,lat pairs) into array of [lon, lat] arrays
   - Return array of normalized zone objects

4. **Implement `transformToOpenAir(zones)` function**:
   - Loop through zones
   - For each zone, add +300m buffer to altitude (KML-specific behavior)
   - Create zoneData object with zoneName, altitudeString (from altitude transformer), coordinates
   - Call generateZoneSection() for each zone
   - Concatenate all sections into single openairData string

5. **Implement `processKML(kmlUrl, outputFilename)` async main function**:
   - Orchestrate flow: download → parse → transform → write
   - Handle errors with informative messages
   - Write output file using fs.writeFile()

**Discrepancy References**:
* Addresses coordinate bug fix (DR-01): Loop now correctly iterates all coordinates instead of skipping

**Success criteria**:
* Function downloads KML from provided URL
* All placemarks extracted without missing data
* Coordinates output includes all points (bug fix verification)
* Altitude values include +300m buffer as before
* Output file contains valid OpenAir format

**Context references**:
* Research doc (Lines 45-103): Original main.js analysis
* Research doc (Lines 82-87 bug): Coordinate indexing fix

---

### Step 2.2: Create JSON Adapter

**Purpose**: Parse WFS GeoJSON endpoint and transform to OpenAir format.

**File**: `src/zsm/adapters/json-adapter.js`

**Implementation Steps**:

1. **Import dependencies**:
   - `got` for HTTP with custom headers
   - `fs` for file operations
   - Shared transformers: coordinate, altitude, openair-builder

2. **Implement `downloadJSON(url)` async function**:
   - Use `got(url, {headers: {'Referer': 'https://www.sia.aviation-civile.gouv.fr/'}})` 
   - This header is required by WFS server
   - Add retry logic: `{retry: {limit: 3}}`
   - Return response.body as JSON string
   - Reject on download errors

3. **Implement `parseGeoJSON(jsonData)` function**:
   - Parse JSON string to object
   - Validate features array exists
   - For each feature:
     - Extract `nom_aire` from properties (zone name)
     - Extract `h_survol_ft` from properties (altitude in feet, may be undefined)
     - Extract coordinates from geometry.coordinates[0] (first ring of Polygon)
     - Handle MultiPolygon: use first polygon's outer ring
     - Map coordinates to array of [lon, lat] pairs as floating point numbers
   - Return array of normalized zone objects

4. **Implement `transformToOpenAir(zones)` function**:
   - Loop through zones
   - For each zone, call calculateAltitude() with h_survol_ft (no additional buffer)
   - Create zoneData object with zoneName, altitudeString, coordinates
   - Call generateZoneSection() for each zone
   - Concatenate all sections into single openairData string

5. **Implement `processJSON(url, outputFilename)` async main function**:
   - Orchestrate flow: download → parse → transform → write
   - Handle errors with informative messages
   - Write output file using fs.writeFile()

**Discrepancy References**:
* Addresses altitude formula decision (DD-01): JSON uses pure feet→meters, no buffer

**Success criteria**:
* Referer header present in HTTP request
* GeoJSON parsed correctly from WFS response
* Zone names extracted from `nom_aire`
* Altitude values handled (with fallback when missing)
* Output file contains valid OpenAir format

**Context references**:
* Research doc (Lines 32-50): JSON data source details
* User requirement: Referer header specification

---

### Step 2.3: Create Adapter Factory

**Purpose**: Route ZSM processing requests to appropriate format adapter.

**File**: `src/zsm/adapters/adapter-factory.js`

**Implementation**:
1. Import: `processKML` from kml-adapter, `processJSON` from json-adapter
2. Create `processZSMData(format, url, outputFilename)` async function:
   - Normalize format input: `.toLowerCase().trim()`
   - Switch on format:
     - `'kml'`: Call and return `processKML(url, outputFilename)`
     - `'json'`: Call and return `processJSON(url, outputFilename)`
     - default: Throw error with supported formats
3. Export the factory function

**Success criteria**:
* Function routes to correct adapter based on format parameter
* Throws descriptive error for unsupported formats
* Works with both adapters without modification

---

## Implementation Phase 3: Entry Point and Workflow

<!-- parallelizable: false -->

### Step 3.1: Refactor Main Entry Point

**Purpose**: Support both legacy KML-only invocation and new format-aware invocation.

**File**: `src/zsm/main.js` (Replace existing content)

**Implementation**:

1. **Add shebang**: `#!/usr/bin/env node` (first line)

2. **Import adapter factory**: `const { processZSMData } = require('./adapters/adapter-factory');`

3. **Implement `parseArguments()` function**:
   - Get args from `process.argv.slice(2)`
   - Support 3 invocation patterns:
     a. **Legacy mode** (2 args): `node main.js <url> <output>`
        - Return: `{format: 'kml', url: args[0], outputFilename: args[1]}`
     b. **Explicit mode** (4 args): `node main.js --format <kml|json> <url> <output>`
        - Return: `{format: args[1], url: args[2], outputFilename: args[3]}`
     c. **Equals mode** (3 args): `node main.js --format=<format> <url> <output>`
        - Parse format from args[0].split('=')[1]
        - Return corresponding object
   - On invalid usage: Call printUsage() and exit(1)

4. **Implement `printUsage()` function**:
   - Output helpful usage examples
   - List both legacy and new invocation patterns

5. **Implement `main()` async function**:
   - Parse arguments
   - Log format and URLs
   - Call `processZSMData(config.format, config.url, config.outputFilename)`
   - On success: Log completion message
   - On error: Log error and exit(1)

6. **Call main()** at end of file

**Success criteria**:
* `node main.js <kml_url> output.txt` works (legacy)
* `node main.js --format json <wfs_url> output.txt` works (new)
* Invalid arguments produce helpful error message
* Returns exit code 0 on success, 1 on error

---

### Step 3.2: Update GitHub Workflow

**Purpose**: Add FORMAT dispatch parameter and integrate with new adapter factory.

**File**: `.github/workflows/zsm-generate-pr.yml`

**Current State Changes Needed**:
1. The FORMAT parameter has been added by user (default: 'json')
2. Update the download-convert step to use new script path and format parameter

**Implementation**:

In the "Download and convert ZSM file" step, update the node command:
- Old: `node ./main.js ${{ github.event.inputs.ZSM_URL }} ../airspace/${{ steps.variables.outputs.filename }}`
- New: `node ./src/zsm/main.js --format ${{ github.event.inputs.FORMAT }} ${{ github.event.inputs.ZSM_URL }} ../airspace/${{ steps.variables.outputs.filename }}`

**Context**:
* FORMAT parameter already added by user with options: kml, json
* Default FORMAT set to 'json' (user preference)
* ZSM_URL updated to accept both KML and WFS endpoints

**Success criteria**:
* FORMAT input parameter appears in workflow dispatch UI
* Script path correctly references `src/zsm/main.js`
* Format parameter passed to script invocation
* Both KML and JSON workflows execute without errors

---

## Implementation Phase 4: Validation

<!-- parallelizable: false -->

### Step 4.1: Test KML Backward Compatibility

**Purpose**: Verify existing KML functionality continues to work with refactored adapters.

**Test execution**:
1. Navigate to workspace root
2. Run: `node src/zsm/main.js <valid_kml_url> test-output.txt`
3. Verify:
   - Script completes without errors
   - Output file created with content
   - OpenAir format is valid (AC, AY, AN, AH, AL, DP entries present)
   - Coordinate count matches original (no skipped coordinates due to bug fix)

---

### Step 4.2: Test JSON with WFS Endpoint

**Purpose**: Verify new JSON adapter works with WFS endpoint.

**Test execution**:
1. Run: `node src/zsm/main.js --format json "https://geo-prod-sofia-vac.sia-france.fr/geoserver/cloud/wfs?service=WFS&version=2.0.0&request=GetFeature&typeName=SIA:zone_zsm&outputFormat=application/json&srsName=EPSG:4326" test-json-output.txt`
2. Verify:
   - Script completes without errors
   - Referer header included (visible in network log if debugging)
   - Output file created with content
   - OpenAir format is valid
   - Zone names from `nom_aire` field present
   - Altitude values (or fallback "AL GND\nAH 300M AGL\n") correct

---

### Step 4.3: Test GitHub Workflow Dispatch

**Purpose**: Verify workflow correctly integrates new FORMAT parameter.

**Test execution**:
1. Push changes to repository
2. Go to GitHub Actions → "Generate updated ZSM branch" workflow
3. Manually trigger with:
   - FORMAT: 'json'
   - ZSM_URL: (valid WFS endpoint)
4. Wait for completion, verify success
5. Repeat with FORMAT: 'kml' and KML URL

---

### Step 4.4: Validate Output Format Consistency

**Purpose**: Ensure output quality across both adapters.

**Validation checks**:
1. OpenAir compliance:
   - AC UNC line present
   - AY P line present
   - AN {zoneName} with proper zone identifier
   - AH {altitude}m AMSL or AGL lines present
   - AL GND line present
   - DP entries for all coordinates
   - Polygon properly closed (first point repeated)

2. Coordinate accuracy:
   - All points from source data present in output
   - DMS format correct (D:M:S D)
   - No missing or skipped coordinates

3. Altitude handling:
   - KML: Values include original +300m buffer
   - JSON: Pure conversion without offset
   - Missing values: Fallback to "AL GND\nAH 300M AGL\n"

---

### Step 4.5: Fix Any Minor Validation Issues

**Purpose**: Resolve any lint, format, or output issues discovered during validation.

**Approach**:
* If validation checks fail:
  - Identify root cause (missing field, incorrect format, etc.)
  - Apply targeted fix to affected module
  - Re-run validation
* If issues are complex (require redesign), document in Planning Log as blocking issue

---

## Dependencies

* Node.js runtime (v14+)
* npm packages already in project.json or to be installed:
  - `xml2js` (for KML parsing)
  - `got` (for HTTP requests with streaming)
* Git client (for workflow testing)
* GitHub Actions access (for workflow validation)

## Success Criteria

* ✓ All transformer modules create without errors
* ✓ KML adapter correctly parses existing test data
* ✓ JSON adapter downloads and parses WFS GeoJSON response
* ✓ Adapter factory routes format requests to correct adapter
* ✓ Main.js supports both legacy and new invocation patterns
* ✓ GitHub workflow dispatch includes FORMAT parameter
* ✓ Both KML and JSON workflows produce valid OpenAir output
* ✓ Coordinate bug fix verified (all points in output)
* ✓ Altitude handling consistent across formats with proper fallbacks
