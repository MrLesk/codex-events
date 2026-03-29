---
id: TASK-90
title: >-
  Split account hackathon admin operations into Applications, Submissions, and
  Operations tabs
status: Done
assignee:
  - codex
created_date: '2026-03-29 16:55'
updated_date: '2026-03-29 17:00'
labels:
  - ux
  - admin-ui
dependencies: []
documentation:
  - docs/domain-model.md
  - docs/permissions-matrix.md
  - docs/api-surface.md
priority: high
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Update the account hackathon detail workspace so hackathon admins and platform admins see three separate admin-only top-level tabs instead of a single Operations tab. Preserve the existing participant and judge workspace behavior while regrouping the current admin surface so application review, submission and team intervention work, and operational lifecycle or competition controls each have a dedicated tab in the shared account hackathon detail page.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Hackathon admins and platform admins see Applications, Submissions, and Operations top-level tabs in the account hackathon detail workspace instead of the single Operations tab.
- [x] #2 Actors without admin capability do not see the admin-only Applications, Submissions, or Operations tabs, and existing non-admin tab availability remains unchanged.
- [x] #3 The current admin application review UI appears under Applications, the current team or submission operational UI appears under Submissions, and lifecycle or competition controls remain under Operations.
- [x] #4 Account workspace tab query handling continues to resolve to a valid visible tab for both admin and non-admin actors, including existing admin deep links.
- [x] #5 Unit coverage is updated for the tab-availability change and any new tab-query behavior introduced by the split.
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Update the shared account hackathon tab model so admin-only top-level tabs are `applications`, `submissions`, and `operations` instead of the single `operations` tab, while preserving the existing non-admin and judge tab availability.
2. Update the account hackathon detail page tab labels, tab-panel routing, and query resolution so admin deep links continue to land on a valid visible tab after the split.
3. Refactor the admin operations panel to support rendering only the application-review section, only the submission/team intervention section, or only the lifecycle section, so the page can place each existing admin workflow under its new dedicated tab without duplicating business logic.
4. Keep lifecycle and competition controls grouped under the `Operations` tab by rendering the lifecycle section alongside the existing competition panel there.
5. Update unit coverage for account hackathon tab availability and run targeted validation followed by `bun run test:unit`.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
User approved the three-way admin tab split: Applications | Submissions | Operations, visible only to hackathon admins and platform admins.

Confirmed canonical docs remain unchanged. The split is a workspace-UI regrouping only; domain model, permissions, and API surface stay the same.

Implemented the split by extending the shared account hackathon tab model with admin-only `applications` and `submissions` tabs, updating shell-navigation admin-tab detection, and redistributing the existing combined admin content across three tab panels in the shared account hackathon detail page.

Kept the existing admin operations data flow intact by adding a required `section` prop to `AccountHackathonAdminOperationsPanel` and rendering only the relevant section per tab, while leaving lifecycle plus competition controls under `Operations`.

Validation: `bun test tests/unit/app/utils/account-hackathon-tabs.test.ts tests/unit/app/utils/shell-navigation.test.ts`, `bun run test:unit`.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Split the account hackathon admin workspace so the previous single Operations tab now appears as three admin-only top-level tabs: Applications, Submissions, and Operations. The shared tab-access utility now exposes those tabs only for hackathon admins and platform admins, while participant and judge tab availability remains unchanged.

The account hackathon detail page now renders the existing admin workflows under dedicated tab panels: application review under Applications, team and submission operational work under Submissions, and lifecycle plus competition controls under Operations. To keep the change bounded, `AccountHackathonAdminOperationsPanel` retains its existing data-loading behavior and now accepts a required `section` prop so the page can render only the relevant admin slice per tab without duplicating the underlying business logic.

The sidebar routing behavior was updated so the new admin tabs still activate the admin shell navigation correctly, and unit coverage was updated for both tab availability and shell-navigation matching. Canonical docs were confirmed unchanged because this is a UI regrouping only.

Validation: `bun test tests/unit/app/utils/account-hackathon-tabs.test.ts tests/unit/app/utils/shell-navigation.test.ts`, `bun run test:unit`.

Risks / follow-up: the admin dashboard still deep-links to `?tab=operations`, which remains valid and intentional for backward compatibility of existing admin entry points. If you want a different default admin landing tab later, that should be a separate product choice.
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
