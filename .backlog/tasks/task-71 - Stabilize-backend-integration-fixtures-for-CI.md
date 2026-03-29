---
id: TASK-71
title: Stabilize backend integration fixtures for CI
status: Done
assignee:
  - '@codex'
created_date: '2026-03-29 00:02'
updated_date: '2026-03-29 00:04'
labels: []
dependencies: []
references:
  - .github/workflows/ci.yml
  - tests/integration/server/api/application-routes.test.ts
  - tests/integration/server/api/hackathon-routes.test.ts
documentation:
  - AGENTS.md
  - docs/testing-strategy.md
priority: high
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Fix the remaining backend integration-test failures now exposed after lint and typecheck pass. Keep the scope limited to deterministic test-fixture issues such as expired lifecycle windows and oversized D1 insert batches that are breaking `bun run test:integration` in CI.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 `bun run test:integration` passes locally
- [x] #2 The application-routes integration fixtures no longer depend on a near-term real calendar date to remain inside `registration_open`
- [x] #3 The public hackathon route integration helpers stay under the local D1 SQL variable limit without changing product behavior
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
After lint and typecheck were fixed, `bun run test:integration` exposed two deterministic fixture problems: the application-routes integration seed used a near-term registration window that had already closed on the current calendar date, and the hackathon-routes helper inserted four wide hackathon rows at once, exceeding the local D1 SQL variable limit. Fixed the first by widening the application fixture window to span the present while preserving `registration_open`, and fixed the second by reducing the helper batch size from four rows to three.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Stabilized the remaining backend integration fixtures for CI.

What changed:
- Widened the application-routes integration fixture lifecycle window so it remains inside `registration_open` regardless of the current real date.
- Reduced the hackathon-routes helper insert batch size from four to three rows to stay under the local D1 SQL variable limit.

Validation:
- `bun run lint` passed with warnings only.
- `bun run typecheck` passed.
- `bun run test:unit` passed.
- `bun run test:integration` passed.

Docs/config:
- Canonical docs were unchanged.
- No config or workflow doc changes were required.

Risks/follow-ups:
- The integration suite still contains hardcoded lifecycle timestamps in other files, but the currently failing backend-checks coverage now passes locally. If more calendar-sensitive failures emerge later, the next step should be a shared test-time fixture strategy rather than continuing one-off timestamp edits.
<!-- SECTION:FINAL_SUMMARY:END -->

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
