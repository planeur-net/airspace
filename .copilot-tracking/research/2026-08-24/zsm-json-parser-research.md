<!-- markdownlint-disable-file -->
# Task Research: ZSM JSON Parser Integration

Research for extending ZSM (Zone Sensibilité Maximum) data processing from KML/XML format to support JSON input while maintaining existing workflow integration and code extensibility for future formats.

## Task Implementation Requests

* Add JSON data source support alongside existing KML/XML parsing
* Download JSON from URL similar to current KML approach
* Generate identical OpenAir format output from JSON data
* Integrate seamlessly into existing GitHub workflow (zsm-generate-pr.yml)
* Design architecture for extensibility to future formats

## Scope and Success Criteria

* **Scope**: 
  - Current KML/XML parsing mechanism in `src/zsm/main.js`
  - GitHub Actions workflow integration (zsm-generate-pr.yml)
  - OpenAir output format generation
  - Code architecture for multi-format support
  - Exclusions: ZSM-OpenAir schema details, file I/O streaming optimization, performance profiling

* **Assumptions**:
  - JSON source will have similar structure to KML (geographic features with ExtendedData equivalents)
  - Same coordinate format (decimal degrees) or convertible to it
  - Same output format (OpenAir) required regardless of source
  - Workflow will dispatch with a format parameter to specify input type
  - Both KML and JSON approaches should coexist for backward compatibility

* **Success Criteria**:
  - Identify concrete JSON structure from user requirements
  - Recommend architecture supporting multiple formats with single transformation engine
  - Provide code examples for format-agnostic coordinate conversion
  - Document GitHub workflow modifications needed for format selection
  - Establish patterns for adding future formats without duplicating core logic

## Current Implementation Analysis

### Architecture Overview

The current `main.js` implementation follows a **format-specific, linear pipeline**:

```
Download KML → Parse XML → Extract Data → Transform to OpenAir → Write Output
```

**Key Components** (from src/zsm/main.js):

1. **Download Phase** (lines 11-38):
   - Uses `got` library for streaming downloads with progress reporting
   - Saves to local file (`france.kml`)
   - Event-driven error handling

2. **Parsing Phase** (lines 40-94):
   - XML parsing via `xml2js.parseString()`
   - KML-specific path navigation: `result.kml.Document[0].Folder[0].Placemark`
   - Extracts from `ExtendedData.SchemaData.SimpleData` array

3. **Data Extraction** (lines 51-89):
   - **Code-specific fields**:
     - `code_zsm` → zone name/comment
     - `h_max` → altitude reference
   - **Geometry**: `Polygon.outerBoundaryIs.LinearRing.coordinates`
   - Coordinate format: `"lon,lat lon,lat ..."` (space/newline separated)

4. **Transformation** (lines 52-89):
   - Converts decimal degrees to DMS (Degrees Minutes Seconds)
   - Applies altitude offset (+300m)
   - Generates OpenAir format with section headers

5. **Output Phase** (lines 96-100):
   - Hard-coded OpenAir section format
   - Standard OpenAir commands: `AH`, `AL`, `AC`, `AY`, `AN`, `DP`

### Current Workflow Integration

**GitHub Actions** (zsm-generate-pr.yml):

```yaml
# Dispatch Parameters:
- ZSM_URL: URL to .kml file (required)

# Steps:
1. Clone kml2OpenAir repository
2. npm install dependencies
3. Execute: node ./main.js <KML_URL> <output_filename>
4. Insert results into france-exp.txt
5. Auto-commit and create branch
```

**Key Workflow Properties**:
- Manual dispatch via GitHub UI (workflow_dispatch)
- Single input parameter: URL
- Hard-coded for KML processing
- Auto-generates branch and commit
- No format flexibility in current implementation

### Dependencies

From package.json within kml2OpenAir repo:
- `xml2js`: ~0.x (XML parsing)
- `got`: Latest (HTTP streaming)
- `fs` (Node.js built-in): File I/O

