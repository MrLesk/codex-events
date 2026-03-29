---
id: TASK-75
title: Make hackathon Luma event URL configurable by admins
status: Done
assignee:
  - '@codex'
created_date: '2026-03-29 14:13'
updated_date: '2026-03-29 14:31'
labels: []
dependencies: []
documentation:
  - docs/domain-model.md
  - docs/api-surface.md
  - docs/schema-outline.md
priority: high
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Canonical docs already define an optional hackathon Luma event URL, and the backend serialization already exposes `lumaEventUrl`, but the shared admin hackathon configuration form does not carry or render that field. As a result, platform admins creating a hackathon and hackathon admins editing the account-scoped settings tab cannot set or update the Luma event URL even though participant-facing flows already depend on it for Luma-related requirements and presentation.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Admins can enter and edit a hackathon Luma event URL from the shared hackathon configuration form used by both create and account-scoped settings surfaces
- [x] #2 Creating or updating a hackathon persists the Luma event URL and returns it in the admin workspace payload so reopening the form shows the saved value
- [x] #3 The admin configuration form treats the Luma event URL as optional but validates non-empty values as valid http or https URLs
- [x] #4 Targeted automated coverage is updated for the affected form-state and API behavior
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Add `lumaEventUrl` to the shared admin hackathon form types, default state, record mapping, and form schema using the existing optional http/https URL validation pattern.
2. Expose a `Luma event URL` input in `HackathonConfigForm` and thread the value through both hackathon create and account-scoped settings update payloads.
3. Update targeted unit and integration coverage for admin form-state mapping and hackathon create/update persistence, then run `bun run test:unit` and the focused hackathon route integration tests.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
User requested the `Luma event URL` input in the Basic Information section directly below the slug rather than in Participation Rules.

Implemented the shared admin hackathon form path for `lumaEventUrl`, including typed form state, client validation, create/update payload normalization to `null` when blank, and the Basic Information field placement directly below slug per user request.

Aligned server-side hackathon create/update validation for `lumaEventUrl` to require `http` or `https` URLs so the API matches the admin form behavior.

Validation results: `bun run test:unit` passed (41 files, 197 tests), `bun run test:integration -- tests/integration/server/api/hackathon-routes.test.ts` passed (1 file, 16 tests), `bun run typecheck` passed, and `bun run lint` passed with 4 pre-existing `vue/no-v-html` warnings in unrelated legal-content pages.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Added end-to-end admin support for the optional hackathon `lumaEventUrl` that is already part of the canonical product model and serialized hackathon payloads. The shared admin hackathon form now includes a `Luma event URL` field in Basic Information below the slug, the shared admin form state rehydrates the saved value, and both the platform-admin create flow and the account-scoped hackathon settings save flow now send the value as a normalized optional field.

On the backend, hackathon create/update validation now accepts `lumaEventUrl` and restricts it to `http`/`https` URLs so the API contract matches the frontend validation. Targeted coverage was updated in the admin workspace form-state mapper, the hackathon route integration tests now assert create/update persistence and response serialization, and unit schema coverage verifies that the admin form allows an empty value but rejects non-web protocols.

Validation run:
- `bun run test:unit`
- `bun run test:integration -- tests/integration/server/api/hackathon-routes.test.ts`
- `bun run typecheck`
- `bun run lint` (passed with four unrelated existing `vue/no-v-html` warnings in legal-content pages)
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
