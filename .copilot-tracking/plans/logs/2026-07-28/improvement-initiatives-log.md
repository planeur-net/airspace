<!-- markdownlint-disable-file -->
# Planning Log: Main Repository Rationalization and Automation

## Discrepancy Log

Gaps and differences identified between research findings and the implementation plan.

### Unaddressed Research Items

No current unaddressed research items.

### Plan Deviations from Research

* DD-03: External dispatch and integration flow rationalization is deferred to documentation/policy outcomes rather than implementation in this pass.
  * Research recommends: rationalize external dispatch integrations and define ownership/SLA for FTP, GDrive, and private repo flows.
  * Plan implements: policy and ownership documentation work, while retaining current dispatch topology.
  * Rationale: execution changes require cross-team owner confirmation and operational rollback planning.

## Implementation Paths Considered

### Selected: Stabilize Then Rationalize

* Approach: fix immediate reliability defects, remove duplication, then apply structural workflow and artifact-policy rationalization.
* Rationale: fastest path to lower operational risk while preserving compatibility.
* Evidence: .copilot-tracking/research/2026-07-28/openair-repo-research.md

### IP-01: Full Chain Redesign First

* Approach: collapse workflow chain and artifact strategy immediately.
* Trade-offs: higher strategic payoff, but high rollback risk and policy coupling.
* Rejection rationale: deferred until quick wins and policy decisions are complete.

### IP-02: Quick Fixes Only

* Approach: only replace deprecated syntax and duplicate command calls.
* Trade-offs: low effort, but leaves structural drift and governance ambiguity unresolved.
* Rejection rationale: insufficient rationalization depth for user goal.

### IP-03: Docs-Only Rationalization

* Approach: normalize naming and README updates without workflow changes.
* Trade-offs: improves readability but does not reduce CI failure or mutation risks.
* Rejection rationale: does not address highest-risk operational issues.

## Suggested Follow-On Work

Items identified during planning that fall outside current scope.

* WI-01: Define and approve target-state release architecture.
  * Description: decide commit artifacts vs release assets/pages artifacts as the canonical publication model.
  * Priority: High
  * Source: Phase 0 policy decision outputs
  * Dependency: maintainer policy decision

* WI-02: Build workflow observability dashboard.
  * Description: gather runtime, failure causes, and queue contention metrics for each workflow.
  * Priority: Medium
  * Source: DR-01
  * Dependency: GitHub run-history access

* WI-03: Secret governance and ownership documentation.
  * Description: document ownership, rotation cadence, and incident handling for ACCESS_TOKEN, FTP, and GDrive credentials.
  * Priority: Medium
  * Source: DR-01
  * Dependency: maintainer and org security input

* WI-05: External dispatch topology modernization.
  * Description: redesign repository_dispatch and cross-repo integration flows after owners and rollback criteria are approved.
  * Priority: Medium
  * Source: DR-02 and DD-03
  * Dependency: ownership and SLA sign-off plus rollback playbook

* WI-04: Introduce release smoke-test workflow against published endpoints.
  * Description: verify availability and checksum consistency of published files after each release chain execution.
  * Priority: Medium
  * Source: operational resilience analysis
  * Dependency: completion of phase 2 and phase 4

