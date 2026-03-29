---
id: TASK-103
title: Fix CI trailing-comma lint failure in hackathon participation card
status: Done
assignee: []
created_date: '2026-03-29 19:13'
updated_date: '2026-03-29 19:14'
labels:
  - ci
  - lint
  - ui
dependencies: []
references:
  - >-
    https://github.com/MrLesk/codex-hackathons/actions/runs/23716856328/job/69085255283
  - >-
    /Users/alex/projects/codex-hackathons/app/components/hackathons/HackathonParticipationCard.vue
priority: high
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Resolve the next blocking GitHub Actions lint failure after the previous CI fix. The referenced Actions run now fails in `backend-checks / Lint` on a trailing-comma violation in `app/components/hackathons/HackathonParticipationCard.vue`; remove that regression and verify the same local validation path used by CI.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 The blocking lint error in `app/components/hackathons/HackathonParticipationCard.vue` is resolved locally.
- [x] #2 Relevant local validation for the CI path passes.
- [x] #3 The task records the root cause and validation performed.
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
The referenced GitHub Actions run `23716856328` failed only in `backend-checks / Lint` on commit `7f560aa80ff61059072bd11a57b645bdfab060cb`. The blocking error was `@stylistic/comma-dangle` in `app/components/hackathons/HackathonParticipationCard.vue:9` caused by a trailing comma in the import list. Canonical docs were confirmed unchanged because this is a lint-only fix.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Inspected the new failing Actions job `69085255283` and confirmed the previous admin-operations lint regression was no longer the blocker. The current failure was a trailing comma in the import list of `app/components/hackathons/HackathonParticipationCard.vue`, which violated the repo's `@stylistic/comma-dangle` settings. Removed that trailing comma and validated locally with `bun run lint`, `bun run test:unit`, and `bun run typecheck`. Residual note: the repo still emits the existing `vue/no-v-html` warnings during lint, but they are warnings only and not CI-blocking.
<!-- SECTION:FINAL_SUMMARY:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [x] #1 Canonical docs were updated or confirmed unchanged
- [x] #2 Code behavior matches canonical docs
- [x] #3 Relevant validation commands pass
- [ ] #4 Tests were added or updated when behavior changed
- [x] #5 Test gaps are documented when automation is not practical
- [ ] #6 Config and developer workflow docs were updated when setup changed
- [x] #7 Auth and permissions changes follow the documented platform model
- [x] #8 Risks and follow ups are recorded in the task summary
<!-- DOD:END -->
