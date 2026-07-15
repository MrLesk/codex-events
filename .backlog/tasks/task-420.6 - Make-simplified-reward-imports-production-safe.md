---
id: TASK-420.6
title: Make simplified reward imports production-safe
status: Done
assignee:
  - '@codex'
created_date: '2026-07-15 21:19'
updated_date: '2026-07-15 21:35'
labels: []
dependencies: []
references:
  - 'https://developers.cloudflare.com/d1/worker-api/d1-database/#batch'
modified_files:
  - 'server/api/events/[eventId]/simplified-claiming/rewards/import.post.ts'
  - tests/integration/server/api/simplified-claiming-routes.test.ts
parent_task_id: TASK-420
priority: high
type: bug
ordinal: 105000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
A valid 120-link simplified-claiming reward CSV reaches production but fails atomically because the importer builds 20-term compound SELECT statements that Cloudflare D1 rejects. Make large imports succeed without weakening validation, uniqueness, or append-only behavior, then publish the fix together with the latest main commit.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 A headerless CSV with 120 unique HTTPS reward links imports successfully and reports exact imported, skipped, and inventory counts.
- [x] #2 Duplicate links within the upload and links already stored remain skipped without creating duplicate inventory.
- [x] #3 The importer uses D1-compatible statements that remain within production query limits.
- [x] #4 Required unit, integration, and BDD validation passes.
- [x] #5 A production release includes this fix and TASK-420.5's simplified claiming failure-message fix.
<!-- AC:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [x] #1 Canonical docs were updated or confirmed unchanged
- [x] #2 Code behavior matches canonical docs
- [x] #3 Relevant validation commands pass
- [x] #4 Tests were added or updated when behavior changed
- [x] #5 Test gaps are documented when automation is not practical
- [x] #6 Config and developer workflow docs were updated when setup changed
- [x] #7 Auth and permissions changes follow the documented platform model
- [x] #8 Risks and follow ups are recorded in the task summary
<!-- DOD:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Rebase the work on the latest origin/main and inspect the importer, D1 adapter, integration harness, and recent release conventions.
2. Replace the compound SELECT insert with a D1-compatible VALUES-backed batch statement while preserving atomic append and duplicate semantics.
3. Add integration coverage for a 120-link import and existing duplicate/concurrent behavior.
4. Run targeted tests, full required validation, and a production-compatible D1 EXPLAIN check.
5. Finalize the Backlog task, commit and push main, publish the next release using the last ten releases as the changelog model, and monitor production deployment.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Production diagnosis: Cloudflare D1 rejects the existing 20-term compound SELECT with `too many terms in compound SELECT`.

Implementation: use a VALUES-backed input table with 49 rows per statement. Each row uses two bound values; the shared timestamp and event ID bring a full statement to D1's 100-binding maximum. A 2,000-row upload therefore uses 42 batched statements including the offer insert. Per-row timestamp offsets preserve deterministic claim ordering.

Verification so far: production D1 EXPLAIN accepted the 49-row/100-binding statement, and the targeted simplified-claiming integration suite passed with a 120-link first import plus existing, in-file, and concurrent duplicate cases.

Full validation passed: `bun run lint`; `bun run typecheck`; `bun run test:unit` (110 files, 771 tests); `bun run test:integration` (25 files, 360 tests); `bun run test:bdd` (51 standard scenarios and 2 destructive scenarios); and `git diff --check`. Canonical product behavior, configuration, authorization, and documentation are unchanged.

Production verification: GitHub release `v1.19.1` deployed successfully from commit `35849016d6c8e5def50ac84f726c273e345cfd8c` and included TASK-420.5. The real 120-link upload returned HTTP 200 on Worker version `861e1598-f8b1-4abc-ba15-a69b33c1436b`. A read-only production D1 check confirmed one simplified offer, 120 rewards, 120 distinct reward values, and zero claims.

Risk review: no remaining reward-import risk was identified at the configured 2,000-row limit. The separate Luma attendee importer is safe at this event's 200-person scale; its 10,000-row theoretical maximum uses sequential chunks and can be evaluated separately if that scale is needed.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Replaced the D1-incompatible compound SELECT reward insert with bounded VALUES-backed statements, preserving append and duplicate behavior. Verified a 120-link import and duplicate/concurrent cases in integration tests, passed lint/typecheck/unit/integration/BDD validation, and confirmed the statement against production D1. Released `v1.19.1` with TASK-420.5, observed the production upload return HTTP 200, and confirmed exactly 120 unique unclaimed rewards in production.
<!-- SECTION:FINAL_SUMMARY:END -->
