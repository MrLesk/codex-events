---
id: TASK-379
title: Let participants hide their public certificate
status: Done
assignee: []
created_date: '2026-06-10 07:30'
updated_date: '2026-06-10 09:20'
labels:
  - api
  - db
  - ui
  - events
dependencies: []
milestone: m-2
priority: high
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Participants control whether their certificate is publicly reachable. A participant can hide or re-publish their own certificate from the account event workspace; hidden certificates respond not found on the public page, JSON, image, and PDF reads, and the admin Certificates tab marks participants who hid their certificate.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria

<!-- AC:BEGIN -->
- [x] #1 User applications record when the participant hid the certificate, and hiding or re-publishing is a participant-owned API action on their own application.
- [x] #2 Hidden certificates return not found on all public certificate reads.
- [x] #3 The workspace certificate panel offers the hide / make-public toggle with clear state.
- [x] #4 The admin Certificates tab indicates hidden certificates.
- [x] #5 Docs and tests cover the visibility rule.
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Visibility is stored as certificate_hidden_at on the user application (migration 0060) and enforced inside the certificate read, so the page, JSON, image, and PDF all share one rule. The participant action follows the me/actions route pattern with audit logging, and hidden state flows through own-participation and admin application reads.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Participants can hide or re-publish their own certificate from the workspace certificate panel; hidden certificates respond not found on all public reads, the workspace explains the hidden state and hides the view link, and the admin Certificates tab shows a Hidden-by-participant badge and suppresses the certificate link. Covered by integration tests for the participant action (auth, ownership, approval guard, audit toggle) and public-read 404s. Risks/follow-ups: admins cannot override a participant's hide decision by design.
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
