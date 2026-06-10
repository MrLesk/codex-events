---
id: TASK-377
title: Augment hackathon certificates with placement and prizes
status: To Do
assignee: []
created_date: '2026-06-10 07:30'
updated_date: '2026-06-10 07:30'
labels:
  - api
  - ui
  - events
  - hackathons
dependencies: []
milestone: m-2
priority: high
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Completed hackathon certificates celebrate outcomes: the certificate carries the participant team final placement, won prize names, and the team and project names resolved from the existing competition outcome model. Top-three placements get distinct trophy treatments (gold, silver, bronze) on the certificate card and the social-preview image, and the page and PDF state the placement and prizes. Outcome details appear only after the event is completed, matching public winner visibility rules.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria

<!-- AC:BEGIN -->
- [ ] #1 Certificate payload includes placement, prize names, team name, and project name for completed hackathons and stays empty before completion and for other event types.
- [ ] #2 Card and social-preview image show a trophy badge for top-three placements.
- [ ] #3 Page and PDF state placement and prizes when present.
- [ ] #4 Unit and integration coverage exercise the outcome gating.
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
