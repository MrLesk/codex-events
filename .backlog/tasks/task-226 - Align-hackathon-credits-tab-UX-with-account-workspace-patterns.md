---
id: TASK-226
title: Align hackathon credits tab UX with account workspace patterns
status: Done
assignee: []
created_date: '2026-04-17 07:42'
updated_date: '2026-04-17 07:53'
labels: []
dependencies: []
documentation:
  - docs/domain-model.md
  - docs/api-surface.md
  - docs/permissions-matrix.md
priority: medium
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Update the account hackathon credits experience so both the admin inventory workflow and the participant claim workflow use the same visual structure, spacing, and interaction patterns as the surrounding account hackathon tabs. Replace the one-off credits management card treatment with native workspace panel patterns, and let admins upload CSV inventory as part of creating a new credit offer instead of forcing a separate follow-up step.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 The credits tab uses the same container, section, and action patterns as the other account hackathon tabs instead of a custom one-off card treatment.
- [x] #2 Hackathon admins and platform admins can create a credit offer and upload its initial CSV inventory in one consistent flow without losing the ability to append inventory later.
- [x] #3 The participant-facing credit claim area follows the same workspace presentation conventions as the rest of the tabbed hackathon experience.
- [x] #4 Existing credit creation, update, import, and claim behavior remains intact and is covered by updated tests where the UI contract changes.
<!-- AC:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Reworked the hackathon credits tab to use the same `AppCard`, workspace detail panel, and inset-surface patterns as the surrounding account hackathon tabs instead of the previous one-off glossy card layout. Admins can now create an offer and optionally upload the initial CSV inventory in the same flow, while still appending inventory from each existing offer row later. Added a frontend helper with unit coverage for the create-plus-upload orchestration, confirmed canonical docs were unchanged, and ran `bun run lint`, `bun run typecheck`, and `bun run test:unit` successfully.

Risk / follow-up: I validated the implementation through code review plus the required local checks, but I did not run an authenticated browser pass against a live local session in this turn.
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
