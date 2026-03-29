---
id: TASK-89
title: Restore fixed toast positioning in the account shell
status: Done
assignee:
  - '@Codex'
created_date: '2026-03-29 16:36'
updated_date: '2026-03-29 16:38'
labels:
  - ui
  - bug
  - admin
dependencies: []
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Load the missing `vue-sonner` stylesheet so toast notifications render with their intended fixed positioning instead of participating in document flow. This prevents successful admin actions like Save Agenda from creating browser-level page overflow and a second vertical scrollbar beside the shell scroll region.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 The global toast container uses the intended fixed positioning from `vue-sonner` styling instead of static document flow.
- [x] #2 Saving agenda items no longer causes browser-level page overflow or a second vertical scrollbar beside the shell scroll region.
- [ ] #3 Relevant validation commands pass, and any remaining manual-only verification is documented if there is no existing automated UI harness for this toast behavior.
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Load the exported `vue-sonner/style.css` stylesheet from the app-wide CSS entry so the global toaster gets its intended fixed-position layout.
2. Verify in the browser that the toaster container is no longer static and that a toast no longer makes the document overflow when saving agenda items.
3. Run project validation and record the manual-browser verification because this repo does not currently have an automated UI harness for toast layout behavior.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Confirmed the regression came from the global `vue-sonner` toaster rendering as `position: static` because the library stylesheet was not loaded. In that state, successful saves inserted toast content into document flow and created browser-level page overflow beside the shell scroll region.

Loaded `vue-sonner/style.css` from the shared app stylesheet so the toaster returns to fixed positioning. Browser verification on the account hackathon Details tab now shows the `Agenda saved` toast while `documentElement.scrollHeight === clientHeight`, so only the intended shell scroll region remains.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Loaded the missing `vue-sonner/style.css` import in the shared app stylesheet so the global toast container uses the library’s fixed-position layout instead of participating in document flow. This fixes the account hackathon Details-tab regression where clicking `Save Agenda` could add a second browser scrollbar beside the shell’s existing scroll region.

Validation: browser verification on `http://localhost:3000/account/hackathons/codex-vienna-2026-04-18?tab=details` now shows the `Agenda saved` toast with the toaster at `position: fixed` and no document overflow. `bun run typecheck` and `bun run lint` passed; `bun run lint` still reports the existing `vue/no-v-html` warnings in the legal/static pages. `bun run test:unit` does not currently pass because of an unrelated existing failure in `tests/unit/app/utils/hackathon-role-roster.test.ts` asserting judge-roster behavior. There is no automated UI harness in this repo for toast layout behavior, so the toast-position/scrollbar fix is browser-verified.
<!-- SECTION:FINAL_SUMMARY:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [x] #1 Canonical docs were updated or confirmed unchanged
- [x] #2 Code behavior matches canonical docs
- [ ] #3 Relevant validation commands pass
- [ ] #4 Tests were added or updated when behavior changed
- [x] #5 Test gaps are documented when automation is not practical
- [x] #6 Config and developer workflow docs were updated when setup changed
- [x] #7 Auth and permissions changes follow the documented platform model
- [x] #8 Risks and follow ups are recorded in the task summary
<!-- DOD:END -->
