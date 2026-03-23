---
id: TASK-4
title: Deliver the canonical UI for the Codex hackathon platform
status: Done
assignee:
  - Codex
created_date: '2026-03-22 22:08'
updated_date: '2026-03-23 19:20'
labels:
  - frontend
  - ui
  - initiative
milestone: m-1
dependencies:
  - TASK-3
documentation:
  - docs/README.md
  - docs/domain-model.md
  - docs/lifecycle-and-state-machines.md
  - docs/permissions-matrix.md
  - docs/api-surface.md
  - docs/testing-strategy.md
  - docs/design-reference.md
  - docs/tech-stack.md
priority: high
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Create the first real product UI for the Codex hackathon platform so operators, participants, judges, and winners can use the documented workflows through the Nuxt application. This initiative exists to translate the canonical product model in docs/ into a usable frontend surface, using `Figma-Design/` only as a visual reference and never as the source of product behavior. The scope covers public discovery, role-aware navigation, participant workflows, admin operations, judging, shortlist and winner workflows, prize redemption, and UI validation.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 The initiative is broken down into focused UI subtasks that cover the public, participant, judge, winner, and admin workflows defined in the canonical docs.
- [x] #2 The planned UI scope follows canonical permissions, lifecycle states, document-acceptance rules, and derived views from `docs/` rather than starter-template behavior or in-progress backend implementation details.
- [x] #3 The UI initiative includes validation coverage expectations for critical public and authenticated workflows and records any remaining backend dependencies needed before implementation can be completed.
<!-- AC:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Completed the Milestone 1 canonical UI initiative across the role-aware shell, public discovery, account and participant workflows, team formation and submission management, judge workspace, admin operations and competition workspaces, prize redemption, and the focused UI validation surface. The implementation follows the canonical docs, and the milestone validation gate is now captured in `validate:ui-milestone` with documented coverage and current known gaps.
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
