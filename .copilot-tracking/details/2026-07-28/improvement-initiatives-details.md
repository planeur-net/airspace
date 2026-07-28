<!-- markdownlint-disable-file -->
# Implementation Details: Main Repository Rationalization and Automation

## Context Reference

Sources: .copilot-tracking/research/2026-07-28/openair-repo-research.md and .copilot-tracking/research/subagents/2026-07-28/main-repo-improvements-research.md.

## Implementation Phase 0: Baseline and Decision Gates

<!-- parallelizable: false -->

### Step 0.1: Capture workflow reliability baseline

Objective: establish measurable pre-change baseline for runtime, failures, and queue contention.

Files:
* .copilot-tracking/research/2026-07-28/openair-repo-research.md
* .copilot-tracking/plans/logs/2026-07-28/improvement-initiatives-log.md

Implementation notes:
* Measure the last 30 to 90 days of workflow runs for key pipelines.
* Record median and p95 runtime, failure count, and top failure causes.
* Add baseline metrics and assumptions to research and planning log.

Success criteria:
* Baseline table exists with dated capture window and data source.
* Metrics can be compared to post-change validation results.

Dependencies:
* Access to workflow run history

### Step 0.2: Decide target artifact publication model

Objective: select one artifact publication model before implementation phases that depend on it.

Files:
* .copilot-tracking/plans/2026-07-28/improvement-initiatives-plan.instructions.md
* .copilot-tracking/details/2026-07-28/improvement-initiatives-details.md
* .copilot-tracking/plans/logs/2026-07-28/improvement-initiatives-log.md

Implementation notes:
* Compare options: commit artifacts to main versus release or pages artifacts.
* Capture approver, decision date, and acceptance criteria.
* Define exit criteria for moving into phase 4 documentation and lifecycle work.

Success criteria:
* Decision record is documented with owner sign-off.
* Downstream phases reference one selected target model.

Dependencies:
* Maintainer policy decision

## Implementation Phase 1: Workflow Hardening Quick Wins

<!-- parallelizable: false -->

### Step 1.1: Replace deprecated workflow output syntax and fix invalid output references

Objective: remove immediate reliability defects in workflow syntax and output usage.

Files:
* .github/workflows/zsm-generate-pr.yml
* .github/workflows/2-create-openair-standard.yml

Implementation notes:
* Replace deprecated output emission syntax with GITHUB_OUTPUT writes.
* Replace invalid output references with valid step outputs in the same job.
* Normalize output names parser_output and parser_rc.

Success criteria:
* No deprecated output syntax remains.
* Validation output display uses valid references.
* Workflow syntax passes lint.

Dependencies:
* None

### Step 1.2: Remove duplicate parser command invocations in validation steps

Objective: reduce runtime waste and avoid command drift.

Files:
* .github/workflows/1-validate-convert-push.yml
* .github/workflows/2-create-openair-standard.yml
* .github/workflows/98-france-exp--validate.yml
* .github/workflows/validate-branch.yml

Implementation notes:
* Execute parser command once per validation stage.
* Capture output and return code from that single run.
* Reuse captured output for display and failure gate checks.

Success criteria:
* Each targeted validation stage calls parser once.
* Pass or fail behavior remains equivalent.

Dependencies:
* Step 1.1 preferred

### Step 1.3: Add concurrency guards to main mutation workflows

Objective: prevent overlapping auto-commit runs on main.

Files:
* .github/workflows/0-france-exp-add-version.yml
* .github/workflows/1-validate-convert-push.yml
* .github/workflows/3-create-copies-with_date.yml

Implementation notes:
* Add concurrency groups keyed by workflow and ref.
* Use cancellation policy that avoids partial publication side effects.
* Remove unnecessary pull-before-commit patterns where safe.

Success criteria:
* No overlapping mutation runs on main for the same workflow group.
* Auto-commit behavior remains deterministic.

Dependencies:
* Maintainer decision on cancellation policy

### Step 1.4: Validate phase changes

