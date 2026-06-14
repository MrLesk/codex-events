---
id: TASK-408
title: Surface duplicate or missing Luma email errors
status: Done
assignee:
  - '@codex'
created_date: '2026-06-14 20:13'
updated_date: '2026-06-14 20:19'
labels: []
dependencies: []
ordinal: 87000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Participants verifying a Luma email after approval should see actionable errors. Duplicate event Luma emails should be blocked before calling Luma, and Luma guest-not-found responses should not appear as a transient production issue.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Verification rejects a Luma email already used by another participant in the same event with an actionable conflict error.
- [x] #2 Luma guest-not-found lookup responses return the existing not_found verification result instead of a 502 retry message.
- [x] #3 Tests cover duplicate-email and guest-not-found verification behavior.
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Add duplicate-event Luma email detection to the participant verification endpoint before external Luma lookup.\n2. Treat Luma get-guest 404 guest-not-found responses as not_found instead of lookup_failed.\n3. Extend integration and unit tests for duplicate and missing guest behavior, then run targeted and required validation.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Implemented duplicate-event Luma email detection in the participant verification route before external Luma lookup. Treated Luma /v1/event/get-guest 404 responses as not_found for verification. Updated canonical docs for the verify endpoint. Validation passed: targeted unit and integration files, bun run lint, bun run typecheck, bun run test:unit, bun run test:integration, git diff --check, and bun run test:bdd.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Participants now get a 409 luma_email_already_used error when the submitted Luma email is already connected to another participant in the same event. Luma guest-not-found 404 responses now return the existing not_found verification result instead of the transient 502 message. Tests and canonical docs were updated.
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
