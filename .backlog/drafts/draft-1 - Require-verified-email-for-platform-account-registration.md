---
id: DRAFT-1
title: Require verified email for platform account registration
status: Draft
assignee: []
created_date: '2026-03-30 15:59'
updated_date: '2026-03-30 16:22'
labels:
  - security
  - auth
  - deferred
dependencies: []
references:
  - server/utils/account-management.ts
  - server/auth/actor.ts
  - tests/integration/server/api/actor-platform-routes.test.ts
documentation:
  - docs/security-analysis.md
parent_task_id: TASK-115
priority: low
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Harden platform-account creation so identities without a verified email cannot create a platform account. This closes the registration gap identified in `docs/security-analysis.md` and aligns account creation with stronger identity proof requirements.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Platform account registration rejects identities whose email is missing or unverified
- [ ] #2 Verified users can still register and link accounts through the intended account-management flows
- [ ] #3 Automated tests cover verified and unverified registration behavior
- [ ] #4 Canonical documentation is updated if account-registration prerequisites change
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
2026-03-30: deferred from the active remediation pass at user request. Keep the issue tracked, but do not treat verified-email enforcement as current execution scope.
<!-- SECTION:NOTES:END -->

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
