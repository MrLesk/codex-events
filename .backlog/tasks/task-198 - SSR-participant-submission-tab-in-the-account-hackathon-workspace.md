---
id: TASK-198
title: SSR participant submission tab in the account hackathon workspace
status: Done
assignee:
  - codex
created_date: '2026-04-12 14:49'
updated_date: '2026-04-12 14:49'
labels: []
dependencies: []
documentation:
  - docs/README.md
  - docs/domain-model.md
priority: medium
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Render the participant Submission tab on the account hackathon page from server-provided participation state so users do not see a transient loading message before their current team submission appears.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 The account hackathon Submission tab renders the current participant team and latest submission from server-provided page data on initial load when that state is available.
- [x] #2 The Submission tab no longer shows a first-paint loading flash for an already-known team submission.
- [x] #3 Submission create, update, submit, and withdraw actions continue to use the existing participant submission workspace behavior after hydration.
- [x] #4 Automated coverage verifies the seeded submission state and the fallback fetch path when the resolved team changes.
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Reuse the account hackathon page's existing SSR participation payload to pass the participant team and latest submission into the Submission tab.
2. Seed the participant submission workspace from that initial server state so the first render is already resolved when the team and submission are known.
3. Preserve the existing client-side submission mutations and fallback fetch behavior for later team changes.
4. Add focused unit coverage for seeded state and fallback refetch behavior, then run lint, typecheck, and unit tests.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Confirmed canonical docs remain unchanged for this UI/data-loading fix because domain behavior and permissions did not change.

Passed SSR participation state from the account hackathon page into the participant submission panel and removed the first-paint loading dependency on client-only team/submission lookups.

Extended the submission workspace composable to accept an initial resolved submission state while still fetching when the resolved team changes later in the session.

Added unit coverage for seeded submission state and fallback refetch, then ran `bun run lint`, `bun run typecheck`, and `bun run test:unit` successfully.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Updated the participant Submission tab in the account hackathon workspace to render from the page's existing SSR participation payload instead of waiting for a client-only submission fetch. The page now passes the resolved participant team and latest submission into the submission panel, and the submission workspace can seed its initial state from that payload while preserving the existing client-side mutation flow and fallback fetch path when the team changes later.

Added unit coverage for the seeded-state and fallback-refetch behavior in `tests/unit/app/composables/useTeamSubmissionWorkspace.test.ts`.

Validation:
- `bun run lint`
- `bun run typecheck`
- `bun run test:unit`

Risks and follow-ups:
- Low risk. The tab now depends on the same participation payload already used elsewhere in the account hackathon page, so future regressions are most likely if that payload stops including the participant's latest submission or active team.
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