Validation commands:
* actionlint .github/workflows/*.yml
* YAML validation in CI

### Step 1.5: Add dedicated workflow lint PR gate

Objective: enforce workflow quality on every pull request.

Files:
* .github/workflows/lint-workflows.yml (new)

Implementation notes:
* Trigger on pull_request and workflow_dispatch.
* Run actionlint against .github/workflows.
* Fail check on lint errors and expose logs in PR checks.

Success criteria:
* Every PR receives a workflow lint check.
* Workflow syntax regressions fail before merge.

Dependencies:
* None

## Implementation Phase 2: Validation Workflow Rationalization

<!-- parallelizable: false -->

### Step 2.1: Implement a reusable validation unit

Objective: centralize repeated setup and validation logic.

Files:
* .github/workflows/reusable-validate-openair.yml (new) or .github/actions/validate-openair/action.yml (new)
* .github/workflows/1-validate-convert-push.yml
* .github/workflows/2-create-openair-standard.yml
* .github/workflows/validate-branch.yml
* .github/workflows/98-france-exp--validate.yml

Implementation notes:
* Define inputs for target file, parser version, output path, and warning flags.
* Define outputs for parser_output and parser_rc.
* Keep existing validation semantics unchanged.

Success criteria:
* One reusable validation implementation is consumed by all targeted workflows.
* Setup duplication is reduced.

Dependencies:
* Phase 1 completion

### Step 2.2: Consolidate branch validation workflows

Objective: remove overlap between validate-branch and 98-france-exp validation flows.

Files:
* .github/workflows/validate-branch.yml
* .github/workflows/98-france-exp--validate.yml

Implementation notes:
* Keep one canonical branch and manual validation workflow.
* Preserve manual dispatch file selection support.

Success criteria:
* Single branch validation workflow covers current scenarios.

Dependencies:
* Step 2.1 completion

### Step 2.3: Validate phase changes

Validation tasks:
* Manual dispatch validation for france-exp.txt
* Feature branch push validation for france.txt

## Implementation Phase 3: Root Script and Package Automation Rationalization

<!-- parallelizable: true -->

### Step 3.1: Add root preflight scripts in package.json

Objective: provide one command for consistent local verification.

Files:
* package.json

Implementation notes:
* Add verify command chaining validation and docs checks.
* Keep mutate and check-only commands clearly separated.
* Replace automatic dependency auto-fix default with review-first option.

Success criteria:
* One verify command executes local preflight checks.
* Script behavior is predictable and documented.

Dependencies:
* None

### Step 3.2: Rationalize src/findLines.js utility behavior

Objective: make script output deterministic and usable in pipelines.

Files:
* src/findLines.js

Implementation notes:
* Remove unresolved Promise logging.
* Support optional arguments for input file and prefix.
* Emit newline-delimited output only.
* Add usage documentation in CONTRIBUTING.md or README.md tools section.

Success criteria:
* Script emits only resolved values and proper exit status.
* Usage examples are documented and copy-pastable.

Dependencies:
* None

### Step 3.3: Add check mode for README URL updater

Objective: detect documentation drift in CI without mutating files.

Files:
* src/update-eaip-urls-in-readmes.js
* package.json

Implementation notes:
* Add --check mode that computes needed changes without writing.
* Return non-zero exit when updates would be needed.

Success criteria:
* CI can fail on stale links without changing workspace state.

Dependencies:
* None

### Step 3.4: Add scheduled dependency maintenance PR workflow

Objective: automate dependency hygiene through reviewed pull requests instead of direct main mutations.

Files:
* .github/workflows/dependency-maintenance.yml (new)
* package.json

Implementation notes:
* Trigger weekly on schedule and manual dispatch.
* Run dependency update checks and open curated PRs.
* Avoid direct commits to main from this workflow.

Success criteria:
* Scheduled workflow opens reviewable update PRs.
* Dependency updates are visible and auditable.

Dependencies:
* Repository token permissions for PR creation

### Step 3.5: Validate phase changes

Validation commands:
* npm run verify
* npm run update-eaip-urls -- --check

## Implementation Phase 4: Documentation and Artifact Lifecycle Rationalization

<!-- parallelizable: true -->

### Step 4.1: Normalize artifact naming across README files

Objective: remove naming drift between french and english docs.

Files:
* README.md
* README.en.md

Implementation notes:
* Align displayed labels and link targets for france_openair_standard artifacts.
* Keep language-specific explanatory content.

Success criteria:
* Both readmes use consistent artifact naming.

Dependencies:
* None

### Step 4.2: Replace fragile date substitutions with explicit tokens

Objective: prevent broad regex replacements from accidental edits.

Files:
* bin/create_copies.sh
* .github/workflows/3-create-copies-with_date.yml
* README.md
* README.en.md

Implementation notes:
* Introduce explicit placeholders for dated links in readmes.
* Replace placeholders only, not wide regex regions.

Success criteria:
* Date refresh modifies only intended placeholders.
* Readme layout changes do not break replacement logic.

Dependencies:
* Step 4.1 completion recommended

### Step 4.3: Document artifact retention and publication policy

Objective: make data lifecycle choices explicit for contributors.

Files:
* README.md
* README.en.md
* CONTRIBUTING.md

Implementation notes:
* State whether snapshots remain in git or move to release or pages artifacts.
* Document owner responsibilities for FTP, GDrive, and dispatch integrations.
* Add explicit trigger criteria for a follow-on external dispatch rationalization implementation.

Success criteria:
* Policy and ownership are documented and discoverable.
* Follow-on trigger for dispatch topology changes is documented with owners and readiness criteria.

Dependencies:
* Maintainer policy decision

### Step 4.4: Validate phase changes

Validation commands:
* Markdown render check
* Link checker on README download table

## Implementation Phase 5: Validation

<!-- parallelizable: false -->

### Step 5.1: Run full validation

Commands:
* actionlint .github/workflows/*.yml
* npm run verify
* npm run update-eaip-urls -- --check

### Step 5.2: Run controlled end-to-end workflow test

Tasks:
* Trigger branch validation workflows on feature branch.
* Trigger staged chain in dry-run safe conditions.
* Confirm no unexpected file churn.

### Step 5.3: Report blockers and follow-on decisions

Tasks:
* Document technical blockers and affected workflows.
* Document unresolved policy decisions requiring maintainer input.

## Dependencies

* Maintainer decisions on artifact retention model
* Repository secrets required for external integrations

## Success Criteria

* Workflow quick wins are implemented with no behavior regression.
* Validation duplication is reduced via reusable implementation.
* Root scripts provide deterministic verify and check modes.
* Documentation naming and date update logic are consistent and stable.
* Planned work remains outside openaip-openair-parser.