**Note**: The main airspace repo doesn't include main.js dependencies; workflow clones separate kml2OpenAir repository.

## Technical Scenarios

### Scenario 1: Factory Pattern with Format Adapters (Recommended)

**Architecture**: Separate format adapters that implement common interface

**Benefits**:
- **Extensibility**: Add new formats by creating new adapter without modifying core logic
- **Maintainability**: Format-specific parsing isolated in adapter classes
- **Testability**: Each adapter can be tested independently
- **SOLID Compliance**: Single Responsibility, Open/Closed principles
- **Code Reuse**: Common transformation engine shared across formats

**Design**:

```
DataSource (url, format) 
    ↓
FormatFactory.createAdapter(format)
    ↓
Adapter (KmlAdapter | JsonAdapter | CsvAdapter)
    ├─ download()
    ├─ parse()
    └─ extract() → normalized structure
    ↓
CommonTransformer
    ├─ validateCoordinates()
    ├─ convertDDToDMS()
    ├─ calculateAltitude()
    └─ generateOpenAir() → final output
    ↓
FileWriter (output)
```

**Implementation Structure**:

```typescript
// adapters/BaseAdapter.ts
class BaseAdapter {
  constructor(url, outputFilename) {}
  async download() {}
  async parse() {}
  async extract() { return normalizedData; }
}

// adapters/KmlAdapter.ts
class KmlAdapter extends BaseAdapter {
  async parse() {
    // XML parsing logic
  }
  async extract() {
    // KML-specific field extraction
  }
}

// adapters/JsonAdapter.ts  
class JsonAdapter extends BaseAdapter {
  async parse() {
    // JSON parsing logic
  }
  async extract() {
    // JSON-specific field extraction
  }
}

// transformer/ZsmTransformer.ts
class ZsmTransformer {
  static transform(normalizedData) {
    // Coordinate conversion, altitude calculation
    // OpenAir generation
  }
}

// main.js
const adapter = FormatFactory.create(format, url, output);
const data = await adapter.extract();
const openair = ZsmTransformer.transform(data);
await FileWriter.write(output, openair);
```

**Workflow Integration**:

```yaml
# Add format parameter to dispatch inputs
inputs:
  ZSM_URL:
    description: 'URL to ZSM data file'
    required: true
  FORMAT:
    description: 'Data format (kml or json)'
    required: true
    default: 'kml'
    type: choice
    options:
      - kml
      - json

# Execute with format:
node ./main.js ${{ github.event.inputs.ZSM_URL }} ${{ github.event.inputs.FORMAT }} ../airspace/${{ steps.variables.outputs.filename }}
```

**Complexity**: Medium (requires class structure, factory pattern)

**Best For**: Long-term maintainability, multiple format support expected, team coding standards

---

### Scenario 2: Strategy Pattern (Alternative)

**Architecture**: Format-specific strategies selected at runtime

**Benefits**:
- Simpler than Factory Pattern
- Strategies interchangeable at runtime
- Less boilerplate than full class hierarchy

**Design**:

```javascript
// strategies.js
const strategies = {
  kml: {
    parse: (data) => xml2js.parseString(data, ...),
    extract: (parsed) => { /* KML extraction */ }
  },
  json: {
    parse: (data) => JSON.parse(data),
    extract: (parsed) => { /* JSON extraction */ }
  }
};

// main.js
const strategy = strategies[format];
const parsed = await strategy.parse(downloadedData);
const extracted = strategy.extract(parsed);
```

**Complexity**: Low (minimal code changes)

**Best For**: Quick implementation, fewer formats, simpler team structure

---

### Scenario 3: Conditional Processing (Not Recommended)

**Architecture**: Single main.js with if/else branches for format handling

**Drawbacks**:
- Hard to extend (code duplication increases with each format)
- Difficult to test each format path independently
- Violates DRY principle
- Violates Open/Closed principle
- Brittle as complexity grows

