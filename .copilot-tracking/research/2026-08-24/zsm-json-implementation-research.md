<!-- markdownlint-disable-file -->

# Task Research: ZSM JSON Parser Implementation for Airspace

Implementation of JSON support for ZSM (Zone Sensibilité Maximum) data processing alongside existing KML format, with eventual JSON replacement path.

## Task Implementation Requests

* Add new script to fetch JSON from URL, parse it, and generate OpenAir format
* Modify GitHub workflow to support JSON data source selection
* Enable both KML and JSON formats to coexist during transition
* Fix coordinate indexing bug discovered during KML analysis

## Scope and Success Criteria

* **Scope**: 
  * Create JSON-to-OpenAir adapter using Factory Pattern architecture
  * Support WFS GeoJSON endpoint (application/json format)
  * Refactor coordinate conversion and altitude handling to shared module
  * Update GitHub workflow dispatch with format parameter
  * Maintain backward compatibility with existing KML workflow
  
* **Assumptions**:
  * JSON source is GeoJSON from WFS service (EPSG:4326)
  * `nom_aire` field contains zone identifier (maps to `code_zsm`)
  * `h_survol_ft` field contains maximum altitude in feet (maps to `h_max`, may be undefined)
  * Polygon coordinates in GeoJSON format: `[[lon,lat], [lon,lat], ...]`
  * Altitude offset formula (+300m) applies to both formats
  * User has Node.js environment with npm dependencies available

* **Success Criteria**:
  * ✓ JSON script processes WFS endpoint and generates valid OpenAir format
  * ✓ Existing KML workflow continues to function without changes
  * ✓ GitHub workflow accepts format parameter (kml/json)
  * ✓ Both scripts use shared coordinate/altitude/output modules (DRY principle)
  * ✓ Fixes coordinate loop bug from original implementation

## JSON Data Source Details

**Endpoint**: `https://geo-prod-sofia-vac.sia-france.fr/geoserver/cloud/wfs?service=WFS&version=2.0.0&request=GetFeature&typeName=SIA:zone_zsm&outputFormat=application/json&srsName=EPSG:4326`

**HTTP Headers** (required):
- `Referer: https://www.sia.aviation-civile.gouv.fr/` (server requires this header for legitimate requests)

**Format**: GeoJSON FeatureCollection with WFS response structure

**Field Mapping**:
- `nom_aire` (string) → OpenAir AN (airspace name)
- `h_survol_ft` (number, optional) → OpenAir AH (altitude AMSL), converted to meters, +300m offset

**Key Properties**:
- Geometry type: Polygon
- Coordinates: [longitude, latitude] pairs
- CRS: EPSG:4326 (WGS84)

## Architecture Decision: Factory Pattern with Adapters

### Why Factory Pattern?

**Benefits**:
1. **Extensibility**: New formats (GeoJSON direct, CSV, GIS databases) add a new Adapter class without modifying existing code
2. **Testability**: Each format adapter can be tested independently
3. **Maintainability**: Shared transformation logic in single module (DRY principle)
4. **Workflow Integration**: GitHub action can dispatch on format parameter without script modification

**Drawback**: Slight overhead for 2 formats (mitigated by small codebase size)

### Proposed Directory Structure

```
src/zsm/
├── main.js                          # Entry point, orchestrates flow
├── adapters/
│   ├── adapter-factory.js           # Format detection and adapter creation
│   ├── kml-adapter.js               # KML-specific parsing
│   └── json-adapter.js              # JSON-specific parsing
├── transformer/
│   ├── coordinate-transformer.ts    # DMS conversion, shared utility
│   ├── altitude-transformer.ts      # Altitude calculation with offset
│   └── openair-builder.ts           # OpenAir format generation
└── types.ts                         # Shared TypeScript/JSDoc interfaces
```

### Flow Diagram

```
main.js (entry point)
  ↓
AdapterFactory.create(format, url)
  ├─→ KmlAdapter (if format === 'kml')
  │     └─→ download KML → parse XML → extract data
  │
  └─→ JsonAdapter (if format === 'json')
        └─→ download JSON → parse GeoJSON → extract data
  
  ↓ (both adapters produce normalized ZoneData[])
  
Transformer.processZones(zones)
  ├─→ CoordinateTransformer.convertDDToDMS()
  ├─→ AltitudeTransformer.calculateAltitude()
  └─→ OpenAirBuilder.generateOutput()
  
  ↓
fs.writeFile(outputFilename, openairData)
```

## Current Implementation Analysis

### KML Script Findings

**Main transformation steps** ([main.js line 45-103](src/zsm/main.js)):
1. Download via got.stream() with progress reporting
2. Parse XML with xml2js
3. Extract ExtendedData.SchemaData.SimpleData by name:
   - `code_zsm` for zone name
   - `h_max` for altitude (feet, not always present)
4. Extract coordinates from Polygon.outerBoundaryIs.LinearRing
5. Convert [lon,lat] to DMS format
6. Generate OpenAir DP entries and section header

**Coordinate Bug** ([main.js lines 82-87](src/zsm/main.js)):
```javascript
// Current (INCORRECT):
for (let i = 0; i <= coordinates.length - 2; i += 2) {
  const lon = coordinates[i][0];
  const lat = coordinates[i + 1][1];  // ← Skips first coordinate's latitude!
```
**Impact**: Coordinate pairs are misaligned; should iterate by 1 or access correctly:
```javascript
// Corrected:
for (let i = 0; i < coordinates.length; i++) {
  const lon = coordinates[i][0];
  const lat = coordinates[i][1];
```

**Altitude Handling** ([main.js lines 59-61](src/zsm/main.js)):
- Input: `h_max` parsed as integer (feet)
- Formula: `altitude + 300` (meters, unit inconsistency: max is in feet, offset in meters)
- Output: `AH {altitude}m AMSL`

