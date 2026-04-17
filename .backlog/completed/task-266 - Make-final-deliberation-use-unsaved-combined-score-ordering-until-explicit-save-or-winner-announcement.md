---
id: TASK-266
title: >-
  Make final deliberation use unsaved combined-score ordering until explicit
  save or winner announcement
status: Done
assignee:
  - Codex
created_date: '2026-04-17 20:51'
updated_date: '2026-04-17 21:01'
labels:
  - operations
  - judging
  - final-deliberation
dependencies: []
priority: high
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Stop treating the carried shortlist order as a saved final order. Final deliberation should derive combined-score ordering by default, only persist final order when admins save it explicitly or announce winners, and require confirmation before announce-winners saves an unsaved draft.
<!-- SECTION:DESCRIPTION:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Make final deliberation derive combined-score order when no final order has been explicitly saved yet.
2. Reset saved final-order state on entry to final deliberation, and keep explicit save via the reorder endpoint.
3. Make Announce winners save the current draft first when needed, with confirmation for unsaved drafts.
4. Remove the conflicting score rank presentation and reorder the score metrics so combined score is the emphasized summary.
5. Update targeted tests, then run lint, typecheck, and unit tests.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Final deliberation no longer inherits the saved shortlist order as a persisted final order. Entering final deliberation clears the saved final-order field so the panel defaults to combined-score order until admins explicitly save or announce winners.

Announce winners now persists either the unsaved default combined-score order or the current unsaved manual draft order before publishing winners, prize redemptions, and winner emails.

The final-deliberation panel now treats an unsaved default order as saveable, emits draft state back to Operations, removes the visible score-rank card, and emphasizes blind score, pitch score, then combined score in the final-ranking editor.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Final deliberation now opens in combined-score order without persisting that order on entry, and the final order is only persisted when admins click Save final order or Announce winners. Announce winners saves the current draft order in the same action, with a confirmation when no final order has been saved yet. The final-deliberation UI was updated to match that model and the conflicting shortlist copy/docs were corrected. Validation passed with `bun run lint`, `bun run typecheck`, `bun run test:unit`, and `bunx vitest run --config vitest.integration.config.ts tests/integration/server/api/outcome-routes.test.ts`.
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
