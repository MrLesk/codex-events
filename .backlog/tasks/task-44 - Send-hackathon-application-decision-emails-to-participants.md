---
id: TASK-44
title: Send hackathon application decision emails to participants
status: Done
assignee: []
created_date: '2026-03-27 19:46'
updated_date: '2026-03-27 19:55'
labels: []
dependencies: []
priority: high
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Participants receive an email notification when a hackathon admin approves or rejects their application, using Resend-backed delivery integrated into the existing application review workflow.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Approving a submitted user application triggers a participant-facing acceptance email for the applicant
- [x] #2 Rejecting a submitted user application triggers a participant-facing rejection email for the applicant
- [x] #3 Application review API actions remain successful even when outbound email delivery is unavailable, and the delivery outcome is captured for operations
- [x] #4 Resend configuration for local and deployed environments is documented in repository operator docs
- [x] #5 Unit and integration tests cover decision-email trigger behavior for both approval and rejection paths
<!-- AC:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Implemented first-pass Resend integration for hackathon application review notifications.

What shipped:
- Added `resend` SDK dependency and runtime config wiring (`runtimeConfig.resend`) with `.env.example` variables.
- Added `server/utils/application-review-emails.ts` to centralize decision-email composition and delivery through Resend, including idempotency keys and delivery result classification (`sent`, `failed`, `skipped`).
- Wired approval/rejection handlers to attempt participant-facing email delivery after application status updates and to persist email-attempt outcomes in `audit_logs` (`user_application.review_email_attempted`).
- Updated canonical/operator docs (`docs/domain-model.md`, `docs/api-surface.md`, `docs/tech-stack.md`, `README.md`) to reflect participant decision-email behavior and Resend configuration.
- Added unit tests for email utility behavior and integration tests for approve/reject email dispatch plus non-blocking review behavior when delivery fails.

Validation:
- `bun run test:unit` passed.
- `bun run test:integration` passed.
- `bun run typecheck` passed.
- `bun run lint` completed with existing unrelated Vue warnings (`vue/no-v-html`) and no new errors.

Risks / follow-up:
- Delivery is currently inline best-effort from review routes. Moving delivery to a queue-backed outbox would improve retry behavior at higher scale and under provider outages.
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
