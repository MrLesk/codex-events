---
id: TASK-154
title: Align admin overview hackathon list with Active Upcoming Past filters
status: Done
assignee:
  - codex
created_date: '2026-04-02 06:09'
updated_date: '2026-04-02 06:13'
labels:
  - ui
  - admin
dependencies: []
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Refactor the admin overview page so its hackathon list uses the same compact filter-bar interaction pattern as the platform discovery surfaces instead of the current large summary metric boxes. The admin overview should let admins switch between Active, Upcoming, and Past hackathons from the filter bar and keep the list content aligned with the selected filter. Draft hackathons belong in the Upcoming filter so setup work appears alongside future hackathons rather than in a separate header metric.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 The admin overview replaces the large header summary boxes with a compact hackathon filter bar above the list.
- [x] #2 The filter bar exposes Active, Upcoming, and Past views and shows the hackathon counts in the filter bar.
- [x] #3 Active shows manageable hackathons that are neither upcoming nor completed.
- [x] #4 Upcoming includes future-starting hackathons and all draft hackathons.
- [x] #5 Past shows completed hackathons.
- [x] #6 The list title and empty state copy reflect the selected filter instead of always showing one combined hackathon list.
- [x] #7 Relevant tests are added or updated for the new filter behavior and the required local validation commands are run.
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Add a small admin overview helper that classifies manageable hackathons into `active`, `upcoming`, or `past` using existing admin hackathon fields. Treat `completed` as past, treat every `draft` hackathon as upcoming, and derive the effective start time from the earliest agenda item or `submissionOpensAt`.
2. Refactor the admin overview page to use a query-backed compact filter bar patterned after the homepage tab flow, replace the large summary boxes, and feed the list plus empty-state copy from the selected filter.
3. Add focused unit coverage for the filter-classification helper and run `bun run lint`, `bun run typecheck`, and `bun run test:unit` before handoff.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Replaced the admin overview metric cards with a query-backed Active/Upcoming/Past filter bar and moved draft hackathons into the Upcoming bucket.

Added a small admin overview helper plus unit coverage for derived start-time classification and tab counts.

Validation: `bun run lint` passed, `bun run test:unit` passed, and `bun run typecheck` failed due to pre-existing unrelated errors in `app/components/teams/ParticipantTeamDirectoryPanel.vue` and `app/pages/account/hackathons/[slug]/index.vue`.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Updated the admin overview page to use a compact query-backed filter bar instead of the three large header metric cards. The page now exposes Active, Upcoming, and Past tabs with inline counts, filters the hackathon list and copy by the selected tab, and treats all draft hackathons as Upcoming. The tab state follows the existing `tab` query pattern so links remain stable.

Added `app/utils/admin-overview.ts` to centralize the admin-specific classification rules, including deriving an effective hackathon start time from the earliest agenda item or `submissionOpensAt`. Added unit coverage in `tests/unit/app/utils/admin-overview.test.ts` for start-time derivation, draft/past classification, and per-tab counts.

Validation run:
- `bun run lint` ✅
- `bun run test:unit` ✅
- `bun run typecheck` ❌ blocked by pre-existing unrelated errors in `app/components/teams/ParticipantTeamDirectoryPanel.vue` and `app/pages/account/hackathons/[slug]/index.vue`

Follow-up risk:
- Repo-level typecheck remains red outside this task scope until the existing typing errors are resolved.
<!-- SECTION:FINAL_SUMMARY:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [x] #1 Canonical docs were updated or confirmed unchanged
- [x] #2 Code behavior matches canonical docs
- [ ] #3 Relevant validation commands pass
- [x] #4 Tests were added or updated when behavior changed
- [x] #5 Test gaps are documented when automation is not practical
- [x] #6 Config and developer workflow docs were updated when setup changed
- [x] #7 Auth and permissions changes follow the documented platform model
- [x] #8 Risks and follow ups are recorded in the task summary
<!-- DOD:END -->
