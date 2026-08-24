<!-- markdownlint-disable-file -->
# Planning Log: ZSM JSON Parser and Factory Pattern Refactoring

## Discrepancy Log

Gaps and differences identified between research findings and the implementation plan.

### Unaddressed Research Items

None identified. All research findings have been incorporated into the implementation plan.

### Plan Deviations from Research

* DD-01: GitHub Workflow Format Default Changed
  * Research recommended: Default to 'kml' for backward compatibility
  * Plan implements: Default set to 'json' (per user preference in workflow file)
  * Rationale: User has already modified the workflow file to default FORMAT to 'json', indicating preference for JSON as primary format during transition phase
  * Impact: Low - still supports both formats, but users will need to explicitly select 'kml' if desired

* DD-02: Altitude Formula Difference Between Formats
  * Research finding: KML adds +300m buffer, JSON does pure conversion
  * Confirmed by user: Correct approach - JSON uses pure feet→meters, KML maintains legacy +300m behavior
  * Rationale: Different sources have different altitude semantics; KML historical data includes buffer, JSON is direct measurement
  * Impact: Low - intentional divergence, documented in implementation

## Implementation Paths Considered

### Selected: Factory Pattern with Separate Adapters

* **Approach**: Create format-specific adapter classes (KmlAdapter, JsonAdapter) sharing common transformer modules (coordinate, altitude, openair generation)
* **Rationale**: Provides clean separation of concerns, eliminates code duplication, extensible for future formats (GeoJSON, CSV, databases), SOLID principles alignment
* **Evidence**: Research document sections on architecture analysis and pattern comparison
* **Implementation**: 
  - 3 shared transformer modules (coordinate, altitude, openair-builder)
  - 2 format adapters (kml, json)
  - 1 factory router (adapter-factory)
  - 1 entry point (main.js with dual-mode invocation)

### IP-01: Strategy Pattern Alternative

* **Approach**: Create format-specific strategy objects passed to common processor
* **Trade-offs**: 
  - Simpler for 2 formats (less class overhead)
  - Higher code duplication as strategies repeat coordinate/altitude logic
  - Difficult to extend beyond 2-3 formats without refactoring
* **Rejection rationale**: Factory Pattern scales better and prevents duplication across adapters. Team planning for eventual JSON-only transition, making extensibility valuable

### IP-02: Conditional If/Else Processing (Not Selected)

* **Approach**: Single main.js file with format-checking conditionals
* **Trade-offs**:
  - Minimal complexity for proof-of-concept
  - Violates DRY principle; coordinates/altitude/openair logic duplicated per format
  - Exponential complexity growth (each new format adds 40+ lines of duplicated logic)
  - Poor testability (cannot unit test individual format paths)
* **Rejection rationale**: Leads to technical debt; violates team's stated goal of extensibility

## Suggested Follow-On Work

Items identified during planning that fall outside current scope but warrant future attention.

### WI-01: Refactor KML Adapter to Handle MultiPolygon Zones

* **Title**: Support MultiPolygon geometries in KML
* **Description**: Current implementation assumes Polygon with single outer ring. Some ZSM zones may have MultiPolygon geometry (multiple disconnected areas). Extended implementation should iterate all polygon rings and generate separate OpenAir sections if needed.
* **Priority**: Medium
* **Source**: Architecture analysis during KML adapter design
* **Dependency**: WI-01 should wait for feedback on whether KML data actually contains MultiPolygon; may not be necessary

### WI-02: Add Configuration File Support

* **Title**: Allow format-specific configuration (altitude offsets, coordinate precision)
* **Description**: Currently altitude offsets and DMS formatting are hardcoded. Configuration file (JSON, YAML, or .env) would allow:
  - Different altitude buffers per format or source
  - Coordinate precision settings (seconds vs. minutes)
  - Custom zone name transformations
* **Priority**: Low
* **Source**: Generalization observation during implementation
* **Dependency**: Can be added anytime after initial implementation stabilizes

### WI-03: Add Data Validation and Sanitization

* **Title**: Implement validation pipeline for parsed zone data
* **Description**: Current implementation trusts source data. Future enhancement should:
  - Validate coordinate ranges (latitude -90 to 90, longitude -180 to 180)
  - Check for self-intersecting polygons
  - Validate altitude values (reasonable range in feet)
  - Sanitize zone names (remove special characters that might break OpenAir format)
* **Priority**: Medium
* **Source**: Quality assurance consideration
* **Dependency**: Should be added before production use if data quality is uncertain

### WI-04: Test Suite Development

* **Title**: Create comprehensive unit and integration tests
* **Description**: Add test coverage for:
  - Each transformer function (coordinate conversion edge cases)
  - Altitude calculation (with/without values, edge altitudes)
  - Adapter parsing (valid and invalid inputs)
  - Workflow integration (mock HTTP, verify output)
* **Priority**: High
* **Source**: Standard development practice
* **Dependency**: Should be implemented once core functionality stabilized

### WI-05: Documentation and Usage Guide

* **Title**: Create user-facing documentation
* **Description**: Document:
  - How to run scripts locally (both KML and JSON modes)
  - How to manually trigger GitHub workflow
  - How to add new data sources
  - Troubleshooting guide (common errors and solutions)
* **Priority**: Medium
* **Source**: User experience consideration
* **Dependency**: After implementation complete and tested

### WI-06: Monitor WFS Endpoint Availability

* **Title**: Add endpoint monitoring and fallback logic
* **Description**: WFS endpoint may experience downtime. Implementation should:
  - Monitor endpoint health before processing
  - Implement retry with exponential backoff
  - Provide clear error messages if endpoint unavailable
  - Consider local fallback data source
* **Priority**: Low
* **Source**: Production reliability consideration
* **Dependency**: Should be considered as workflow matures

### WI-07: Performance Optimization for Large Zone Sets

* **Title**: Optimize for high-volume zone processing
* **Description**: Current implementation is synchronous and loads all zones into memory. For 1000+ zones:
  - Consider streaming approach (process zones incrementally)
  - Implement progress reporting in verbose mode
  - Profile and optimize coordinate conversion loops
* **Priority**: Low (dependent on actual zone counts)
* **Source**: Scalability consideration
* **Dependency**: Only relevant if WFS endpoint returns significantly more zones than current

---

## Plan Validation Status

✅ **Validation Complete** — Implementation plan aligns with research findings and user requirements with one noted deviation (workflow default).

**Key Validation Points**:
1. ✓ Research requirements comprehensively addressed
2. ✓ Architecture decisions well-justified with alternatives documented
3. ✓ Implementation phases logically sequenced with parallelization identified
4. ✓ Success criteria measurable and verifiable
5. ✓ Dependencies clearly identified
6. ✓ Follow-on work properly scoped outside current plan

**Minor Notes**:
* User preference (FORMAT default to 'json') overrides research recommendation (KML default) — acceptable deviation
* Altitude formula divergence (KML vs JSON) intentional and documented

**Ready for Implementation**: Yes. All planning documents complete and validated.
