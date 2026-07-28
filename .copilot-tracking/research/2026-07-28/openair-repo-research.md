<!-- markdownlint-disable-file -->
# Main Repository Improvement Research - 2026-07-28

## Scope

This research identifies improvements, rationalization opportunities, and automation paths for the main repository only.

Out of scope by explicit user request:

* openaip-openair-parser/

## Current-State Inventory

### Workflow chain and orchestration

The repository is highly automated through a chained GitHub Actions pipeline:

* .github/workflows/0-france-exp-add-version.yml
* .github/workflows/1-validate-convert-push.yml
* .github/workflows/2-create-openair-standard.yml
* .github/workflows/3-create-copies-with_date.yml
* .github/workflows/4-copy-planeur.net.yml
* .github/workflows/jekyll-gh-pages.yml

Additional operational workflows:

* .github/workflows/5-update-eaip-url.yml
* .github/workflows/validate-branch.yml
* .github/workflows/98-france-exp--validate.yml
* .github/workflows/zsm-generate-pr.yml
* .github/workflows/100-france-exp--Gdrive.yml
* .github/workflows/1000-Ludovic-private-actions.yml

### Root scripts and package automation

Root script entry points in package.json:

* validate-openair -> src/validate-openair.js
* extract-eaip-links -> src/extract-eaip-links.js
* update-eaip-urls -> src/update-eaip-urls-in-readmes.js
* update-packages -> npm-check-updates + npm install + npm audit fix

Utility scripts:

* bin/create_copies.sh
* bin/openair2cub
* src/findLines.js

### Data and publication strategy

The repository keeps editable and generated artifacts in Git:

* Source-of-truth file: france-exp.txt
* Generated files: france.txt, france_openair_standard.txt, france.cub, france.geojson
* Timestamp snapshots: france--*.txt, france--*.cub, france_openair_standard--*.txt

## Pain Points with Evidence

1. Validation command duplication in workflows doubles compute and runtime risk.
   * .github/workflows/1-validate-convert-push.yml (validation step runs parser command twice)
   * .github/workflows/2-create-openair-standard.yml (same pattern)
   * .github/workflows/98-france-exp--validate.yml and .github/workflows/validate-branch.yml (same pattern)

2. Cross-workflow chaining is deep and fragile, making failures harder to diagnose.
   * .github/workflows/1-validate-convert-push.yml -> workflow_run from stage 0
   * .github/workflows/2-create-openair-standard.yml -> workflow_run from stage 1
   * .github/workflows/3-create-copies-with_date.yml -> workflow_run from stage 2
   * .github/workflows/jekyll-gh-pages.yml -> repository_dispatch trigger

3. Workflow step references non-existent job output in stage 2 display logic.
   * .github/workflows/2-create-openair-standard.yml (display step references needs.validate-airspace outputs in a job that has no such dependency)

4. Deprecated GitHub Actions output syntax still exists.
   * .github/workflows/zsm-generate-pr.yml (uses ::set-output)

5. Auto-commit and git pull usage in mutation jobs introduces race-condition surface.
   * .github/workflows/0-france-exp-add-version.yml (git pull in mutation stage)
   * .github/workflows/1-validate-convert-push.yml (git pull before push in multiple jobs)

6. Documentation and naming consistency issues reduce maintainability.
   * README.md references france-openair-standard.txt label while artifacts use france_openair_standard.txt
   * README.md and README.en.md receive regex-based date mutations that are brittle to table format changes

7. Utility script quality gap in src/findLines.js.
   * src/findLines.js logs both resolved result and unresolved Promise variable

8. Validation overlap between branch workflows increases drift risk.
   * .github/workflows/validate-branch.yml
   * .github/workflows/98-france-exp--validate.yml

## Prioritized Opportunities

### Quick wins

1. Replace deprecated ::set-output with GITHUB_OUTPUT in zsm workflow.
2. Remove duplicate parser invocations in validation steps.
3. Fix incorrect output reference in stage 2 validation display step.
4. Normalize naming in README tables to france_openair_standard.txt.
5. Correct src/findLines.js behavior and include script usage documentation.

### Medium efforts

1. Consolidate repeated validation setup into a reusable workflow or composite action.
2. Unify duplicate branch validation workflows into one parameterized workflow.
3. Introduce concurrency guards for mutation jobs on main.
4. Replace broad sed-based README timestamp updates with deterministic placeholder replacement.

### Longer efforts

1. Shift from commit-heavy artifact updates to artifact-first publishing strategy.
2. Rationalize external dispatch integrations and define ownership/SLA for FTP, GDrive, and private repo flows.

## Automation Opportunities

1. Add root package scripts for local preflight checks:
   * verify: run validate-openair, extract-eaip-links, and docs check mode
2. Add workflow lint automation:
   * actionlint on .github/workflows
3. Add check mode for README URL/date updater to prevent silent formatting drift.
4. Add scheduled maintenance workflow that opens PRs for dependency updates rather than auto-fixing main directly.

## Risks and Dependencies

1. External service dependencies (SIA links, FTP, GDrive, external converter repos) can fail independently.
2. Auto-commits across multiple workflow stages can conflict or introduce non-deterministic outcomes.
3. Artifact retention policy is currently implicit and may increase repository churn.

## Open Questions

1. Should generated artifacts stay committed to main, or be moved to releases/pages artifacts?
2. Are timestamp snapshots required in Git history or only in publication channels?
3. Should README mutation remain fully automated or become PR-reviewed updates?
4. Should branch validation be unified immediately, or staged after quick fixes?

## Source Inputs

Primary evidence was gathered from:

* .github/workflows/*.yml
* package.json
* src/*.js (root scripts)
* README.md, README.en.md, CONTRIBUTING.md
* .copilot-tracking/research/subagents/2026-07-28/main-repo-improvements-research.md
