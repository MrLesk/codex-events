---
id: TASK-301
title: Introduce client domain module layout
status: To Do
assignee:
  - Codex
created_date: '2026-04-29 16:59'
labels:
  - architecture
  - client
  - vue
  - refactor
dependencies:
  - TASK-300
documentation:
  - docs/README.md
  - docs/domain-model.md
  - docs/api-surface.md
priority: medium
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Reorganize client-side Vue and app logic away from generic buckets into clearer feature/domain modules after the server-side layout is established. Keep user-facing behavior unchanged and migrate in conservative slices so screens, composables, and API clients are easier to navigate.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Client-side feature logic has explicit homes aligned with the server/domain language where practical.
- [ ] #2 At least one cohesive Vue/app feature slice is moved out of generic utility structure with imports updated.
- [ ] #3 User-facing routes, copy, and behavior remain unchanged unless explicitly approved.
- [ ] #4 The task records intended client module boundaries for additional follow-up refactors.
- [ ] #5 Required repository validation passes with `bun run lint`, `bun run typecheck`, and `bun run test:unit`; relevant UI or route checks are run when touched.
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
<!-- DOD:END -->
