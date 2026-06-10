---
id: TASK-378
title: Make certificate verification trustworthy
status: To Do
assignee: []
created_date: '2026-06-10 07:30'
updated_date: '2026-06-10 07:30'
labels:
  - api
  - ui
  - events
dependencies: []
milestone: m-2
priority: medium
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
The certificate PDF carries a QR code that resolves to the live certificate page, the page footer states truthfully that the page itself is the live verification record, and the page embeds schema.org structured data describing the credential so it is machine readable.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria

<!-- AC:BEGIN -->
- [ ] #1 Certificate PDF renders a scannable QR code pointing at the public certificate URL.
- [ ] #2 Page footer copy presents the page as the live verification record without referencing a lookup that does not exist.
- [ ] #3 Certificate page embeds JSON-LD structured data for the credential.
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
