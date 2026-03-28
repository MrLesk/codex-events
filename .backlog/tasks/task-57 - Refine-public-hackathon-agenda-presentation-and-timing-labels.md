---
id: TASK-57
title: Refine public hackathon agenda presentation and timing labels
status: Done
assignee:
  - Codex
created_date: '2026-03-28 12:17'
updated_date: '2026-03-28 13:41'
labels:
  - ui
  - public-hackathon
dependencies: []
documentation:
  - docs/domain-model.md
  - docs/design-reference.md
priority: high
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Improve the agenda section on the public hackathon detail page so the details tab feels intentionally designed instead of a generic stacked list, while keeping the agenda grounded in the canonical structured agenda-item model.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 The public hackathon details tab presents agenda items with a more polished, readable visual treatment that fits the existing page design in light and dark themes.
- [x] #2 Agenda timing labels include weekday context for multi-day or overnight agendas.
- [x] #3 Agenda timing labels collapse to time-only labels when the hackathon agenda occurs within a single day without overnight carry.
- [x] #4 The updated agenda remains responsive and preserves agenda item titles and optional details clearly.
- [x] #5 Relevant automated coverage is updated or existing coverage still passes for the changed behavior.
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Add agenda timing presentation helpers to the public hackathon presentation module so single-day versus multi-day label rules are centralized and unit-testable.
2. Update the public hackathon details page agenda section to use the new helper output and a more polished responsive timeline-style layout that stays consistent with the surrounding public page design.
3. Add targeted unit tests for the agenda timing rules, verify the rendered details tab in the browser, and run bun run test:unit before handoff.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Centralized agenda day-context and time-label formatting in the public hackathon presentation helper so single-day, multi-day, and overnight cases are testable.

Refined the public hackathon details-tab agenda into a timeline-style schedule treatment and verified the updated layout in the browser on desktop and mobile.

Validation results: bun run test:unit passed. bun run typecheck still fails on pre-existing server application typing issues outside this change scope.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Refined the public hackathon agenda experience on the details tab by moving agenda timing presentation rules into `useHackathonPresentation` and updating the page to render a more intentional timeline-style schedule. Single-day agendas now collapse to time-only labels, while multi-day and overnight agendas include weekday/date context and preserve end-day context when an item crosses midnight.

Added targeted unit coverage in `tests/unit/app/composables/useHackathonPresentation.test.ts` for single-day, multi-day, and overnight formatting cases. Verified the refreshed UI in the browser on desktop and mobile for `http://localhost:3000/hackathons/codex-singapore-2026-03-28?tab=details`.

Validation:
- `bun run test:unit` ✅
- `bun run typecheck` ⚠️ Fails on unrelated existing server typing errors in `server/api/hackathons/[hackathonId]/applications/actions/apply-staged-decisions.post.ts` and `server/api/hackathons/[hackathonId]/applications/index.post.ts`.
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
