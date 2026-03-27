---
id: TASK-45
title: Unify hackathon create/edit configuration pages behind one shared component
status: Done
assignee: []
created_date: '2026-03-27 19:49'
updated_date: '2026-03-27 20:24'
labels:
  - frontend
  - admin
  - ui
dependencies: []
references:
  - app/pages/admin/hackathons/new.vue
  - 'app/pages/account/hackathons/[slug]/admin/index.vue'
  - app/components/admin/HackathonConfigForm.vue
  - app/utils/admin-workspace.ts
priority: high
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Refactor the hackathon create page (`/admin/hackathons/new`) and edit settings page (`/account/hackathons/:slug/admin`) to use a single shared create/edit configuration component. Edit mode must prefill from existing hackathon data and submit an update mutation; create mode starts from empty defaults and submits create mutation. Keep existing API behavior and permissions unchanged.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Both create and edit pages render the same shared create/edit configuration component
- [x] #2 Edit mode preloads form fields from the current hackathon and submits PATCH updates
- [x] #3 Create mode uses empty defaults and submits POST create
- [x] #4 Existing image upload/remove wiring remains functional in edit mode
- [x] #5 Validation commands run locally with at least bun run test:unit and any gaps are reported
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Complexity classification: L2 (cross-page refactor of admin create/edit config flow).

Analog patterns used:
- Existing admin `Panel` naming and composition under `app/components/admin/**`.
- Existing `HackathonConfigForm` as canonical field/validation surface.
- Existing create/edit API payload mapping in page-level submit handlers.

Implemented by introducing a shared wrapper component `app/components/admin/AdminHackathonCreateEditForm.vue` that owns create/edit form state, optional slug auto-generation, edit-prefill hydration from `initialHackathon`, and forwards image/upload/remove events.

Both pages now use the same shared component:
- `app/pages/admin/hackathons/new.vue` uses create mode with `autoGenerateSlug=true` and create submit handler.
- `app/pages/account/hackathons/[slug]/admin/index.vue` uses edit mode with `initialHackathon=currentHackathon` and update submit handler.

Edit page no longer keeps a second local config-form state and no longer duplicates config hydration logic.

Follow-up fix after QA: `AdminHackathonCreateEditForm` explicitly imports `HackathonConfigForm` to avoid runtime component-resolution failure on `/admin/hackathons/new`.

Added `app/middleware/require-platform-admin.ts` and switched `app/pages/admin/hackathons/new.vue` to this middleware so non-platform-admin actors are redirected before page content renders.

Content polish follow-up on `/admin/hackathons/new`: rewrote create-page and shared form copy to operator-facing language and removed internal implementation wording (e.g., canonical/backend/lifecycle model phrasing) from the create flow.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Refactored hackathon create/edit configuration to a single shared component.

What changed:
- Added `app/components/admin/AdminHackathonCreateEditForm.vue` as the shared create/edit wrapper around `HackathonConfigForm`.
- Updated `app/pages/admin/hackathons/new.vue` to use this shared component in create mode (`autoGenerateSlug=true`).
- Updated `app/pages/account/hackathons/[slug]/admin/index.vue` to use the same shared component in edit mode via `initialHackathon` prefill.
- Removed duplicated form-state initialization and hydration logic from the edit page.

Behavior preserved:
- Create still POSTs to `/api/hackathons` with the same payload shape.
- Edit still PATCHes `/api/hackathons/:hackathonId` with the same payload mapping.
- Image upload/remove wiring remains functional in edit mode.

Validation run:
- `bunx eslint app/components/admin/AdminHackathonCreateEditForm.vue app/pages/admin/hackathons/new.vue app/pages/account/hackathons/[slug]/admin/index.vue`
- `bun run typecheck`
- `bun run test:unit`

Canonical docs were confirmed unchanged for this refactor.

QA follow-up addressed two issues reported on `/admin/hackathons/new`:

1) Form not rendering: fixed by explicitly importing `HackathonConfigForm` in `AdminHackathonCreateEditForm.vue`. Browser console warning `Failed to resolve component: HackathonConfigForm` is resolved.

2) Access behavior: route now uses new `require-platform-admin` middleware, so non-platform-admin actors are redirected without seeing create-page content.

Copy update: create-page and config-form instructional text now uses external operator language and no longer references internal documentation concepts.
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
