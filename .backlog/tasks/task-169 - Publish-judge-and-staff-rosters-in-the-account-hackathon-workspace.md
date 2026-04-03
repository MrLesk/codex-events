---
id: TASK-169
title: Publish judge and staff rosters in the account hackathon workspace
status: Done
assignee:
  - Codex
created_date: '2026-04-03 18:35'
updated_date: '2026-04-03 19:01'
labels: []
dependencies: []
references:
  - 'app/pages/account/hackathons/[slug]/index.vue'
  - 'server/api/hackathons/[hackathonId]/roles/index.get.ts'
documentation:
  - docs/domain-model.md
  - docs/api-surface.md
  - docs/permissions-matrix.md
  - docs/design-reference.md
priority: high
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Replace the current placeholder judge and staff tabs in `/account/hackathons/:slug` with published roster data for authenticated workspace users. The published roster must expose only the intended public card fields for each assigned judge or staff member and must not reuse the admin-only role-assignment payload shape.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Canonical docs define judge and staff roster visibility for the account hackathon workspace, including the redacted published fields, optional public social links, and actor access rules.
- [x] #2 Authenticated users who can access `/account/hackathons/:slug` can load judge and staff roster data for that hackathon without receiving admin-only role-assignment fields such as email, platform-admin metadata, ChatGPT email, OpenAI org ID, or Luma data.
- [x] #3 The Judges and Staff tabs render roster cards using profile picture, full name, company, bio, and optional X, LinkedIn, and GitHub links, and show an appropriate empty state when no roster members are assigned.
- [x] #4 Automated tests cover the roster endpoint visibility and redacted response shape plus the workspace rendering or helper logic for the published roster tabs.
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Update the canonical docs to define account-workspace judge and staff roster visibility, including the published field set and actor access rules.
2. Add dedicated published roster read endpoints for judges and staff. Derive roster membership from the canonical role-assignment rules so explicit judges/staff and admin assignments with the corresponding capability flag appear in the matching roster.
3. Add a shared server-side account-workspace access check and extend hackathon-scoped profile-icon reads so published roster avatars work for visible roster members without exposing unrelated accounts.
4. Replace the placeholder Judges and Staff tab content with a shared published-roster panel that fetches the new endpoints and renders cards with avatar, full name, company, bio, and optional X, LinkedIn, and GitHub links. Keep the admin role-management panel unchanged for admins.
5. Add or update automated tests for endpoint visibility, redacted payload shape, and the roster-rendering helper or component behavior. Run `bun run lint`, `bun run typecheck`, and `bun run test:unit` before handoff.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
User approved implementation and requested optional X, LinkedIn, and GitHub links on published judge/staff cards, matching the public-social treatment already used in participant admin cards.

Implemented published judge and staff roster docs plus dedicated read endpoints at `/api/hackathons/:hackathonId/judges` and `/api/hackathons/:hackathonId/staff` with a redacted payload shape derived from canonical role-assignment rules.

Added `requireHackathonWorkspaceAccess` so roster reads are limited to authenticated workspace users and extended hackathon-scoped profile icon reads so roster-member avatars work without exposing unrelated accounts.

Replaced the non-admin Judges and Staff placeholder panels with a shared published roster panel that renders avatar, full name, company, bio, and optional X, LinkedIn, and GitHub links.

Validation: `bun run lint`, `bun run typecheck`, `bun run test:unit`, and `bun run test:integration -- tests/integration/server/api/hackathon-routes.test.ts tests/integration/server/api/actor-platform-routes.test.ts` all passed.

Follow-up UI polish aligned the admin Judges, Staff, and Admins roster cards to the tighter shared card spacing and added the header divider treatment to both the admin and published roster panels so the tabs match the rest of the account workspace.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Published the judge and staff rosters in the account hackathon workspace and made the behavior canonical in the docs. The docs now define account-workspace roster visibility, the published field set, and the new roster endpoints, while the schema outline records the judge and staff rosters as derived views.

On the backend, I added dedicated roster reads for `/api/hackathons/:hackathonId/judges` and `/api/hackathons/:hackathonId/staff` that derive membership from the existing role-assignment model, including admin assignments with judging or staff capability enabled. The response shape is redacted to roster-card fields only. I also added a shared workspace-access guard and extended hackathon-scoped profile-icon reads so workspace users can load published roster avatars for visible judges and staff without gaining access to unrelated account images.

On the frontend, I replaced the non-admin placeholder Judges and Staff tab content with a shared published roster panel that renders avatar, full name, company, bio, and optional X, LinkedIn, and GitHub links. Admins still retain the existing role-management panel in those tabs.

Tests updated: unit coverage for the published-roster helpers on both server and client, integration coverage for roster endpoint visibility and redacted payloads, and integration coverage for the published-roster avatar path. Validation passed with `bun run lint`, `bun run typecheck`, `bun run test:unit`, and targeted integration runs for the affected route suites.

Follow-up polish aligned the admin role-roster cards with the tighter shared card spacing and added the same subtitle divider treatment to the published roster panels so Judges and Staff match the rest of the workspace tabs.
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
