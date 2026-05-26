---
id: TASK-313
title: Improve platform legal field guidance
status: Done
assignee: []
created_date: '2026-05-26 18:15'
updated_date: '2026-05-26 18:15'
labels: []
dependencies: []
modified_files:
  - app/pages/account/platform-legal.vue
priority: low
ordinal: 16000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Clarify the platform legal settings form so platform admins understand what to enter for deployment-owned legal contact, business purpose, editorial line, and imprint content fields.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Legal contact languages explains which communication languages the operator accepts.
- [x] #2 Business purpose supports the longer public purpose sentence used on production without hiding most of the text.
- [x] #3 Editorial line explains that the value is the public summary of published platform information.
- [x] #4 Imprint content explains that the field contains the full public legal notice shown on the imprint page.
- [x] #5 Lint, typecheck, and unit tests pass after the form change.
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Add existing AppFormField helper descriptions to ambiguous legal settings fields.
2. Change Business purpose from a single-line input to a short textarea so production-length text remains readable while editing.
3. Run required repository validation: lint, typecheck, and unit tests.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Implemented in app/pages/account/platform-legal.vue using the existing AppFormField description pattern. Business purpose now uses AppTextarea rows=3. Validation passed with bun run lint, bun run typecheck, and bun run test:unit.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Updated the platform legal settings form to clarify the legal contact languages, business purpose, editorial line, and imprint content fields for platform admins. Business purpose now uses a short textarea so the longer production purpose sentence remains readable while editing. No canonical product docs or setup docs needed changes because this was a UI guidance-only change. Validation passed: bun run lint, bun run typecheck, and bun run test:unit.
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
