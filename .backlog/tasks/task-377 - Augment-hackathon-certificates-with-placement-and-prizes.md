---
id: TASK-377
title: Augment hackathon certificates with placement and prizes
status: Done
assignee: []
created_date: '2026-06-10 07:30'
updated_date: '2026-06-10 08:55'
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
- [x] #1 Certificate payload includes placement, prize names, team name, and project name for completed hackathons and stays empty before completion and for other event types.
- [x] #2 Card and social-preview image show a trophy badge for top-three placements.
- [x] #3 Page and PDF state placement and prizes when present.
- [x] #4 Unit and integration coverage exercise the outcome gating.
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Outcome data is resolved through the existing getTeamCompetitionOutcome model, which already hides winners until the event is completed, so the certificate read needs no extra visibility logic beyond gating team and project names by completion. Integration coverage seeds a full judging trail (criterion, completed blind assignment, criterion score, final ranking, prize) to exercise the real ranking path.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Completed hackathon certificates now carry final placement, won prize names, team name, and project name. Top-three placements render gold, silver, or bronze trophy pills on the holographic card and the social-preview image; the page headline states the placement and prizes with a trophy icon plus project and team lines, the info bar gains placement and prize facts, the PDF includes a placement line, and the share summary mentions the finish. Outcome details stay hidden before completion, verified by integration tests with a seeded judging trail and unit tests for placement formatting. Risks/follow-ups: placements beyond third place appear as text without a trophy tier by design.
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
