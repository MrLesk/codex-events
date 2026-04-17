---
id: TASK-231
title: Simplify shortlist editing in the account hackathon competition page
status: Done
assignee:
  - codex
created_date: '2026-04-17 08:17'
updated_date: '2026-04-17 09:58'
labels:
  - judging
  - admin
  - frontend
  - ux
dependencies: []
documentation:
  - docs/domain-model.md
  - docs/lifecycle-and-state-machines.md
  - docs/permissions-matrix.md
  - docs/api-surface.md
  - app/components/admin/AdminCompetitionShortlistPanel.vue
  - app/components/account/hackathons/AccountHackathonCompetitionPanel.vue
  - tests/bdd/steps/admin-competition.steps.ts
priority: high
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Replace the current shortlist two-step admin flow with a single shortlist editor in the account hackathon competition page so hackathon admins can review all blind-ranked submissions, see a clear finalist boundary, and adjust finalist membership and order without switching between a read-only leaderboard and a separate finalist list.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 The shortlist editor shows all ranked shortlist submissions in one admin workflow with clear `Finalists` and `Not finalists` sections on the account hackathon competition page.
- [x] #2 Hackathon admins can change finalist membership and order from that shortlist editor while the shortlist view stays blind to team identity.
- [x] #3 The shortlist action bar appears above the submission list and includes save plus the next-stage action, with the next-stage action remaining gated on a saved finalist selection.
- [x] #4 Saving shortlist persists the full ordered shortlist across ranked submissions and carries that order forward as the initial final/public ranking baseline; canonical docs and automated coverage are updated accordingly.
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Update the shortlist data contract and any downstream final-order derivation so shortlist save persists the full ordered ranked-submission list while still exposing finalist membership and finalist rank.
2. Refactor the admin shortlist panel into a single blind editor with two clear drop zones, shared editor-row controls, and a top action bar for save plus continue-to-pitch.
3. Update any final-deliberation/public-ranking code paths that should seed from the saved shortlist order when no later override exists, without removing later admin reordering.
4. Revise canonical docs for shortlist/final-order behavior and update automated coverage in the shortlist workflow tests.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
L1 micro-brief: closest analogs are `app/components/admin/AdminCompetitionShortlistPanel.vue` for existing shortlist state and `app/components/admin/HackathonConfigForm.vue` for the shared admin drag-handle row pattern. Main risk is keeping the shortlist UX fast without implying that non-finalist ordering is a persisted outcome, because the canonical shortlist contract persists only the ordered finalist subset.

Validated locally with `bun run typecheck`, `bun run lint`, `bun run test:unit`, and targeted `bun run test:integration -- tests/integration/server/api/outcome-routes.test.ts`.

The shortlist drag/drop UI does not yet have a dedicated browser scenario in the checked-in BDD suite; the changed behavior is covered here through integration assertions plus the updated shortlist API contract tests.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Implemented a single shortlist editor with `Finalists` and `Not finalists` zones in the account hackathon competition page, moved the shortlist action bar above the list, and switched shortlist save to persist both the full blind ordering and the finalist subset.

Updated shortlist and final-deliberation server behavior so the saved shortlist order becomes the initial final ranking baseline, while later final-deliberation reordering still remains available.

Updated canonical judging docs and shortlist/final-order automated coverage to match the new persisted-order model.
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
