---
id: TASK-152
title: Add a draft publish action to the hackathon workspace and fix draft admin tabs
status: Done
assignee:
  - codex
created_date: '2026-04-01 21:58'
updated_date: '2026-04-01 22:05'
labels: []
dependencies: []
documentation:
  - docs/README.md
  - docs/domain-model.md
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Draft hackathons currently cannot be moved to `registration_open` from the admin UI because the lifecycle controls start only after registration is already open. At the same time, the draft account workspace uses an empty hackathon ID for several admin-facing tabs when the actor can see the draft through internal visibility but does not have an `account/hackathons` access record, causing judges, staff, and admins APIs to return 400 for draft pages such as `/account/hackathons/draft-managed-hackathon?tab=staff`. This work should add a proper draft publish action in the admin workspace and make draft admin tabs use the loaded hackathon ID consistently.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 The admin workspace exposes a draft lifecycle action that moves a hackathon from `draft` to `registration_open` from the UI.
- [x] #2 The draft publish action lives in the appropriate existing admin workspace area for lifecycle transitions and follows the existing server-side lifecycle and audit patterns.
- [x] #3 Judges, staff, and admins tabs on draft hackathons no longer call empty-ID APIs and load successfully for authorized internal actors.
- [x] #4 Related draft admin panels that depend on the hackathon ID use the correct loaded hackathon ID consistently.
- [x] #5 Automated tests cover the new draft lifecycle action and the draft admin-tab regression.
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Add a new hackathon lifecycle action for `draft -> registration_open` on the server, following the existing lifecycle endpoint and audit-log patterns.
2. Surface that action in the existing Operations lifecycle panel by extending the lifecycle control model with a draft publish action labeled for admins, rather than adding a separate control in Settings.
3. Update the account hackathon workspace page to use the loaded hackathon ID for admin and visibility panels that currently depend on `accessRecordId`, so draft pages do not issue empty-ID requests.
4. Add automated coverage for the new draft publish action and for draft workspace/admin-tab access using the correct hackathon ID.
5. Run lint, typecheck, unit tests, and targeted integration coverage for the changed routes.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Implemented the draft lifecycle transition as a first-class Operations action instead of Settings so lifecycle controls stay in one place. Added POST /api/hackathons/:hackathonId/actions/open-registration with the same admin and audit patterns used by the existing lifecycle endpoints.

Fixed the draft workspace ID bug by resolving a scoped hackathon ID from the loaded hackathon when no /api/account/hackathons access record exists. Judges, staff, admins, participant visibility, and team visibility panels now receive a real hackathon ID on draft pages.

Validation passed locally with bun run lint, bun run typecheck, bun run test:unit, and bun run test:integration -- tests/integration/server/api/hackathon-routes.test.ts. Manual Chrome verification on http://localhost:3000/account/hackathons/draft-managed-hackathon confirmed staff, judges, admins, and operations tabs load without 400 errors and the Open Registration action appears in Operations.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Added a draft publish flow to the admin hackathon workspace and fixed draft-only admin tabs that were issuing empty-ID role requests. The Operations panel now surfaces an `Open Registration` lifecycle action for draft hackathons, backed by a dedicated `POST /api/hackathons/:hackathonId/actions/open-registration` endpoint, matching the existing lifecycle permission and audit-log patterns. The action is guarded so admins can open registration only while the configured registration window is active.

The account hackathon workspace now resolves a scoped hackathon ID from the loaded hackathon record instead of assuming an `/api/account/hackathons` access record always exists. That removes the `/api/hackathons//roles` and `/api/hackathons//roles/candidates` failures on draft hackathons for authorized internal actors, and the same fix now applies consistently across judges, staff, admins, participant visibility, and team visibility panels.

Tests were added for the new lifecycle control logic, the server-side registration-opening guard, and the new API route. Existing workspace utility tests were extended to cover draft access without an account access record. Canonical docs were updated so the lifecycle model now states that admins manually move a hackathon from `draft` to `registration_open` within the configured registration window. Validation passed with `bun run lint`, `bun run typecheck`, `bun run test:unit`, and `bun run test:integration -- tests/integration/server/api/hackathon-routes.test.ts`. Manual browser verification confirmed the draft staff, judges, admins, and operations tabs now load correctly. Residual risk is limited to the existing unrelated local console warning about form fields missing `id` or `name` attributes.
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
