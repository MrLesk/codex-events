---
id: TASK-196
title: Refine the admin submissions tab into a searchable submission ops dashboard
status: Done
assignee:
  - '@codex'
created_date: '2026-04-12 12:23'
updated_date: '2026-04-12 13:04'
labels:
  - admin
  - submissions
  - ui
dependencies: []
priority: high
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Update the admin-only submissions tab on `/account/hackathons/:slug?tab=submissions` so hackathon admins can inspect what teams are submitting, including drafts, and quickly see whether teams are running late. Keep the page operational and low-copy. Do not modify the participant submission workspace.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 The submissions tab surfaces compact summary metrics for total teams, ready teams, draft-only teams, and no-submission teams.
- [x] #2 The tab highlights late teams using canonical status rules where late includes teams with no submission and teams with only a draft.
- [x] #3 Admins can search the submissions tab by metadata only, including team name, project name, admin or member display name, email, and user ID.
- [x] #4 The main list lets admins inspect draft and submitted submission metadata without turning the page into a judging workflow.
- [x] #5 Existing admin interventions remain available and continue to respect canonical lifecycle guards.
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Keep the existing submissions data flow and helper logic in `app/components/account/hackathons/AccountHackathonAdminOperationsPanel.vue` and `app/utils/admin-workspace.ts`; only adjust it if the revised layout exposes a gap.
2. Rework `app/components/admin/AdminTeamsOperationsPanel.vue` to match the surrounding tab pattern: summary metrics outside cards, one compact control strip, then separate sibling cards for late teams and the full submissions list.
3. Inside those cards, replace nested mini-boxes with divided row lists and horizontal separators, keeping row expansion inline for submission details.
4. Preserve metadata-only search, status filtering, late classification, and existing interventions, then rerun lint, typecheck, and unit tests.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Kept scope on the admin-only submissions tab and avoided participant submission files because that area is being edited in parallel by another agent.

Switched the submissions monitor from paged team rows to a full-dataset view built from the existing admin team list plus per-team detail and submission reads so metadata search works across the whole tab.

Added shared admin-workspace helpers for submission dashboard buckets, compact metrics, stable sorting, and metadata-only filtering. Search intentionally excludes summary text and URLs.

Refined the submissions monitor UI to stay low-copy: compact metrics, ready coverage, separate no-submission and draft-only late buckets, search/filter controls, and expandable submission details.

Validation: `bun run lint`, `bun run typecheck`, and `bun run test:unit` all passed.

Adjusted the submissions tab UX after review feedback to match the surrounding workspace tabs more closely: metrics remain outside cards, search/filter moved into a single inset control strip, and content is now split into sibling cards for late teams and the full submissions list.

Removed the custom dashboard shell, coverage bar, and nested card-like boxes from `AdminTeamsOperationsPanel.vue`. Late-team queues and submission rows now use horizontal separators and divided lists, with inline expansion for details.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Updated the admin submissions tab again after UX review to bring it back in line with the surrounding account/admin tabs. The tab now uses the same structural rhythm as the other workspaces: summary metrics outside cards, one compact inset control strip for metadata search and status filtering, then separate sibling cards for late teams and the full submissions list. The custom dashboard shell, coverage bar, and nested card-like boxes were removed.

Within the new structure, late teams remain split into `No submission` and `Draft only`, but those queues now render as divided row lists with horizontal separators instead of nested boxes. The main submissions list also renders as a divided list with inline expansion for submission details, so admins can inspect draft and submitted metadata without the panel reading like a separate product.

The underlying data model did not change: metadata-only search, canonical late/ready/out classification, and existing admin interventions all remain intact. Validation reran successfully after the UX rewrite: `bun run lint`, `bun run typecheck`, and `bun run test:unit` all passed.

Risk/follow-up: this addresses the current layout drift, but visual fit should still be checked against the live page once the parallel changes around the account workspace settle, since nearby tabs and shell components are being edited concurrently.
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
