---
id: TASK-88
title: Clarify split Staff and Judges tabs while preserving overlapping review access
status: Done
assignee:
  - codex
created_date: '2026-03-29 16:32'
updated_date: '2026-03-29 17:13'
labels:
  - bug
  - ux
  - admin-ui
dependencies: []
documentation:
  - docs/domain-model.md
  - docs/permissions-matrix.md
priority: high
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Update the account hackathon admin role-management UI so the Staff and Judges tabs remain separate but clearly represent two capabilities rather than mutually exclusive buckets. Staff members who also review must remain visible as staff and appear in the Judges tab, and adding admin access to an existing judge must preserve review access. The UI should use stateful labels, badges, and tab-specific actions so role changes are understandable to hackathon admins.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 The Staff tab shows when a staff member also reviews submissions and provides a clear tab-specific action to enable or disable judging for staff.
- [x] #2 The Judges tab includes both review-only judges and staff members who are in the review pool, with staff reviewers clearly labeled.
- [x] #3 Adding staff access to an existing review-only judge preserves their reviewing capability instead of silently removing it.
- [x] #4 The role-management UI uses action labels and helper copy that explain the relationship between staff access and judging access.
- [x] #5 Unit coverage verifies the roster state shaping or action behavior introduced by the change.
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Update the role-roster state shaping so the Judges tab can represent both explicit judges and hackathon admins who are in the automatic judge pool, while the Staff tab can preserve and toggle judging state for admins.
2. Refactor the roster panel UI copy, badges, and action labels to explain overlapping staff/judge capability without collapsing the split tabs.
3. Ensure role mutations preserve judging when upgrading a review-only judge to hackathon admin, and add a staff-side toggle/action for enabling or disabling judging on admin assignments.
4. Align other admin surfaces that list judge choices so they include any assignment with isInJudgePool=true rather than only explicit judge roles.
5. Add or update unit tests for the roster helpers and affected admin workspace behavior, then run targeted tests followed by bun run test:unit.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Confirmed canonical docs remain unchanged: the existing single explicit role model already supports overlapping staff and review capability through hackathon_admin plus isInJudgePool=true.

Updated the shared roster helper and roster panel so the Judges tab represents review capability while the Staff tab represents admin capability, without collapsing the split-tab navigation.

Adjusted tab-specific mutations so granting staff access to a judge preserves judging, removing staff access from a staff judge preserves review-only judging, and removing judging from a staff judge preserves admin access.

Aligned the competition panel judge chooser with the canonical judge-pool model by including any role assignment with isInJudgePool=true.

Follow-up UX polish simplified the role-roster hierarchy by grouping current roster content and add-people content into separate bordered sections. During that refactor, the roster panel template nesting was tightened and revalidated with Nuxt typecheck after a reported 500 regression.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Implemented the split-tab role-management clarification for Staff and Judges without changing the canonical single-role data model. The role roster helper now shapes rows by tab capability instead of explicit role alone, so admins in the judge pool appear in Judges while still remaining on Staff. The roster panel now uses explicit overlap copy, badges, split judge sections for staff reviewers versus review-only judges, and tab-specific actions that preserve the other capability instead of silently replacing it.

Mutation behavior was tightened to match the UI promises. Adding staff access to a review-only judge now updates the assignment to hackathon_admin while preserving isInJudgePool=true. Enabling judging for a staff member now patches the judge-pool flag instead of swapping roles. Removing staff access from a staff judge demotes them to a review-only judge, and removing judging from a staff judge disables the judge-pool flag while preserving admin access. The competition panel judge chooser now includes any assignment in the judge pool, not just explicit judge rows.

Validation: `bun test tests/unit/app/utils/hackathon-role-roster.test.ts`, `bun run test:unit`.

Risks / follow-up: the current backend still exposes a single explicit role assignment per user per hackathon, so any future UX work in this area should continue treating Staff and Judges as overlapping capabilities backed by role plus judge-pool state, not as two independent explicit roles.

Follow-up polish simplified the Judges and Staff panel hierarchy by grouping the current roster and add-people sections under separate dividers, reducing redundant headings while keeping the split-tab model intact. After the refactor, the roster panel template was revalidated with `bun run typecheck` and `bun run test:unit` in response to a reported 500 error; both passed.
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
