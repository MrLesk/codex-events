---
id: TASK-27
title: Add user-managed profile icon upload in account settings and header display
status: Done
assignee:
  - '@codex'
created_date: '2026-03-26 20:03'
updated_date: '2026-03-26 20:13'
labels: []
dependencies: []
priority: high
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Implement profile icon upload/replacement/removal for platform users. Store icon in R2, expose account profile-icon APIs, persist icon version metadata on user, display icon in account settings and header user menu, and keep generic-icon fallback when no uploaded icon exists.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Platform users can upload JPEG/PNG/WebP profile icons up to 1MB from account settings.
- [ ] #2 Platform users can remove their uploaded profile icon and return to fallback behavior.
- [ ] #3 Uploaded icon metadata is reflected in account/session actor payloads via profileIconUpdatedAt.
- [ ] #4 Header user menu and account settings preview use uploaded icon when available.
- [ ] #5 Account deletion flow removes profile icon object when present.
- [ ] #6 Docs and tests are updated for schema/API/runtime changes.
<!-- AC:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Implemented profile icon upload/replacement/removal for platform users with R2-backed storage and account-scoped APIs. Added users.profile_icon_updated_at schema field and migration, session/account serialization support, account deletion icon cleanup, and header/account-settings UI usage with generic fallback icon behavior when no upload exists. Added integration coverage for profile-icon endpoints (success + validation guards) and unit coverage for profile-icon utility validation and schema/account patch updates. Updated canonical docs (domain model, schema outline, API surface) and runtime/developer config docs for PROFILE_ICONS binding. Validation run: bun run lint, bun run typecheck, targeted unit tests, targeted integration test file tests/integration/server/api/actor-platform-routes.test.ts. Not run in this pass: full Auth0-backed BDD suite.
<!-- SECTION:FINAL_SUMMARY:END -->

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
