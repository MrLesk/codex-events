---
id: TASK-432
title: Make authenticated navigation sub-second by architecture
status: In Progress
assignee:
  - '@luna-architecture'
created_date: '2026-08-19 06:18'
updated_date: '2026-08-20 21:47'
labels: []
dependencies: []
references:
  - docs/tech-stack.md
  - docs/api-surface.md
  - docs/testing-strategy.md
priority: high
type: enhancement
ordinal: 127000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Refactor the Codex Events runtime so account, admin, event-workspace, and public journeys no longer multiply session, authorization, D1, SSR, and media latency. The design must remain Cloudflare-first and make the fast path the obvious path for future contributors. This initiative is validated against local D1 only until the user explicitly authorizes pushing and test deployment.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Authenticated account and admin documents are served without blocking on D1-backed SSR work
- [ ] #2 A browser navigation performs one shared actor bootstrap and no duplicate session fetches
- [ ] #3 Complex event tabs use page-shaped data contracts instead of multi-endpoint request fan-out
- [ ] #4 Authenticated API requests resolve identity, consent, and authorization through a bounded documented path
- [ ] #5 D1 reads can use request-scoped Sessions API semantics and preserve read-after-write behavior
- [ ] #6 Public pages and versioned media have explicit Cloudflare cache and transformation behavior
- [ ] #7 Automated local journey checks enforce request-count and latency budgets for representative signed-in pages
- [ ] #8 Repository documentation and agent instructions make architectural regressions reviewable
<!-- AC:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 Canonical docs were updated or confirmed unchanged
- [ ] #2 Code behavior matches canonical docs
- [ ] #3 Relevant validation commands pass
- [ ] #4 Tests were added or updated when behavior changed
- [ ] #5 Test gaps are documented when automation is not practical
- [ ] #6 Config and developer workflow docs were updated when setup changed
- [ ] #7 Auth and permissions changes follow the documented platform model
- [ ] #8 Risks and follow ups are recorded in the task summary
- [ ] #9 No commits are pushed and no test environment is deployed before explicit user approval
<!-- DOD:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Establish the canonical defensive performance contract and root guardrails.
2. Implement the independent bootstrap, actor, D1-session, and media slices with fresh Luna workers.
3. Consolidate event workspace reads after the shared foundations land.
4. Add signed-in browser topology and latency budgets.
5. Validate only against local D1, review all commits, and stop before push or test deployment.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Exact local candidate dfe6fb6d0c4f972b9a0040be71e6bcfe0501d483: MCP generators clean; bun run lint and bun run typecheck pass; unit 155 files/1047 tests; integration 40 files/455 tests; Cloudflare build pass; workflow topology 2/2; focused Chromium topology 22/22 with zero API, console, or page errors, usable timings about 171-655ms, Settings local editor with zero CDN requests, and one intentional cancellation abort; full BDD 85/85 and destructive BDD 2/2. No remote deployment, CI, test URL, CF-Cache-Status, or remote cache evidence exists. Independent review found no P0, P1, or P2; nonblocking P3: an invalid or denied entry-family tab query may remain in the URL after a 403/404 entry response, without a data leak. Root remains In Progress. Remaining root evidence is a pushed test deployment, CI result, deployed real-browser timings, deployed CF-Cache-Status and revision behavior, and remote cache/revocation verification.
<!-- SECTION:NOTES:END -->
