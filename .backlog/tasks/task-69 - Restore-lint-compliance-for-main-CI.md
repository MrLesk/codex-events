---
id: TASK-69
title: Restore lint compliance for main CI
status: Done
assignee:
  - '@codex'
created_date: '2026-03-28 23:56'
updated_date: '2026-03-28 23:57'
labels: []
dependencies: []
references:
  - .github/workflows/ci.yml
documentation:
  - AGENTS.md
priority: high
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Fix the lint violations currently breaking the `ci` workflow on `main` so backend checks can advance past the lint step again. Keep the scope focused on the actual lint blockers reported by GitHub Actions and local validation rather than unrelated workspace changes.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 `bun run lint` passes locally from the repository root
- [x] #2 The `ci` workflow blockers reported in the latest failed `main` run are resolved without changing unrelated product behavior
- [x] #3 Any tests or validation relevant to the touched files are rerun locally and recorded in the task summary
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Investigated the latest failed `ci` run on `main` with `gh run view` and confirmed the workflow was failing in `backend-checks -> Lint`. Applied ESLint auto-fixes to the Vue template files with indentation drift, then manually resolved the remaining blockers by renaming the unused workspace-tab constant to `_allWorkspaceTabs` and disabling `vue/multi-word-component-names` for the special Nuxt `error.vue` file. ESLint also reordered `nuxt.config.ts` keys during the auto-fix pass.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Restored lint compliance for the `ci` workflow on `main`.

What changed:
- Auto-fixed the large Vue template indentation drift in the admin hackathon operations, settings, competition, and judge panels.
- Resolved the unused workspace-tab constant warning in `app/pages/account/hackathons/[slug]/index.vue` by renaming it to `_allWorkspaceTabs`.
- Disabled `vue/multi-word-component-names` for the special Nuxt `error.vue` file.
- Accepted the ESLint auto-fix reordering in `nuxt.config.ts`.

Validation:
- `bun run lint` passed with warnings only.
- `bun run test:unit` passed.

Docs/config:
- Canonical docs were unchanged.
- No workflow documentation changes were required.

Risks/follow-ups:
- The legal/terms pages still emit `vue/no-v-html` warnings during lint; those are warnings only and were not part of the CI failure fixed here.
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