**Example Anti-Pattern**:
```javascript
if (format === 'kml') {
  // KML parsing
} else if (format === 'json') {
  // JSON parsing
} else if (format === 'csv') {
  // CSV parsing
}
```

---

## Expected JSON Structure

### Based on Common GeoJSON Convention

**Assumption 1: GeoJSON Format**

```json
{
  "type": "FeatureCollection",
  "features": [
    {
      "type": "Feature",
      "properties": {
        "code_zsm": "ZSM-001",
        "h_max": "5500"
      },
      "geometry": {
        "type": "Polygon",
        "coordinates": [
          [
            [2.5, 45.1],
            [2.6, 45.1],
            [2.6, 45.2],
            [2.5, 45.2],
            [2.5, 45.1]
          ]
        ]
      }
    }
  ]
}
```

**Assumption 2: Flat Feature Objects**

```json
{
  "zones": [
    {
      "id": "ZSM-001",
      "name": "Vanoise Area",
      "max_altitude": 5500,
      "coordinates": [
        { "lat": 45.1, "lon": 2.5 },
        { "lat": 45.1, "lon": 2.6 }
      ]
    }
  ]
}
```

### Field Mapping Requirements

Required clarification from user:

1. **How are features represented?** (array vs object structure)
2. **Field names for zone identifier?** (code_zsm equivalent)
3. **Altitude representation?** (single value vs range)
4. **Coordinate encoding?** (GeoJSON [lon,lat], separated objects, or other)
5. **Additional metadata?** (dates, categories, validation status)

---

## Key Discoveries

### 1. Coordinate Handling Complexity

**Current KML Parsing** (main.js lines 75-88):
```javascript
// String manipulation to extract coordinates
coordinates = coordinates.replace(/\r?,0\n|\r/g, '');
coordinates = coordinates.split(' ').map(coordinate => {
  const [lon, lat] = coordinate.split(',');
  return [parseFloat(lon), parseFloat(lat)];
});

// Iteration with incorrect indexing
for (let i = 0; i <= coordinates.length - 2; i += 2) {
  const lon = coordinates[i][0];
  const lat = coordinates[i + 1][1];  // ⚠️ BUG: should be [i][1]
```

**Issue**: The loop indexing assumes coordinates are split into separate [lon] and [lat] values, but the parsing creates proper [lon,lat] pairs. This coordinate extraction logic needs refactoring to support multiple formats.

### 2. OpenAir Output Format Standardization

**Consistent Pattern** (lines 110-113):
```javascript
function sectionHeader(sectionDescription) {
  return `\n\n**ZONE SENSIBILITE MAXIMUM**\n**Site ZSM Gypaete  Bird Protection Tampon**\nAC UNC\nAY P\nAN ${sectionDescription}\n`;
}
```

**Key**: This header is **static** except for the `AN` (name) field. This can be extracted as a template in the transformer.

### 3. Workflow Dispatch Limitations

**Current State**:
- Single URL input parameter
- No format selector in workflow
- Assumes KML format hard-coded in script invocation

**Required Change**: Add format input to workflow_dispatch inputs to support format selection.

### 4. Altitude Calculation Pattern

**Current Formula** (lines 59-60):
```javascript
altMaxZone = parseInt(altMaxZone, 10);        // Parse to integer
altMaxZone += 300;                            // Add 300m buffer
```

This offset is **consistent** across all zones. Should be configurable but defaulted to 300.

---

## Recommended Approach: Factory Pattern with TypeScript/JavaScript Modules

### Rationale

1. **Extensibility**: Adding CSV, GeoJSON, or other formats requires only new adapter class
2. **Maintainability**: Format-specific logic isolated and testable
3. **Backward Compatibility**: KML path remains unchanged
4. **Code Organization**: Clear separation of concerns
5. **Team Scalability**: Multiple developers can work on separate adapters
6. **Workflow Integration**: Simple format parameter dispatch

