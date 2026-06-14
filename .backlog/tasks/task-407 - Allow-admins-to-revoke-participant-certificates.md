---
id: TASK-407
title: Allow admins to revoke participant certificates
status: Done
assignee:
  - '@codex'
created_date: '2026-06-14 18:36'
updated_date: '2026-06-14 18:46'
labels: []
dependencies: []
ordinal: 86000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Admins can revoke a participant certificate from the admin participants certificates tab when a checked-in participant should no longer receive a public certificate, such as after disqualification or misconduct. Revocation must remove public certificate access while preserving explicit admin control and audit-friendly state.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Admin certificates tab shows a revoke action only for participants who currently have certificate access
- [x] #2 Revoked participants no longer have public or owner certificate access, and verification routes treat the certificate as unavailable
- [x] #3 Admins can restore certificate access when the participant remains otherwise eligible
- [x] #4 Server authorization restricts revoke and restore actions to event admins or platform admins
- [x] #5 Tests cover eligibility, revocation, restoration, and unauthorized requests
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Confirm the canonical certificate and permission rules in docs and existing task/code context.
2. Add an explicit certificate revocation state to the server data model and eligibility checks.
3. Add admin revoke and restore API actions with authorization and validation.
4. Update the admin certificates tab using existing App/admin components.
5. Add or update tests for eligibility, API authorization, revocation, restoration, and certificate access.
6. Run required validation and finalize the task.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Discovery: certificates are derived from UserApplication/Event/User data; participant self-hiding uses user_applications.certificate_hidden_at and admin attendance override uses check_in_override_* fields. Implement revocation as separate application-level certificate_revoked_at/certificate_revoked_by_user_id state so attendance remains accurate and certificate access can be restored without changing check-in history.

Implemented certificate_revoked_at/certificate_revoked_by_user_id on UserApplication, admin set-certificate-revocation API, public/owner certificate gates, admin Certificates tab revoke/restore controls, canonical docs, unit/integration coverage, and BDD coverage for the admin certificates workflow. Validation passed: git diff --check, bun run lint, bun run typecheck, bun run test:unit, bun run test:integration, bun run test:bdd.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Added admin-managed certificate revocation and restoration from the Certificates tab. Revoked certificates are unavailable through public JSON/image/PDF reads and hidden from participant owner surfaces while preserving attendance state. Updated canonical docs and tests; lint, typecheck, unit, integration, and BDD validation passed.
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
