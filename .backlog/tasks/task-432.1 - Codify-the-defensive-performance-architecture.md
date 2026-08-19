---
id: TASK-432.1
title: Codify the defensive performance architecture
status: Done
assignee:
  - '@luna-architecture'
created_date: '2026-08-19 06:20'
updated_date: '2026-08-19 06:29'
labels: []
dependencies: []
references:
  - AGENTS.md
  - docs/tech-stack.md
  - docs/api-surface.md
  - docs/testing-strategy.md
modified_files:
  - AGENTS.md
  - docs/tech-stack.md
  - docs/api-surface.md
  - docs/testing-strategy.md
parent_task_id: TASK-432
priority: high
type: docs
ordinal: 128000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Make the approved latency architecture durable in canonical engineering documentation and root agent guidance before implementation begins. Define the one-bootstrap, page-shaped fetch topology and the boundaries that prevent contributors from reintroducing SSR and authenticated request fan-out.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Canonical architecture states which routes are public SSR or cached and which authenticated routes use a static client-rendered shell
- [x] #2 Canonical API guidance defines shared actor bootstrap, page-shaped event workspace reads, request cancellation, and mutation authorization boundaries
- [x] #3 Database guidance defines one logical D1 session per request, read-replica intent, bookmark consistency, and local fake-D1 expectations
- [x] #4 Media guidance requires streaming, versioned cacheable URLs, responsive Cloudflare Images variants, and prohibits public no-store originals in page backgrounds
- [x] #5 Testing guidance defines real-browser journey, request-count, duplicate-fetch, and performance-budget validation
- [x] #6 Root agent instructions require contributors to use the shared clients and contracts rather than adding feature-local fetch paths
<!-- AC:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [x] #1 Canonical docs were updated or confirmed unchanged
- [ ] #2 Code behavior matches canonical docs
- [x] #3 Relevant validation commands pass
- [x] #4 Tests were added or updated when behavior changed
- [x] #5 Test gaps are documented when automation is not practical
- [x] #6 Config and developer workflow docs were updated when setup changed
- [x] #7 Auth and permissions changes follow the documented platform model
- [x] #8 Risks and follow ups are recorded in the task summary
<!-- DOD:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Reconcile the approved architecture with current canonical docs and root instructions.
2. Define rendering, bootstrap, request, D1 consistency, media, and observability boundaries as current product engineering truth.
3. Add concise enforceable root guardrails that route future contributors to shared clients and page-shaped contracts.
4. Run git diff --check and review for contradictions or conversation-specific language.
5. Commit the documentation task locally without pushing.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Updated AGENTS.md, docs/tech-stack.md, docs/api-surface.md, and docs/testing-strategy.md with the defensive performance contract: route delivery split, shared typed account bootstrap, one request actor, page-shaped tab reads, cancellation and lazy local bundles, request-scoped D1 sessions with replica/bookmark/read-after-write rules, media variant and isolation rules, and real-browser topology budgets.

Validation: git diff --check passed. This is documentation-only; runtime behavior and automated browser topology checks were not changed. No remote database, test environment, deployment, or push was used. Runtime conformance remains outside this task and is not claimed by its Definition of Done.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Codified the defensive performance architecture in AGENTS.md, docs/tech-stack.md, docs/api-surface.md, and docs/testing-strategy.md. The docs now define public cacheable delivery versus authenticated static shells, the shared typed account bootstrap, one request actor, page-shaped tab reads, request cancellation and local lazy bundles, request-scoped D1 sessions with replica/bookmark/read-after-write rules, versioned Cloudflare Images media delivery, and real-browser topology and timing budgets. Verified with git diff --check. This documentation-only task made no runtime changes, so runtime conformance to the new contract is not claimed here; no remote database, test environment, deployment, or push was used.
<!-- SECTION:FINAL_SUMMARY:END -->
