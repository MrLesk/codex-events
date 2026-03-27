---
id: TASK-48
title: >-
  Standardize target-blank links with external-link icon and consistent link
  color
status: Done
assignee: []
created_date: '2026-03-27 21:17'
updated_date: '2026-03-27 21:18'
labels:
  - ui
  - consistency
  - accessibility
dependencies: []
priority: medium
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Update all `target="_blank"` links in the app UI to include an external-link indicator icon and consistent link color treatment, without changing font size. Preserve existing layout semantics (chips/buttons/text links).
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Every `target="_blank"` link in `app/` renders an external-link icon indicator.
- [x] #2 External-link text color is consistent with the existing Application Terms external-link style.
- [x] #3 No font-size classes are changed as part of this update.
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Applied consistent external-link treatment for all current `target="_blank"` links in `app/` by adding `i-lucide-external-link` indicators and aligning link color to the existing sky external-link style. Preserved existing font-size classes and layout semantics for text links, chip links, and button links (button links use `trailing-icon`).

Updated components: `AccountSettingsProfileForm`, `HackathonRegistrationPanel`, `AdminApplicationsReviewPanel`, `BlindSubmissionPanel`.

Validation run: `bun run typecheck` passed.

Automation gap: no dedicated snapshot/e2e assertion exists for icon presence on every `target="_blank"` link; validated by static search + manual class/icon inspection.
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
