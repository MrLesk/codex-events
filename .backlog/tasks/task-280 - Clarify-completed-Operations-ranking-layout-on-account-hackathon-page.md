---
id: TASK-280
title: Clarify completed Operations ranking layout on account hackathon page
status: Done
assignee:
  - codex
created_date: '2026-04-19 16:24'
updated_date: '2026-04-20 19:46'
labels:
  - ux
  - admin
  - hackathon-workspace
dependencies: []
priority: medium
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Restructure the completed-state Operations view so final results read as one clear flow: winner rows first, then non-winning finalists, then the remaining teams. Reuse the existing winners presentation style from the account/public winners surface where possible, and keep prize redemption status subordinate to the winner rows instead of separating it into its own ranking section.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 When a hackathon is completed, the Operations tab presents winners in a dedicated top results card that clearly shows rank, prizes, and team details using the established winners showcase pattern.
- [x] #2 Prize redemption information remains available for winners but is visually subordinate to the winner rows instead of interrupting the ranking flow as a separate section between ranking groups.
- [x] #3 Completed finalists who did not win appear in a second card, ordered by final rank, without winner/prize treatment.
- [x] #4 All remaining teams appear in a third card after the finalists, preserving the completed ranking order that applies to them.
- [x] #5 The completed Operations view no longer splits the final-results story across a separate winner summary card plus a later remaining-ranking section in a way that obscures who placed where.
- [x] #6 The completed Operations results cards show each team member's ChatGPT email and OpenAI org ID when those values are present, without exposing those fields through the public winners surface.
- [x] #7 Completed shortlisted and remaining-team cards in the Operations view show each project's description and available repository/demo links, replacing the placeholder placement-only copy in those cards.
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Update the completed Operations results flow so winners, non-winning finalists, and the remaining teams render as three ordered cards in the same section.
2. Refactor the Operations prize-redemptions component to reuse the existing winner-card presentation patterns for winners and to show redemption progress inside each winner row instead of as a separate ranking section.
3. Remove the redundant completed-state winner summary card from the Operations flow while preserving non-completed visibility where needed.
4. Keep the existing ranking and redemption data sources, then update tests only where rendered structure or assertions change.
5. Run `bun run lint`, `bun run typecheck`, and `bun run test:unit` before handoff.

6. Extend the completed finalist and post-shortlist admin entry payloads with summary/repository/demo fields, then render those cards with the same description and link treatment used in the winner card.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Reviewed canonical docs plus the current Operations and winners UI. The confusing split comes from rendering a separate winners/completion card before the prize-redemptions card, while the latter also contains portions of the completed ranking.

Implemented the completed Operations results flow as three ordered cards inside the prize-redemptions surface: winners, shortlisted non-winners, and the remaining post-shortlist teams.

Reworked the winners card to mirror the existing winners showcase pattern, then folded redemption progress into each winner row so the final results are no longer split across a separate outcome card and a later ranking section.

Updated the prize-redemption operations helper to return one ordered winner list plus shortlisted finalist entries, and updated the unit test coverage for that grouping logic.

Docs remain unchanged for this UI-only change.

Validation results: `bunx vitest run tests/unit/app/utils/prize-redemptions.test.ts` passes. `bun run lint`, `bun run typecheck`, and `bun run test:unit` fail because of unrelated existing issues in the worktree, including hackathon-photos/type-path problems and `account-hackathon-tabs` expectations that still need the new `photos` tab reflected.

User requested an admin-only extension to the Operations results cards: show each listed team member's ChatGPT email and OpenAI org ID when present. This will be implemented through the admin prize-redemptions endpoint only so the public winners view remains unchanged.

Extended the admin-only prize-redemptions payload so Operations team-member rows can include `chatgptEmail` and `openaiOrgId` while the public winners payload still omits those fields.

Rendered ChatGPT email and OpenAI org ID under each team-member card in the winners, shortlisted, and remaining-team Operations cards only when present.

Validation results for this extension: `bunx vitest run tests/unit/app/utils/prize-redemptions.test.ts` passes, `bunx vitest run --config vitest.integration.config.ts tests/integration/server/api/outcome-routes.test.ts` passes, and targeted ESLint on touched files reports only the existing `vue/no-v-html` warning already shared with the winners showcase pattern. Repo-wide `lint`, `typecheck`, and `test:unit` still have unrelated failures already present elsewhere in the worktree.

User requested richer completed non-winner cards in Operations: show project description plus repository and demo links for shortlisted and remaining teams, replacing the placeholder placement copy.

Validation for the completed-card description/link follow-up: `bunx vitest run tests/unit/app/utils/prize-redemptions.test.ts` passes, `bunx vitest run --config vitest.integration.config.ts tests/integration/server/api/outcome-routes.test.ts` passes, and targeted ESLint on touched files reports only the existing `vue/no-v-html` warning already used by the winners markdown rendering pattern.

Current repo-wide validation state after the completed-card description/link follow-up: `bun run lint`, `bun run typecheck`, and `bun run test:unit` all pass locally. `bun run lint` reports only the existing `vue/no-v-html` warnings in the admin results panel for markdown rendering.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Clarified the completed-state Operations results flow on the account hackathon page by rendering winners, shortlisted non-winners, and remaining teams as three ordered cards in the prize-redemptions panel. The winners section now reuses the clearer winners-tab presentation and keeps prize redemption status subordinate to each winner row instead of interrupting the ranking story.

Extended the admin-only prize-redemptions payload so Operations cards can show ChatGPT email and OpenAI org ID for team members when present, while keeping those fields out of the public winners surface. Also enriched shortlisted and remaining-team cards with project descriptions plus repository and demo links so completed results provide the same project context beyond rank alone.

Updated the relevant unit and integration coverage for prize-redemptions and outcome routes. Validation passed locally with `bun run lint`, `bun run typecheck`, and `bun run test:unit`; lint continues to report the existing `vue/no-v-html` warnings in the admin results panel where markdown is rendered.
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
