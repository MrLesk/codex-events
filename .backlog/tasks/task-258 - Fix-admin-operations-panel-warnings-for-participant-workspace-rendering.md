---
id: TASK-258
title: Fix admin operations panel warnings for participant workspace rendering
status: In Progress
assignee:
  - codex
created_date: '2026-04-17 19:06'
updated_date: '2026-04-17 19:15'
labels:
  - bugfix
  - admin
  - ui
dependencies: []
priority: medium
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Remove the admin operations route warnings caused by the participant workspace panel render path, including the unresolved participants panel component and any related reactive-props warning emitted while loading the participants section.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 The account hackathon admin operations participants section renders without the unresolved `AccountHackathonParticipantsPanel` warning.
- [ ] #2 The participant visibility and admin operations surfaces use the same valid participants panel component name or import pattern.
- [ ] #3 The admin operations participants render path no longer emits the `toRefs() expects a reactive object but received a plain one` warning during local validation.
- [ ] #4 Required local validation passes for the affected workspace change.
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Update the admin operations and participant visibility surfaces to reference the participants panel with the valid Nuxt auto-registered component name confirmed in `.nuxt/components.d.ts`.
2. Reproduce or inspect the affected render path again after the component-name fix to determine whether the `toRefs()` warning was a secondary effect or whether a local wrapper still forwards plain props.
3. If the reactive-props warning remains, patch the smallest local caller or wrapper responsible for passing a plain object into the Reka forwarding helper used on this route.
4. Validate the fix with targeted checks and the required `bun run lint`, `bun run typecheck`, and `bun run test:unit` commands, then record any remaining test gaps.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Patched both participant surfaces to import `AccountHackathonParticipantsPanel` explicitly instead of relying on the invalid short auto-import tag that is not registered under this repo's path-prefixed component naming.

Replaced VueUse `reactiveOmit(props, ...)` with a local computed prop forwarder in `app/components/ui/badge/Badge.vue` and `app/components/ui/avatar/AvatarFallback.vue`, because VueUse implements `reactiveOmit` via `toRefs(obj)` and those wrappers are used in the admin participants render path.

Required repo validation passed after the fix: `bun run lint`, `bun run typecheck`, and `bun run test:unit`.

Attempted authenticated runtime verification with the local BDD Auth0 flow, but the login redirects to `http://localhost:3000/account/dashboard`, which is currently a missing route, so I could not reach the authenticated admin operations page to re-observe the warnings directly.
<!-- SECTION:NOTES:END -->

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
