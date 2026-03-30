---
id: TASK-120.4
title: Extend automated coverage for hackathon staff role behavior
status: Done
assignee:
  - '@codex'
created_date: '2026-03-30 16:56'
updated_date: '2026-03-30 18:05'
labels:
  - testing
  - roles
  - permissions
dependencies:
  - TASK-120.2
  - TASK-120.3
documentation:
  - docs/testing-strategy.md
  - docs/permissions-matrix.md
  - docs/api-surface.md
parent_task_id: TASK-120
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Update the automated test coverage and fixtures for the canonical `staff` role model. Add or adjust fixtures so staff-specific visibility, admin-only restrictions, and admin-plus-staff or admin-plus-judge combinations are validated consistently across unit, integration, and BDD coverage where actor-facing behavior changes.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Test fixtures include the role combinations needed to exercise staff-only and admin-plus-staff behavior.
- [x] #2 Automated coverage verifies that staff can read the intended participant and team data but cannot perform admin actions.
- [x] #3 Automated coverage verifies that non-admin staff and judges remain distinct while admin-only combinations continue to work.
- [x] #4 Any practical test gaps are documented in the owning task summary if they cannot be covered immediately.
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Starting TASK-120.4 after TASK-120.3 validation passed. Next step is a coverage audit across backend and frontend staff-role behavior to confirm whether any actor-path or route-guard gaps remain beyond the tests already added in TASK-120.2 and TASK-120.3.

Starting TASK-120.4 after backend and frontend implementation. Next step is to inventory what staff-role coverage already landed across unit and integration tests, then add only the missing actor-matrix automation that still materially reduces regression risk.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Audited the current staff-role automation across backend, frontend, and BDD surfaces and tightened the remaining low-cost frontend guard coverage. The repository now covers the canonical staff matrix through backend unit/integration tests (role invariants, auth resolution, application visibility, team visibility, role-management writes, and admin-plus-staff/admin-plus-judge combinations) plus frontend unit coverage for tab availability, shell navigation, judging capability filters, roster behavior, and staff-enabled route access. Added an explicit navigation-guard unit test to verify that staff-enabled hackathon admins satisfy `['staff']` route checks without receiving broader admin navigation. Validation passed with `bun run lint` (existing `vue/no-v-html` warnings only), `bun run typecheck`, and `bun run test:unit`. I also ran `bun run test:integration`; it failed in unrelated Miniflare/D1 harness setup with `EADDRNOTAVAIL` during pre-existing `hackathon-admin-routes`, `outcome-routes`, and `submission-routes` suites, not in the staff-role assertions themselves. The practical remaining gap is still the dedicated Auth0-backed BDD staff flow: the canonical docs call for a stable `staff` persona, but the current BDD persona/bootstrap support does not yet provision one, so staff internal-visibility browser coverage continues to rely on the unit and integration layers. That gap is now documented here rather than implied away.
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
