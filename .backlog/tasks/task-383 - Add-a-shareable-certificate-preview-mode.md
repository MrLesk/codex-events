---
id: TASK-383
title: Add a shareable certificate preview mode
status: Done
assignee: []
created_date: '2026-06-12 19:50'
updated_date: '2026-06-12 20:10'
labels:
  - ui
  - api
  - events
dependencies: []
milestone: m-2
priority: medium
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
A reserved preview participant id renders the certificate page with synthetic data driven by query parameters so the design can be shared for feedback with full functionality. `/events/:slug/preview?name=…&type=…&rank=…&track=…&project=…&team=…&prizes=…` works on any publicly visible event, supports image and PDF export without a session, replays the celebration moment on each load, states clearly that it is a sample rather than an issued certificate, and is excluded from search indexing.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria

<!-- AC:BEGIN -->
- [x] #1 The reserved `preview` participant id renders a synthetic certificate from validated query parameters with sample defaults, reading no application data.
- [x] #2 The preview JSON, image, and PDF reads are public; the preview PDF skips the session requirement and preview image responses are never cached.
- [x] #3 The preview page shows the full export and share actions to anonymous visitors and carries its query parameters through share links, downloads, and social-preview metadata.
- [x] #4 The preview presents itself as a sample, is excluded from indexing, and emits no credential structured data.
- [x] #5 Docs and integration coverage describe the preview surface.
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
The reserved id is safe because real participant ids are generated UUIDs. Preview reuses the event's name, schedule date, location, and background image so feedback reflects the real stage, while the participant, outcome, and track fields come from the query. The type parameter can restyle any event as hackathon, meetup, or build to review all three palettes from one link.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Added the certificate preview mode at /events/:slug/preview driven by name, type, rank, track, project, team, and prizes query parameters: the page, social-preview image, and PDF all render the synthetic certificate, exports are available without signing in, the celebration plays on every load, and the footer replaces the verification record line with a sample notice while the page is excluded from indexing and emits no credential structured data. Covered by integration tests for defaults, overrides, public exports, no-store caching, and unknown slugs. Risks/follow-ups: preview links on real event slugs intentionally look like real certificates apart from the URL and the sample notice; verification authority remains with real certificate URLs only.
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
