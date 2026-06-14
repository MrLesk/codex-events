---
id: TASK-400
title: Add LinkedIn profile action to certificates
status: Done
assignee:
  - '@codex'
created_date: '2026-06-14 16:08'
updated_date: '2026-06-14 16:17'
labels: []
dependencies: []
modified_files:
  - 'app/pages/events/[slug]/[userId].vue'
  - shared/domains/events/certificates.ts
  - tests/unit/shared/domains/events/certificates.test.ts
priority: low
ordinal: 79000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Certificate viewers can open LinkedIn's Add to Profile flow from a public certificate page. The action should match the existing certificate controls and pass Codex Community Events as the issuing organization.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Desktop certificate pages show an Add to LinkedIn action immediately after the Image download action.
- [x] #2 Mobile certificate pages show the LinkedIn action as an icon-only control with an accessible label.
- [x] #3 The LinkedIn URL includes the certificate name, Codex Community Events issuing organization, issue month/year, credential ID, and certificate URL.
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Locate the public certificate page action row and existing certificate metadata helpers.
2. Add a derived LinkedIn Add-to-Profile URL using the current certificate data.
3. Insert the new action after the Image download control with responsive label behavior matching the existing buttons.
4. Run lint, typecheck, and unit tests before finalizing.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Implemented the certificate Add to LinkedIn action after the Image download action. The URL is built through a shared certificate helper so the certificate name, Codex Community Events issuer, issue month/year, credential ID, and certificate URL are covered by unit tests. Browser smoke check on localhost confirmed desktop action order and mobile icon-only rendering.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Added an Add to LinkedIn action to public certificate pages and covered the Add-to-Profile URL builder with a unit test. Verified with lint, typecheck, unit tests, and a local desktop/mobile browser smoke check.
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
