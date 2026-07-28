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
* .github/workflows/1-validate-convert-push.yml - Removed duplicate parser invocation in validation step (lines 57-70), now runs command once and captures output/return code
* .github/workflows/98-france-exp--validate.yml - Removed duplicate parser invocation in validation step (lines 47-60), now runs command once and captures output/return code
* .github/workflows/validate-branch.yml - Removed duplicate parser invocation in validation step (lines 82-95), now runs command once and captures output/return code

## Additional or Deviating Changes

None.

## Release Summary

**Phase 1, Step 1.1-1.2 Complete**: Workflow Hardening - Deprecated Outputs, Invalid References, and Duplicate Command Invocations

- **Files Modified**: 5
- **.github/workflows/2-create-openair-standard.yml**: Fixed invalid diagnostic reference that would cause incorrect workflow output display
- **.github/workflows/zsm-generate-pr.yml**: Modernized deprecated GitHub Actions output syntax to current standard
- **.github/workflows/1-validate-convert-push.yml**: Removed duplicate parser invocation, reducing validation step runtime
- **.github/workflows/98-france-exp--validate.yml**: Removed duplicate parser invocation, reducing validation step runtime
- **.github/workflows/validate-branch.yml**: Removed duplicate parser invocation, reducing validation step runtime

**Workflow Optimization**: All validation steps now execute the parser command once per validation stage, capturing both output and return code from that single run. This eliminates wasted compute cycles across 3 validation workflows.
