---
id: TASK-72
title: Simplify homepage when only one active public hackathon exists
status: Done
assignee:
  - codex
created_date: '2026-03-29 11:53'
updated_date: '2026-03-29 11:57'
labels: []
dependencies: []
documentation:
  - /Users/alex/projects/codex-hackathons/docs/README.md
  - /Users/alex/projects/codex-hackathons/docs/domain-model.md
  - /Users/alex/projects/codex-hackathons/docs/testing-strategy.md
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Adjust the public homepage discovery layout so that when there is exactly one active or upcoming public hackathon, the page removes the filter bar and the single hackathon card no longer shows the left-side timeline rail. The user explicitly chose to hide the filters even when past hackathons exist, so the homepage should prioritize the single active program presentation in that case.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 The public homepage hides the filter bar when there is exactly one active or upcoming public hackathon.
- [x] #2 When that single active or upcoming hackathon is rendered on the homepage, its card does not show the left-side timeline rail.
- [x] #3 Homepage behavior for multiple active or upcoming hackathons remains unchanged.
- [x] #4 Automated coverage is updated for the single-hackathon homepage state.
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Update the public homepage page logic in /Users/alex/projects/codex-hackathons/app/pages/index.vue to detect when there is exactly one active or upcoming public hackathon from the existing public totals, hide the filter bar in that state, and force the effective homepage view to the active list so the hidden past filter cannot be re-entered through the tab query.
2. Update /Users/alex/projects/codex-hackathons/app/components/public/hackathons/HackathonCard.vue to accept a small presentation prop that suppresses the left-side timeline rail and date label for the single-active homepage presentation while preserving the existing multi-card layout.
3. Extend the public hackathon discovery automated coverage to exercise the single-active homepage state and confirm the simplified layout without changing canonical product docs unless implementation uncovers a mismatch.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Implemented the single-active homepage presentation by deriving a public homepage view helper from existing total and past counts, forcing the effective tab to active only when the single active hackathon is also present in the loaded results. This avoids hiding filters into an empty state when metadata reports one active hackathon but the first loaded page contains only completed entries.

Validation: bun run test:unit, bun run typecheck.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Adjusted the public homepage discovery layout so a single loaded active or upcoming hackathon renders as a simplified hero card without the filter bar or left-side timeline rail. The homepage now derives a dedicated public-homepage view state from the existing total and completed counts and forces the effective view back to active only for that single-card case, while preserving the existing multi-card behavior. Added a `showTimelineRail` presentation prop to the public hackathon card so the homepage can remove the left rail cleanly without changing other consumers.

Added focused unit coverage for the homepage view helper, including the single-active case, the normal multi-active case, and the safeguard that keeps filters visible until the single active hackathon is actually present in the loaded results. Canonical docs remain unchanged. Validation run: `bun run test:unit`, `bun run typecheck`.
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
