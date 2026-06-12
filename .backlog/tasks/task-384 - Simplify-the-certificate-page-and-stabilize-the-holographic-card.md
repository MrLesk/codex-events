---
id: TASK-384
title: Simplify the certificate page and stabilize the holographic card
status: Done
assignee: []
created_date: '2026-06-12 20:20'
updated_date: '2026-06-12 20:45'
labels:
  - ui
  - events
dependencies: []
milestone: m-2
priority: high
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Apply the findings of two independent adversarial reviews of the certificate page. The information bar below the card duplicated six of its seven facts already shown in the headline or on the card, so it is removed and its only unique fact, the event location, moves into the headline date line. The headline compresses track, project, and team into one metadata line, exports become available to everyone (the image was already the public social-preview asset, making the sign-in gate ineffective), the signed-in email block no longer leaks the viewer's address onto a public page, and the copy-link button says what it does. The holographic card's hover glitch is fixed structurally: pointer events and measurement move to the non-transformed perspective wrapper, eliminating the projected-edge enter/leave oscillation, with per-frame eased tilt instead of restarted transitions, a celebration pop that composes with the tilt, reduced-motion coverage for the celebration, screen-reader labeling for the card, and minimum font floors so card text stays legible on phones.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria

<!-- AC:BEGIN -->
- [x] #1 The info bar is removed and the event location appears in the headline date line.
- [x] #2 Track, project, and team collapse into one metadata line; placement and prizes share one consistently separated gold line.
- [x] #3 Copy link, PDF, and Image actions are available to all visitors, the PDF read is public, and the signed-in email block and sign-in hint are gone.
- [x] #4 Hovering the card edges no longer causes tilt oscillation; tilt updates run once per frame with eased motion and settle smoothly.
- [x] #5 The celebration pop no longer cancels the tilt transform and respects reduced motion.
- [x] #6 The card exposes a screen-reader label, hides its duplicated internals from assistive tech, and keeps minimum legible font sizes on small screens.
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Two Fable subagents reviewed independently: an adversarial UX pass produced the redundancy matrix and minimal layout (info bar deleted, location rehomed, headline compressed from up to eight lines to five typical), and a forensic interaction review identified the glitch root cause as pointer handlers plus rect measurement living on the 3D-transformed element, whose projected edge recedes from the cursor and self-oscillates through pointerleave. The fix moves events and measurement to the perspective wrapper, clamps normalized coordinates, replaces the restarted 90ms transition with a requestAnimationFrame lerp while active, and rewrites the celebration keyframe to the standalone scale property so it composes with the inline rotation.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
The certificate page now reads as one statement instead of three: compressed headline with date and location merged and a single track-project-team line, the holographic card, and the verification footer; the redundant info bar is gone. Exports are public for everyone, matching the already-public social-preview image, and the viewer's email no longer appears on the page. The card tilt is stable at the edges, eased per frame, and the celebration pop composes with the tilt and respects reduced motion. Edge-hover stability was verified in the browser, all certificate routes pass integration tests, and docs reflect the public PDF read. Risks/follow-ups: the public PDF read intentionally relaxes the earlier signed-in download rule because the equivalent image was always public as the social-preview asset.
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
