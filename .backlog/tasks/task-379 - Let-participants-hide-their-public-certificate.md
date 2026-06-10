---
id: TASK-379
title: Let participants hide their public certificate
status: To Do
assignee: []
created_date: '2026-06-10 07:30'
updated_date: '2026-06-10 07:30'
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
- [ ] #1 User applications record when the participant hid the certificate, and hiding or re-publishing is a participant-owned API action on their own application.
- [ ] #2 Hidden certificates return not found on all public certificate reads.
- [ ] #3 The workspace certificate panel offers the hide / make-public toggle with clear state.
- [ ] #4 The admin Certificates tab indicates hidden certificates.
- [ ] #5 Docs and tests cover the visibility rule.
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
<!-- SECTION:FINAL_SUMMARY:END -->

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
