---
id: TASK-115
title: Remediate 2026-03-30 security review findings
status: In Progress
assignee: []
created_date: '2026-03-30 15:58'
updated_date: '2026-03-30 18:10'
labels:
  - security
dependencies: []
documentation:
  - docs/security-analysis.md
priority: high
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Track the remediation work identified in `docs/security-analysis.md` from the 2026-03-30 repository-wide security review. Scope includes the participant-visible team-data privacy leak, verified-email enforcement for platform account creation, internal-error response hardening, abuse controls for public contact and upload endpoints, upload validation hardening, baseline browser security headers, and runtime dependency remediation around vulnerable `h3`.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 All high and medium findings from `docs/security-analysis.md` are covered by child tasks with clear scope and acceptance criteria
- [ ] #2 Each child task includes the required validation, documentation, and test expectations for independent execution
- [ ] #3 This parent task remains the source of truth for the remediation set until all child tasks are done
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
2026-03-30: verified-email enforcement for platform account registration was explicitly deferred by the user. It remains tracked in DRAFT-1, but is not part of the immediate remediation pass.

2026-03-30: Active remediation implementation is now complete for the privacy leak, generic 500 handling, upload hardening, security headers, rate limiting, and the vulnerable h3 runtime dependency. Remaining open status is due to an unrelated `bun run test:unit` failure in `tests/unit/server/utils/hackathon-management.test.ts` caused by parallel changes outside the remediation files.

2026-03-30: Full repo validation for the implemented remediation batch now passes: `bun run lint` exits cleanly with the existing six `vue/no-v-html` warnings, `bun run typecheck` passes, and `bun run test:unit` passes.
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
