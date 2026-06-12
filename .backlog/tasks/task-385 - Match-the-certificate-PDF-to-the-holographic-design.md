---
id: TASK-385
title: Match the certificate PDF to the holographic design
status: Done
assignee: []
created_date: '2026-06-12 21:30'
updated_date: '2026-06-12 21:45'
labels:
  - api
  - events
  - design
dependencies: []
milestone: m-2
priority: medium
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
The certificate PDF carries the same design language as the certificate page instead of a plain typographic sheet. The page renders the per-type holographic gradient as a banded vector background with a light streak, halftone dot fields, concentric rings, and a rounded accent frame; the content is centered like the card with the wordmark, an event-type pill, a gold placement pill and prize line for winners, the participant name, the event name in an outline pill, the project and team line, evenly distributed footer cells (event type, date, location, track, certificate ID) with hairline dividers, the white Codex badge, the verification QR on a rounded white plate, and the verify link.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria

<!-- AC:BEGIN -->
- [x] #1 The PDF background uses the per-event-type gradient, dot fields, streak, rings, and rounded accent frame matching the card's visual system.
- [x] #2 Content is centered with wordmark, type pill, gold placement pill and prize line for winners, name, event pill, and project and team line.
- [x] #3 Footer cells mirror the card (event type, date, location, track, certificate ID) with even distribution and dividers, plus the QR plate and verify link.
- [x] #4 The white Codex badge renders from a bundled server asset.
- [x] #5 Existing certificate route tests pass and the document stays compact.
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
pdf-lib has no gradient primitive, so the background is 120 vertical strips interpolated across the palette's from-via-to stops, which renders banding-free at print resolution and keeps the document vector. Rounded pills, the frame, and the QR plate are drawn as SVG paths; the only raster element is the white Codex badge PNG embedded from server assets. Winner and plain variants were rendered and visually reviewed; file size is about 55 KB.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Rebuilt the certificate PDF as a branded artifact mirroring the holographic card: per-type gradient background with streak, dot fields, rings, and rounded accent frame; centered composition with wordmark, type pill, gold placement pill, prize and team lines, name, and event pill; card-style footer cells with even distribution; the white Codex badge; and the QR verification plate. Verified winner and non-winner renders visually, certificate route integration tests pass, and the document remains compact vector output. Risks/follow-ups: none.
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
