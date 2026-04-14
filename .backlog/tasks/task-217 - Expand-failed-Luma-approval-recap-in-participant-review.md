---
id: TASK-217
title: Expand failed Luma approval recap in participant review
status: Done
assignee:
  - codex
created_date: '2026-04-14 17:31'
updated_date: '2026-04-14 17:43'
labels: []
dependencies: []
documentation:
  - docs/domain-model.md
priority: medium
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Add an expandable failed-Luma-sync recap in the shared participant review panel so hackathon admins can open the warning and see which approved participants still need manual approval in Luma from the account-scoped hackathon participants tab.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 When approved participant Luma approval sync failures exist, the warning recap includes a control to expand and collapse the affected participant list.
- [x] #2 The expanded recap lists the affected approved participants with enough identifying information for manual follow-up in Luma.
- [x] #3 The recap stays collapsed by default and existing participant review behavior is unchanged when no failed Luma syncs exist.
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Update the shared participant review panel in `app/components/admin/AdminApplicationsReviewPanel.vue` so the failed Luma approval warning can expand and collapse a participant list using existing local toggle patterns.
2. Show concise participant identifiers in the expanded recap so admins can manually approve the right people in Luma without changing the surrounding participant review layout.
3. Add or update the smallest practical automated coverage for the new recap behavior, then run `bun run lint`, `bun run typecheck`, and `bun run test:unit` before handoff.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Discovery: the account-scoped hackathon Participants tab and the admin Operations participant review both reuse `AdminApplicationsReviewPanel`, so one component change will cover both surfaces.

Discovery: `AppAlert` supports slot content, which allows the expandable list to stay inside the existing warning alert without introducing a new container.

Implemented the expandable failed-Luma-sync recap in `AdminApplicationsReviewPanel` so the existing warning alert can reveal or hide the affected participant list inline.

Added utility coverage for failed-sync application selection and recap toggle copy in `tests/unit/app/utils/admin-workspace.test.ts`. The current repo unit setup does not include a dedicated component interaction harness, so the toggle interaction is validated through lint, typecheck, and shared utility tests rather than a mounted component test.

Validation completed successfully: `bun run lint`, `bun run typecheck`, and `bun run test:unit`.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Added an inline expand/collapse control to the shared participant review warning for failed Luma syncs. When the alert is expanded, admins can see the affected participant identities plus Luma/account identifiers needed for manual follow-up from the account hackathon Participants tab and the admin Operations view.

The failed-sync filtering and toggle copy were moved into shared admin-workspace helpers so the behavior is covered by unit tests. Validation passed with `bun run lint`, `bun run typecheck`, and `bun run test:unit`. The repo does not currently have a dedicated mounted component test harness for this interaction, so the UI wiring is covered through compile-time validation plus the new helper tests.
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
