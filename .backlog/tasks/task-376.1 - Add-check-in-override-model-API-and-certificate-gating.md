---
id: TASK-376.1
title: Add check-in override model, API, and certificate gating
status: Done
assignee: []
created_date: '2026-06-10 07:30'
updated_date: '2026-06-10 08:40'
labels:
  - api
  - db
  - admin
  - events
dependencies: []
milestone: m-2
priority: high
parent_task_id: TASK-376
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Store an admin check-in override on user applications (joined or not joined, with the acting admin and time), expose it through admin application reads, add the event-admin action that sets, switches, or toggle-clears the override with audit logging, and resolve certificate availability plus participant workspace state from effective attendance: the override when present, otherwise the Luma check-in. Restoring a withdrawn application clears the override together with the other check-in fields.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria

<!-- AC:BEGIN -->
- [x] #1 Schema and migration add override status, time, and acting admin to user applications.
- [x] #2 Override action API enforces event admin or platform admin access, allows only approved applications, toggles the active state back to the Luma default, and writes audit entries.
- [x] #3 Effective attendance drives public certificate eligibility and the own-participation workspace state.
- [x] #4 Canonical docs and integration coverage describe the override model.
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Override is stored on user_applications (status, time, acting admin) via handwritten migration 0059 following the repository convention of hand-authored migration SQL. The Luma webhook stays untouched; precedence is resolved at read time through the shared effective-attendance helper used by the certificate domain, own-participation reads, and admin records. Restore-withdrawal clears override fields.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Added check_in_override_status/at/by_user_id to user applications, the override-check-in admin action with toggle-clear semantics, 409 for non-approved applications and audit logging, the shared isApplicationEffectivelyCheckedIn helper, and effective-attendance gating for public certificate reads and the workspace certificate panel. Covered by new integration tests for the action (authz, toggle, Luma interplay) and certificate eligibility, plus unit tests for the helper.
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
