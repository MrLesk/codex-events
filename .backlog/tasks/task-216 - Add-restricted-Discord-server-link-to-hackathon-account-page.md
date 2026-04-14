---
id: TASK-216
title: Add restricted Discord server link to hackathon account page
status: Done
assignee:
  - codex
created_date: '2026-04-14 17:17'
updated_date: '2026-04-14 17:26'
labels:
  - feature
  - hackathons
  - account-workspace
dependencies: []
priority: medium
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Implement an optional hackathon Discord server link that can be configured by hackathon admins and shown only in the account-scoped hackathon details for approved participants and hackathon staff roles. Do not expose the Discord link on public hackathon pages or to non-approved workspace users.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Hackathon configuration supports an optional Discord server URL field that accepts http or https URLs.
- [x] #2 Hackathon create and update APIs persist the Discord server URL on the hackathon record.
- [x] #3 Public hackathon APIs do not expose the Discord server URL.
- [x] #4 Account-scoped hackathon detail responses expose the Discord server URL only to approved participants and to staff, judges, hackathon admins, and platform admins; all other callers receive null or no value.
- [x] #5 The account hackathon details page shows a Discord server link when the gated field is visible and configured.
- [x] #6 Canonical docs and relevant automated tests are updated for the new field and visibility rule.
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Add the optional Discord server URL field to the canonical docs, database schema, and shared hackathon validation/types using the existing optional URL pattern.
2. Persist the field through hackathon create and update flows and keep it excluded from public hackathon serializers.
3. Gate the field in account-scoped hackathon detail responses so only approved participants and hackathon staff roles receive the configured link.
4. Add the Discord link to the admin hackathon configuration form and show it on the account hackathon Details tab only when the gated value is present.
5. Update unit and integration tests for schema, validation, serializers, permissions, and account detail behavior.
6. Run bun run lint, bun run typecheck, and bun run test:unit before handoff.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
User approved the account-only implementation and requested stricter visibility: approved participants plus staff, judges, hackathon admins, and platform admins only.

Added a gated internal detail helper for hackathon Discord links so public serializers and non-approved workspace viewers never receive the configured URL.

Validated with `bun run lint`, `bun run typecheck`, `bun run test:unit`, and targeted `bun run test:integration -- tests/integration/server/api/hackathon-routes.test.ts tests/integration/server/database/migration.test.ts`.

Address visibility was not changed in this task; Discord is now stricter than the existing address exposure model.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Added an optional `discordServerUrl` hackathon field end to end for account-only use. Hackathon admins can now configure the link from the existing hackathon configuration form, and the account hackathon Details tab shows a Discord server row when the field is configured and visible.

Visibility is enforced server-side on internal hackathon detail responses instead of only in the UI. Public hackathon APIs never expose the Discord link, and internal detail reads return it only for approved participants plus judges, staff, hackathon admins, and platform admins. Non-approved workspace users and non-platform callers receive `null`.

The change includes the database schema and migration, docs updates in the canonical product/API/schema docs, UI wiring for create/edit/detail views, and automated coverage for schema, form validation, migration behavior, and the new route-gating rules. Validation run: `bun run lint`, `bun run typecheck`, `bun run test:unit`, and targeted `bun run test:integration -- tests/integration/server/api/hackathon-routes.test.ts tests/integration/server/database/migration.test.ts`.

Risk/follow-up: the existing address visibility model remains broader than this new Discord rule, so the two fields do not currently share one access policy.
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
