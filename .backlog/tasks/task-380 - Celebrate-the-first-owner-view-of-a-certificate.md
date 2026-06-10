---
id: TASK-380
title: Celebrate the first owner view of a certificate
status: To Do
assignee: []
created_date: '2026-06-10 07:30'
updated_date: '2026-06-10 07:30'
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
- [ ] #1 Celebration plays only for the signed-in certificate owner on first view per browser and certificate.
- [ ] #2 Reduced-motion preference disables the celebration.
- [ ] #3 Visitors and repeat views see the normal page.
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
