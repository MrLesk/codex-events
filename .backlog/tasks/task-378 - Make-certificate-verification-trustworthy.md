---
id: TASK-378
title: Make certificate verification trustworthy
status: Done
assignee: []
created_date: '2026-06-10 07:30'
updated_date: '2026-06-10 09:05'
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
- [x] #1 Certificate PDF renders a scannable QR code pointing at the public certificate URL.
- [x] #2 Page footer copy presents the page as the live verification record without referencing a lookup that does not exist.
- [x] #3 Certificate page embeds JSON-LD structured data for the credential.
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
The QR code is drawn natively into the PDF as vector rectangles with qrcode-generator (pure JS, worker-safe), on a white plate with a quiet zone for scannability against the dark page. Structured data uses schema.org EducationalOccupationalCredential with the event as the subject; angle brackets are escaped to keep the inline JSON-LD script injection-safe.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
The certificate PDF now carries a vector QR code that resolves to the live certificate page, the page footer states that the page itself is the live verification record for the certificate ID instead of referencing a lookup that does not exist, and the page embeds schema.org JSON-LD describing the credential, the event, and the issuer. Verified by rendering a sample PDF and checking the SSR HTML for the structured data script. Risks/follow-ups: certificate IDs remain readable rather than unique, so verification authority stays with the URL, which the copy now reflects.
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
