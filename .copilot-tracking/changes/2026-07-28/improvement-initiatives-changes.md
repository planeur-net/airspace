<!-- markdownlint-disable-file -->
# Release Changes: Main Repository Rationalization and Automation

**Related Plan**: improvement-initiatives-plan.instructions.md
**Implementation Date**: 2026-07-28

## Summary

Quick win improvements to workflow hardening, focusing on fixing deprecated syntax and invalid output references.

## Changes

### Modified

* .github/workflows/2-create-openair-standard.yml - Fixed invalid diagnostic reference in display step (line 78) to use valid step output `steps.validation.outputs.parser_output` instead of non-existent `needs.validate-airspace.outputs.validation-output`
* .github/workflows/zsm-generate-pr.yml - Replaced deprecated `::set-output` syntax with modern `$GITHUB_OUTPUT` environment variable approach (lines 22-27)

## Additional or Deviating Changes

None.

## Release Summary

**Phase 1, Step 1.1 Complete**: Workflow Hardening - Deprecated Outputs and Invalid References

- **Files Modified**: 2
- **.github/workflows/2-create-openair-standard.yml**: Fixed invalid diagnostic reference that would cause incorrect workflow output display
- **.github/workflows/zsm-generate-pr.yml**: Modernized deprecated GitHub Actions output syntax to current standard

**Workflow Syntax**: Both modified workflows now use valid output patterns compliant with GitHub Actions current specification.
