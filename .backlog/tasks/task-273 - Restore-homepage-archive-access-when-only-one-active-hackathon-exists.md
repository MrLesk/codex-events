---
id: TASK-273
title: Restore homepage archive access when only one active hackathon exists
status: Done
assignee: []
created_date: '2026-04-18 12:33'
updated_date: '2026-04-18 12:34'
labels:
  - homepage
  - public
  - bugfix
dependencies: []
priority: medium
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Update the public homepage so the single-active simplified layout is used only when there is no past public archive. When there is exactly one active hackathon and at least one past public hackathon, the homepage should keep the Active/Past controls so older hackathons remain reachable from `/`.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 The public homepage keeps the Active/Past controls when there is one active public hackathon and at least one past public hackathon.
- [x] #2 The simplified single-card homepage layout still applies when there is exactly one active public hackathon and there are no past public hackathons.
- [x] #3 Automated coverage is updated for the homepage view rule and required local validation passes.
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Updated `app/utils/public-homepage.ts` so the single-active simplified homepage layout applies only when there is exactly one active public hackathon and `pastHackathonCount === 0`. When a public archive exists, the homepage now keeps the Active/Past controls and does not force the effective tab back to `active`.

Updated `tests/unit/app/utils/public-homepage.test.ts` to cover both sides of the rule: one active plus past archive keeps filters visible, while one active with no past archive still gets the simplified single-card layout.

This replaces the earlier homepage rule from TASK-72 because the current product decision is that past hackathons must remain reachable from `/` whenever a public archive exists.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Restored homepage archive access when there is exactly one active public hackathon and at least one completed public hackathon. The homepage view helper in `app/utils/public-homepage.ts` no longer enters the single-active simplified mode just because the active count is `1`; it now requires that there is no past archive before hiding the Active/Past controls and forcing the homepage into the single-card active presentation.

Updated `tests/unit/app/utils/public-homepage.test.ts` to cover the archived single-active case and the preserved no-archive single-active case. No docs, API contract, or hackathon card component contract changes were required. Validation passed with `bun run test:unit -- tests/unit/app/utils/public-homepage.test.ts`, `bun run lint`, `bun run typecheck`, and `bun run test:unit`.
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
- [x] #9 The fix does not change the public hackathon API contract or hackathon card component contract beyond existing homepage view behavior.
<!-- DOD:END -->