### Implementation Roadmap

#### Phase 1: Refactor Common Logic (No Breaking Changes)

1. Extract `ConvertDDToDMS()` → `transformer/coordinate-converter.js`
2. Extract `sectionHeader()` → `transformer/openair-generator.js`
3. Extract file writing → `io/file-writer.js`
4. Create `types/normalized-feature.js` for common structure

**File Structure**:
```
src/zsm/
├── main.js (entry point, minimal)
├── adapters/
│   ├── base-adapter.js
│   ├── kml-adapter.js
│   ├── json-adapter.js
│   └── adapter-factory.js
├── transformer/
│   ├── coordinate-converter.js
│   ├── altitude-calculator.js
│   ├── openair-generator.js
│   └── zsm-transformer.js
├── io/
│   ├── downloader.js
│   └── file-writer.js
└── types/
    └── normalized-feature.js
```

#### Phase 2: Implement JSON Adapter

1. Create `adapters/json-adapter.js`
2. Implement JSON parsing with field mapping configuration
3. Test with sample JSON structure
4. Validate OpenAir output matches KML results

#### Phase 3: Update Workflow

1. Add `FORMAT` input to workflow_dispatch
2. Update main.js invocation to pass format parameter
3. Test both KML and JSON paths in CI/CD
4. Document format requirements and JSON structure

#### Phase 4: Documentation

1. Add format specification document
2. Create JSON schema examples
3. Document adapter creation process for future formats

---

## Questions for User Clarification

1. **JSON Source Details**:
   - What is the actual JSON structure from your data source?
   - Is it GeoJSON, custom structure, or other?
   - Can you provide a sample JSON file or URL?

2. **Integration Approach**:
   - Should both KML and JSON be available in workflow simultaneously?
   - Will KML eventually be phased out?
   - Are there other formats planned (GeoJSON, CSV, etc.)?

3. **Field Mapping**:
   - What JSON field names correspond to `code_zsm` and `h_max`?
   - Are there additional metadata fields needed?
   - How are polygons/geometries represented?

4. **Backward Compatibility**:
   - Must existing scripts/workflows continue working unchanged?
   - Can workflow parameters be added without breaking current usage?

---

## Potential Next Research

* **JSON Schema Validation**: Research jsonschema library for input validation
  * Reasoning: Ensure data integrity before transformation
  * Reference: json-schema npm package, validator libraries

* **Format Performance Comparison**: Research streaming vs. in-memory parsing for large datasets
  * Reasoning: Understand scalability for future formats
  * Reference: Node.js stream API, memory profiling tools

* **Error Handling Strategy**: Research exception handling patterns across adapters
  * Reasoning: Consistent error reporting and recovery
  * Reference: Custom error classes, validation pipelines

* **Testing Framework**: Research test setup for multi-format validation
  * Reasoning: Each adapter needs isolated test fixtures
  * Reference: Jest or Mocha test runners, fixture management

* **GitHub Actions Optimization**: Research caching strategies for workflow
  * Reasoning: npm install can be cached to improve CI/CD speed
  * Reference: actions/cache@v3, workflow performance tips

---

## Evidence Summary

| Evidence Type | Location | Key Finding |
|---|---|---|
| **Current Implementation** | src/zsm/main.js lines 1-136 | Linear KML-specific pipeline with tightly coupled concerns |
| **Workflow Integration** | .github/workflows/zsm-generate-pr.yml | Dispatch accepts single URL; no format parameter |
| **Output Format** | src/zsm/main.js lines 110-113 | OpenAir section header is static template except name field |
| **Coordinate Handling** | src/zsm/main.js lines 75-88 | Complex string manipulation; possible indexing bug |
| **Dependencies** | openaip-openair-parser/package.json | xml2js and got available; no JSON schema validators present |
| **Documentation** | README.md | ZSM updates from KML source; references Kml2OpenAir tool |

