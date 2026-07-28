---
applyTo: '.copilot-tracking/changes/2026-07-28/improvement-initiatives-changes.md'
---
<!-- markdownlint-disable-file -->
# Implementation Plan: Main Repository Rationalization and Automation

## Overview

Implement a phased, low-risk improvement program for workflows, root scripts, and documentation to reduce operational fragility and improve maintainability, while explicitly excluding openaip-openair-parser.

## Objectives

### User Requirements

* Find what can be improved, rationalized, or automated in a better way — Source: user request
* Exclude openaip-openair-parser from recommendations and planned changes — Source: user request

### Derived Objectives

* Reduce duplicated workflow logic and inconsistent validation behavior — Derived from: repeated parser setup and duplicate validation calls in multiple workflow files
* Improve CI reliability by reducing fragile chaining and output handling mistakes — Derived from: deep workflow_run/repository_dispatch chain and incorrect output references
* Rationalize root scripts and npm automation for reproducible local preflight checks — Derived from: script fragmentation in src/ and package.json
* Improve documentation consistency and reduce regex-based mutation risk — Derived from: naming drift and broad sed replacements in README update flow
* Establish an explicit artifact/version retention policy — Derived from: generated artifacts and timestamp snapshots committed directly in repository
* Add measurable before or after reliability baselines and always-on workflow quality gates — Derived from: identified need to quantify impact and prevent YAML regressions on pull requests
* Automate dependency maintenance through reviewed pull requests — Derived from: dependency update workflow gap in current automation model

## Context Summary

### Project Files

* .github/workflows/1-validate-convert-push.yml - core validation and conversion stage with repeated command execution
* .github/workflows/2-create-openair-standard.yml - conversion stage with output reference issue and repeated validation command pattern
* .github/workflows/3-create-copies-with_date.yml - timestamp copy generation and regex-heavy README mutation logic
* .github/workflows/zsm-generate-pr.yml - uses deprecated set-output syntax
* .github/workflows/validate-branch.yml and .github/workflows/98-france-exp--validate.yml - overlapping branch validation behavior
* package.json - root automation entry points and dependency update strategy
* src/validate-openair.js, src/extract-eaip-links.js, src/update-eaip-urls-in-readmes.js, src/findLines.js - root utility scripts
* README.md, README.en.md, CONTRIBUTING.md - contributor and download documentation

### References

* .copilot-tracking/research/2026-07-28/openair-repo-research.md - primary research for this plan
* .copilot-tracking/research/subagents/2026-07-28/main-repo-improvements-research.md - detailed subagent evidence and prioritization

### Standards References

* c:/Users/SESA644858/.copilot/copilot-instructions.md - global behavior and quality expectations
* CONTRIBUTING.md - repository source-of-truth and contribution constraints

## Implementation Checklist

### [ ] Implementation Phase 0: Baseline and Decision Gates

<!-- parallelizable: false -->

* [ ] Step 0.1: Capture workflow reliability baseline (last 30-90 days)
  * Details: .copilot-tracking/details/2026-07-28/improvement-initiatives-details.md (Lines 12-31)
* [ ] Step 0.2: Decide artifact publication target model with owner sign-off
  * Details: .copilot-tracking/details/2026-07-28/improvement-initiatives-details.md (Lines 32-52)

### [x] Implementation Phase 1: Workflow Hardening Quick Wins

<!-- parallelizable: false -->

* [x] Step 1.1: Replace deprecated workflow outputs and fix invalid output references
  * Details: .copilot-tracking/details/2026-07-28/improvement-initiatives-details.md (Lines 57-77)
* [x] Step 1.2: Remove duplicate parser invocations and standardize validation capture pattern
  * Details: .copilot-tracking/details/2026-07-28/improvement-initiatives-details.md (Lines 78-99)
* [ ] Step 1.3: Add concurrency guards for main-branch mutation jobs
  * Details: .copilot-tracking/details/2026-07-28/improvement-initiatives-details.md (Lines 100-120)
* [ ] Step 1.4: Validate phase changes
  * Run workflow YAML linting and test dispatch on a feature branch
  * Skip full pipeline release actions in phase-level validation
* [ ] Step 1.5: Add dedicated workflow lint gate for pull requests
  * Details: .copilot-tracking/details/2026-07-28/improvement-initiatives-details.md (Lines 127-145)

