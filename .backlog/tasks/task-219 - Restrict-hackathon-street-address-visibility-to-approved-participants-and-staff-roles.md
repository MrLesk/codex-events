---
id: TASK-219
title: >-
  Restrict hackathon street address visibility to approved participants and
  staff roles
status: Done
assignee:
  - codex
created_date: '2026-04-14 17:44'
updated_date: '2026-04-14 18:02'
labels:
  - feature
  - hackathons
  - privacy
dependencies: []
priority: medium
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Update hackathon address visibility so the street address is hidden from public visitors and non-approved workspace users, while remaining visible on hackathon pages for approved participants, judges, staff, hackathon admins, and platform admins.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Public hackathon APIs and public hackathon pages do not expose the street address.
- [x] #2 Account-scoped hackathon detail responses expose the street address only to approved participants and to judges, staff, hackathon admins, and platform admins.
- [x] #3 Non-approved workspace users do not see the street address on the account hackathon page.
- [x] #4 Canonical docs and relevant automated tests are updated for the new address visibility rule.
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Update the canonical docs to state that street address visibility is restricted to approved participants plus judges, staff, hackathon admins, and platform admins.
2. Reuse the existing restricted-detail visibility logic from the Discord-link work so internal hackathon detail routes gate the address server-side instead of relying on UI-only hiding.
3. Hide address from public serializers and public page rendering while keeping city and country visible.
4. Sanitize account/workspace response paths used by the account hackathon page so non-approved workspace users receive no street address.
5. Update unit and integration coverage for public detail, account detail, and any changed serializer behavior, then rerun lint, typecheck, unit tests, and targeted integration tests.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
User clarified the address rule after the Discord-link change: keep street address visible for approved participants plus judges, staff, and admins, but hide it from public visitors and non-approved workspace users.

Restricted hackathon street address visibility server-side using the same approved-participant or explicit-role rule as the private Discord link. Public serializers now suppress address, account/workspace detail routes return address only to approved participants or judges/staff/admins, and the account summary endpoint hides it for non-approved users without staff roles.

Validation passed: bun run lint, bun run typecheck, bun run test:unit, and bun run test:integration -- tests/integration/server/api/hackathon-routes.test.ts tests/integration/server/api/actor-platform-routes.test.ts.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Restricted hackathon street address visibility to the same account-scoped audience as the private Discord link. Public hackathon serializers now return an empty address, caller-visible hackathon detail routes gate both address and discord server URL server-side for approved participants plus judges, staff, hackathon admins, and platform admins, and the account hackathons summary endpoint suppresses address for non-approved users without staff access. Updated the account Details tab to show the address row for eligible judges/staff/admins as well as approved participants, and removed the timeline location-row fallback that could reintroduce the street address when the field was hidden. Updated canonical docs and added unit/integration coverage for public detail, internal detail, and account summary visibility. Validation: bun run lint, bun run typecheck, bun run test:unit, bun run test:integration -- tests/integration/server/api/hackathon-routes.test.ts tests/integration/server/api/actor-platform-routes.test.ts.
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