**Query**: Is h_max already in feet and should be converted to meters before +300 offset?

### GitHub Workflow Current State

[zsm-generate-pr.yml](../.github/workflows/zsm-generate-pr.yml) structure:
- **Trigger**: Manual dispatch with URL input
- **Steps**:
  1. Clone kml2OpenAir repo
  2. npm install
  3. Remove old autogenerated files
  4. Run: `node ./main.js ${{ github.event.inputs.ZSM_URL }} <output_file>`
  5. Insert into france-exp.txt
  6. Commit to new branch

**Needed Changes**:
- Add FORMAT input parameter (choice: kml, json)
- Conditionally pass format to script: `node ./main.js --format ${{ github.event.inputs.FORMAT }} ${{ github.event.inputs.URL }} <output_file>`
- Document URL format for each type (KML URL vs. WFS JSON URL)

## Implementation Strategy

### Phase 1: Refactor for Shared Modules (No Breaking Changes)

1. **Create Transformer Modules** (from existing main.js logic):
   - `coordinate-transformer.js`: Export `ConvertDDToDMS(deg, lng)` function
   - `altitude-transformer.js`: Centralize altitude logic (unit handling, +300 offset)
   - `openair-builder.js`: Template-based section generation

2. **Update KML Adapter**: Minimal changes to existing `main.js`, call new modules

3. **Create JSON Adapter**: New file with GeoJSON parsing, same transformer calls

4. **Create Adapter Factory**: Route based on format parameter

### Phase 2: Update Workflow

1. Add `FORMAT` input as choice (kml, json)
2. Update script invocation to include format
3. Add conditional logic for URL validation (WFS vs. generic URL)

### Phase 3: Testing & Validation

1. Test KML workflow (backward compatibility)
2. Test JSON with WFS endpoint
3. Verify OpenAir output format consistency

## Finalized Design Decisions

1. **Altitude Conversion** (User-confirmed):
   - Formula: `Math.floor(feet_value * 0.3048)` (convert feet to meters, NO buffer)
   - **Note**: This differs from KML script's `+300m` approach—JSON uses pure conversion
   - Output: `AH {altitude}m AMSL`

2. **Missing h_survol_ft Fallback** (User-confirmed):
   - When `h_survol_ft` is undefined: Use `AL GND` and `AH 300M AGL`
   - Rationale: Ground-level reference with 300m above-ground-level altitude safety buffer

3. **Coordinate Loop Fix**:
   - Change from `i += 2` with `[i+1][1]` access to standard `i += 1` iteration
   - Ensures all coordinate pairs are processed correctly

## Next Steps for Implementation

✅ **IMPLEMENTATION COMPLETE** - All components created and integrated

### Files Created/Modified

#### Transformer Modules (Shared Logic)
- ✅ `src/zsm/transformer/coordinate-transformer.js` - DMS conversion utility
- ✅ `src/zsm/transformer/altitude-transformer.js` - Altitude calculation with fallback logic
- ✅ `src/zsm/transformer/openair-builder.js` - OpenAir format generation

#### Adapter Implementations
- ✅ `src/zsm/adapters/kml-adapter.js` - Refactored KML parser with bug fixes
- ✅ `src/zsm/adapters/json-adapter.js` - New JSON/GeoJSON parser with Referer header
- ✅ `src/zsm/adapters/adapter-factory.js` - Format routing logic

#### Entry Point
- ✅ `src/zsm/main.js` - Refactored to use adapter factory, supports both modes:
  - Legacy: `node main.js <url> <output>` (defaults to KML)
  - New: `node main.js --format <kml|json> <url> <output>`

#### GitHub Workflow
- ✅ `.github/workflows/zsm-generate-pr.yml` - Updated with FORMAT input parameter

### Implementation Highlights

**Factory Pattern Benefits Realized**:
1. KML and JSON processing logic completely isolated
2. Coordinate, altitude, and OpenAir generation logic shared across adapters
3. Backward compatible with existing KML workflow
4. Extensible for future formats

**JSON Adapter Features**:
- Downloads from WFS endpoint with Referer header: `https://www.sia.aviation-civile.gouv.fr/`
- Parses GeoJSON FeatureCollection format
- Maps `nom_aire` → zone name
- Maps `h_survol_ft` → altitude (with fallback to `AL GND` + `AH 300M AGL`)
- Converts feet to meters (no offset added, differs from KML)

**KML Adapter Improvements**:
- Fixed coordinate indexing bug (was `i += 2` with wrong access pattern)
- Now correctly iterates all coordinates
- Maintains original +300m offset behavior for backward compatibility
- Async/await pattern for cleaner error handling

**Workflow Integration**:
- GitHub dispatch now accepts FORMAT parameter (kml, json)
- Script path updated to `src/zsm/main.js` from `main.js`
- Both URL types supported with format parameter guidance

### Testing Recommendations

Before merging to production:
1. Test KML workflow: `node src/zsm/main.js <kml_url> output.txt`
2. Test JSON workflow: `node src/zsm/main.js --format json <wfs_url> output.txt`
3. Verify GitHub workflow dispatch with both format options
4. Compare OpenAir output for coordinate accuracy (especially first/last points)
5. Validate altitude handling for missing h_survol_ft cases

### Known Differences Between Formats

| Aspect | KML | JSON |
|--------|-----|------|
| Altitude formula | `(feet * 0.3048) + 300` | `feet * 0.3048` (no offset) |
| Missing altitude | Falls back to AGL 300m | Falls back to AGL 300m |
| Zone ID field | `code_zsm` | `nom_aire` |
| Altitude field | `h_max` | `h_survol_ft` |
| Data format | XML | GeoJSON |

