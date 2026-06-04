---
id: TASK-370
title: Group Luma sync settings in event admin form
status: Done
assignee:
  - '@Codex'
created_date: '2026-06-04 18:40'
labels:
  - luma
  - events
  - frontend
dependencies: []
documentation:
  - docs/domain-model.md
  - docs/api-surface.md
priority: medium
ordinal: 67000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Move event Luma sync configuration and the required Luma email registration requirement into one event-admin section controlled by an Enable Luma Sync checkbox.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Event admins see a dedicated Luma Sync section with a main Enable Luma Sync checkbox.
- [x] #2 Luma event API ID, Luma API key, webhook status, webhook URL, copy, and retry controls are shown only when Luma Sync is enabled.
- [x] #3 Enabling Luma Sync forces Luma email to be visible and required during registration.
- [x] #4 The Luma email requirement is shown inside the Luma Sync section as checked and not editable, with helper copy explaining that Luma email is needed to match users for sync.
- [x] #5 Luma email no longer appears as a normal editable row in the generic registration fields table.
<!-- AC:END -->

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

## Summary

- Added a Luma Sync section in the event admin form with an Enable Luma Sync checkbox, masked API key field, and non-editable required Luma email indicator.
- Removed Luma email from the generic registration field table and made new event defaults keep Luma email hidden unless sync is enabled.
- Updated canonical docs and validation coverage for complete Luma Sync configuration.

## Validation

- `bun run lint`
- `bun run typecheck`
- `bun run test:unit`
- `bun run test:integration`
- Browser check at `http://localhost:3100/admin/events/new` with saved platform-admin BDD session

`bun run test:bdd` reached 43 passing scenarios and failed two unrelated `admin-operations` scenarios. A separate subagent is fixing those unrelated failures.
