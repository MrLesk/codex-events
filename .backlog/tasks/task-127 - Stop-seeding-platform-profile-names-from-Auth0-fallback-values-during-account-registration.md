---
id: TASK-127
title: >-
  Stop seeding platform profile names from Auth0 fallback values during account
  registration
status: Done
assignee:
  - '@Codex'
created_date: '2026-03-30 21:19'
updated_date: '2026-03-30 21:23'
labels:
  - auth
  - account
  - onboarding
dependencies: []
documentation:
  - docs/domain-model.md
  - docs/schema-outline.md
  - docs/api-surface.md
priority: high
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
New platform-account registration currently derives canonical firstName and familyName from Auth0 session claims in priority order name -> nickname -> email, then falls back to 'User' for a missing family name. This causes newly registered users to end up with fabricated profile names such as an email address in firstName or a synthetic 'User' family name. Change registration so canonical profile names are not guessed from Auth0 fallback values. Keep the account flow usable after registration and preserve a sensible non-empty presentation label for surfaces that display a user before profile completion.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 POST /api/account/registration no longer derives canonical firstName or familyName from Auth0 name, nickname, or email fallback values.
- [x] #2 A newly registered platform account can persist blank canonical firstName and familyName values without breaking account, session, or participant-facing flows that rely on a presentation label.
- [x] #3 Canonical docs and automated tests reflect the new registration-name behavior and the expected presentation-name fallback.
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Update platform-account registration in server/utils/account-management.ts so registration leaves canonical firstName and familyName blank while still producing a non-empty displayName fallback for presentation-only surfaces.
2. Confirm session and account-facing UI consumers continue to render safely with blank canonical names, relying on existing displayName fallbacks where needed instead of adding new compatibility layers.
3. Update canonical docs in docs/domain-model.md, docs/schema-outline.md, and docs/api-surface.md to state that canonical name fields can start blank after account registration and are completed through profile/application flows.
4. Update automated coverage in tests/integration/server/api/actor-platform-routes.test.ts and any directly affected unit tests, then run bun run lint, bun run typecheck, and bun run test:unit.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
User approved implementation on 2026-03-30. Scope is limited to stopping fabricated canonical names at registration while preserving a non-empty presentation label.

Updated platform-account registration to persist blank canonical firstName and familyName values while keeping displayName non-empty from Auth0 name, nickname, or email fallback data. Updated canonical docs and registration integration coverage for the new contract. Validation: bunx vitest run --config vitest.integration.config.ts tests/integration/server/api/actor-platform-routes.test.ts, bun run lint, bun run typecheck, bun run test:unit.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Stopped platform-account registration from inventing canonical profile names from Auth0 fallback values. Registration now stores blank firstName and familyName values and keeps displayName as the initial presentation label from the authenticated identity so account, session, and participant-facing surfaces still have a non-empty name to render before profile completion. Updated the canonical User-model docs and account API docs to reflect blank canonical names after registration, and expanded the actor-platform integration coverage to verify both named and email-only registration paths. Validation passed with the focused actor-platform integration suite plus bun run lint, bun run typecheck, and bun run test:unit.
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
