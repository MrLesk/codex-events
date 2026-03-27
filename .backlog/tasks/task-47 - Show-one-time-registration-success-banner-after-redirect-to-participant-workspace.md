---
id: TASK-47
title: >-
  Show one-time registration success banner after redirect to participant
  workspace
status: Done
assignee: []
created_date: '2026-03-27 20:52'
updated_date: '2026-03-27 20:53'
labels:
  - participant-workspace
  - registration
  - ux
dependencies: []
priority: high
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
After a participant submits a registration application and is redirected from `/hackathons/[slug]/register` to `/account/hackathons/[slug]`, show a success banner on the destination page. The banner should be transient and disappear on browser refresh.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 After successful application submission, the participant workspace page shows a success alert above the pending-approval content.
- [x] #2 The success alert is shown only for the immediate post-submit navigation and does not persist after browser refresh.
- [x] #3 Existing pending-approval and application status UI remains unchanged.
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Implemented a one-time registration success notice using a redirect query flag and local flash state. On successful submit, the register page redirects to `/account/hackathons/[slug]?notice=application_submitted`. The participant workspace page initializes a local `showRegistrationSuccessNotice` ref from the query, renders a success `AppAlert`, and removes `notice` from the URL on mount via `navigateTo(..., { replace: true })` so refresh no longer shows the notice.

Validation run: `bun run typecheck` and `bun run test:unit` both pass.

Automation gap: no targeted component/e2e test currently covers this redirect-flash lifecycle; behavior was verified manually in browser (shows once after redirect, disappears on refresh).
<!-- SECTION:NOTES:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [x] #1 Canonical docs were updated or confirmed unchanged
- [x] #2 Code behavior matches canonical docs
- [x] #3 Relevant validation commands pass
- [ ] #4 Tests were added or updated when behavior changed
- [x] #5 Test gaps are documented when automation is not practical
- [ ] #6 Config and developer workflow docs were updated when setup changed
- [x] #7 Auth and permissions changes follow the documented platform model
- [x] #8 Risks and follow ups are recorded in the task summary
<!-- DOD:END -->
