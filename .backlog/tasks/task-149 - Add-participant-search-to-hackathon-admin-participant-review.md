---
id: TASK-149
title: Add participant search to hackathon admin participant review
status: Done
assignee:
  - codex
created_date: '2026-04-01 21:15'
updated_date: '2026-04-01 21:20'
labels:
  - ui
  - admin
dependencies: []
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Add a search control to the hackathon participant review surface so hackathon admins can quickly find participant application records by identity fields without losing the existing grouped participant-review layout. Reuse the current client-side participant data and inferred teammate-group behavior rather than introducing a new backend contract for this first pass.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 The hackathon admin participants tab includes a search input for participant lookup.
- [x] #2 Search matches participant records by at least display name email and user ID.
- [x] #3 Search preserves the existing grouped participant review layout including teammate-hint context for matching groups.
- [x] #4 When no participant records match the search the UI shows a search-specific empty state.
- [x] #5 Unit tests cover the participant review search behavior and existing grouped filtering remains intact.
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Add Fuse.js as a direct dependency so the app uses an explicit supported package rather than a transitive lockfile entry.
2. Extend the admin application review utilities to derive searchable text for grouped participant review data and filter groups by a Fuse.js query while preserving existing view-based grouping semantics.
3. Add a participant search input to the shared review panel UI, wire it to the new grouped-search utility, and show a search-specific empty state when no groups match.
4. Pass the search affordance through the hackathon admin participants tab so the new control appears in the admin participant review flow without changing the backend API contract.
5. Add unit coverage for grouped participant review search behavior and run lint, typecheck, and unit tests before handoff.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
User approved proceeding with a Fuse.js-based implementation after license verification. Initial implementation will stay client-side to preserve existing grouped participant review behavior and avoid expanding the API contract for this feature.

Added client-side participant search to the shared admin application review panel behind an explicit `searchEnabled` prop so the hackathon admin participants tab gets search without changing the backend API contract.

Implemented a hybrid search strategy in `app/utils/admin-application-review.ts`: exact substring matches across participant identity fields and pending teammate hints return first, with Fuse.js used as a fuzzy fallback for lightly misspelled queries.

Validated with `bun run lint`, `bun run typecheck`, `bun run test:unit`, and a targeted run of `tests/unit/app/utils/admin-application-review.test.ts`. No canonical docs changes were required because this is a client-only enhancement.

Automation gap: the search-specific empty-state copy in the shared Vue panel is not covered by a dedicated component test; behavior is exercised indirectly through the utility coverage and the passing unit/type/lint validation surface.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Added participant search to the hackathon admin participant review flow by enabling a new search control on the shared `AdminApplicationsReviewPanel` and wiring it from the admin operations participants tab. The search stays client-side so the existing inferred teammate-group layout remains intact and the applications API contract stays unchanged.

The search logic now lives in `app/utils/admin-application-review.ts`. It searches visible participant groups by display name, email, user ID, and visible identity fields such as Luma email, ChatGPT email, and OpenAI org ID, plus unmatched teammate hints. Exact substring matches win first for predictable email and ID lookup, and Fuse.js provides fuzzy fallback ranking for lightly misspelled name searches.

Validation: `bun run lint`, `bun run typecheck`, `bun run test:unit`, and `bun x vitest run tests/unit/app/utils/admin-application-review.test.ts` all passed. Risk/follow-up: the search-specific empty-state copy is not separately covered by a dedicated component test; current coverage is at the shared utility level plus repository validation.
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
