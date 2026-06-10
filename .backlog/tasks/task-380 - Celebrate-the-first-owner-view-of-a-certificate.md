---
id: TASK-380
title: Celebrate the first owner view of a certificate
status: Done
assignee: []
created_date: '2026-06-10 07:30'
updated_date: '2026-06-10 09:35'
labels:
  - ui
  - events
dependencies: []
milestone: m-2
priority: low
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
When participants open their own certificate for the first time on a device, the card greets them with a brief celebratory moment: a sheen sweep across the card and a short sparkle burst. The moment runs once per certificate per browser, only for the certificate owner, and never for visitors or users who prefer reduced motion.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria

<!-- AC:BEGIN -->
- [x] #1 Celebration plays only for the signed-in certificate owner on first view per browser and certificate.
- [x] #2 Reduced-motion preference disables the celebration.
- [x] #3 Visitors and repeat views see the normal page.
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
The celebration is pure CSS keyframes (card pop, sheen sweep, twelve fixed spark particles at the stage level so they fly past the card edges) triggered once per certificate per browser through a localStorage key set only for the signed-in owner when reduced motion is not preferred. The keyframe classes were verified in the browser by class simulation; the full owner path requires an Auth0 session and is guarded by the owner, reduced-motion, and localStorage checks in code.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Certificate owners now get a one-time celebratory moment when first opening their certificate on a device: a brief card pop, a sheen sweep across the hologram, and a short spark burst around the card. The moment never plays for visitors, repeat views, or users who prefer reduced motion. Risks/follow-ups: the once-per-browser guard uses localStorage, so a cleared browser replays the moment, which is acceptable.
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