### [ ] Implementation Phase 2: Validation Workflow Rationalization

<!-- parallelizable: false -->

* [ ] Step 2.1: Design and implement reusable validation workflow/composite action
  * Details: .copilot-tracking/details/2026-07-28/improvement-initiatives-details.md (Lines 150-172)
* [ ] Step 2.2: Merge overlapping branch validation workflows into one parameterized workflow
  * Details: .copilot-tracking/details/2026-07-28/improvement-initiatives-details.md (Lines 173-190)
* [ ] Step 2.3: Validate phase changes
  * Validate workflow equivalence on france-exp.txt and france.txt branch scenarios

### [ ] Implementation Phase 3: Root Script and Package Automation Rationalization

<!-- parallelizable: true -->

* [ ] Step 3.1: Define unified preflight script set in package.json
  * Details: .copilot-tracking/details/2026-07-28/improvement-initiatives-details.md (Lines 201-219)
* [ ] Step 3.2: Refactor src/findLines.js into a deterministic utility command
  * Details: .copilot-tracking/details/2026-07-28/improvement-initiatives-details.md (Lines 220-239)
* [ ] Step 3.3: Add check mode for README URL update logic
  * Details: .copilot-tracking/details/2026-07-28/improvement-initiatives-details.md (Lines 240-257)
* [ ] Step 3.4: Add scheduled dependency maintenance PR workflow
  * Details: .copilot-tracking/details/2026-07-28/improvement-initiatives-details.md (Lines 258-277)
* [ ] Step 3.5: Validate phase changes
  * Run local verify scripts and ensure non-mutating check mode works in CI

### [ ] Implementation Phase 4: Documentation and Artifact Lifecycle Rationalization

<!-- parallelizable: true -->

* [ ] Step 4.1: Normalize naming and download table consistency across README.md and README.en.md
  * Details: .copilot-tracking/details/2026-07-28/improvement-initiatives-details.md (Lines 288-305)
* [ ] Step 4.2: Replace regex-fragile timestamp mutations with explicit token replacement strategy
  * Details: .copilot-tracking/details/2026-07-28/improvement-initiatives-details.md (Lines 306-326)
* [ ] Step 4.3: Document selected artifact retention policy and publication responsibilities
  * Details: .copilot-tracking/details/2026-07-28/improvement-initiatives-details.md (Lines 327-347)
* [ ] Step 4.4: Validate phase changes
  * Verify README consistency, links, and policy traceability to workflows

### [ ] Implementation Phase 5: Validation

<!-- parallelizable: false -->

* [ ] Step 5.1: Run full validation for workflows, scripts, and docs
  * Execute actionlint and YAML checks on .github/workflows
  * Execute npm-based local verify scripts
* [ ] Step 5.2: Run controlled end-to-end test on feature branch and dry-run release chain
  * Validate branch checks and non-production publication behavior
* [ ] Step 5.3: Fix minor issues and report blockers requiring policy decisions
  * Escalate unresolved governance decisions as follow-on work

## Planning Log

See `.copilot-tracking/plans/logs/2026-07-28/improvement-initiatives-log.md` for discrepancy tracking, implementation paths considered, and suggested follow-on work.

## Dependencies

* GitHub Actions with repository_dispatch and workflow_run permissions
* Existing secrets for ACCESS_TOKEN, FTP credentials, and any GDrive integrations
* Node.js runtime for root scripts
* actionlint or equivalent workflow lint tooling

## Success Criteria

* Workflow validation and conversion stages run with single parser invocation per validation step — Traces to: duplicate-command pain point
* Deprecated output syntax is removed and workflow outputs are reliable — Traces to: zsm workflow deprecation finding
* Branch validation is consolidated without behavior loss — Traces to: validation overlap finding
* Workflow lint runs as an always-on pull request gate — Traces to: workflow lint gate requirement
* Root script automation includes deterministic verify and check modes — Traces to: script fragmentation finding
* Scheduled dependency maintenance generates reviewable pull requests — Traces to: dependency maintenance automation gap
* README naming and timestamp update logic are stable across both languages — Traces to: docs consistency and regex fragility findings
* Artifact retention policy is documented and reflected in automation behavior — Traces to: versioning/governance finding

