---
id: TASK-185
title: Fix provisional solo-team join-policy toggle persistence
status: Done
assignee:
  - '@codex'
created_date: '2026-04-04 11:53'
updated_date: '2026-04-04 11:59'
labels: []
dependencies: []
documentation:
  - >-
    /Users/alex/projects/codex-hackathons/app/components/account/hackathons/AccountHackathonParticipantTeamPanel.vue
  - >-
    /Users/alex/projects/codex-hackathons/app/components/teams/ParticipantTeamWorkspacePanel.vue
  - >-
    /Users/alex/projects/codex-hackathons/app/composables/useTeamFormationWorkspace.ts
  - >-
    /Users/alex/projects/codex-hackathons/server/api/hackathons/[hackathonId]/teams/[teamId]/index.patch.ts
  - /Users/alex/projects/codex-hackathons/server/utils/team-formation.ts
  - /Users/alex/projects/codex-hackathons/docs/domain-model.md
  - /Users/alex/projects/codex-hackathons/docs/api-surface.md
  - /Users/alex/projects/codex-hackathons/docs/schema-outline.md
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Approved participants without a persisted team start from the provisional solo-team workspace in the participant Team tab. Toggling the join-policy control from that provisional state should create the team immediately instead of only updating local form state. In addition, team renames should update the canonical team slug so shareable team links continue to reflect the current team name. This replaces the current stable-slug behavior in the canonical docs and runtime.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 When an approved participant with only a provisional solo-team workspace enables join requests, the team is created immediately and the persisted team remains open to join requests.
- [x] #2 If the team is later closed again through the same control after creation, the existing join-policy update flow still works.
- [x] #3 When a team admin renames a team, the server returns an updated unique slug derived from the new name and participant team links follow that new slug.
- [x] #4 The canonical docs describe team slugs as renameable rather than permanently stable after creation.
- [x] #5 Local validation passes with bun run lint, bun run typecheck, and bun run test:unit.
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Update the canonical docs and team API contract so team slugs are described as derived from the current team name rather than frozen after creation.
2. Patch the provisional join-policy toggle in the participant Team tab to persist the solo team through the existing create-team path on first enable, while preserving the existing persisted-team join-policy mutation flow.
3. Update the team profile patch route to regenerate a unique team slug when the team name changes, then keep the current Team-tab route query aligned if it was pointing at the old slug.
4. Add regression coverage in the integration and unit/BDD suites for the new slug behavior and the provisional create-on-toggle flow, then run bun run lint, bun run typecheck, and bun run test:unit.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Patched the participant Team tab so enabling join requests from a provisional solo team now persists the team through the existing create-team flow instead of only mutating local form state. The toggle now reverts on failed creation and shows a success toast when the team is created from that action.

Updated the team profile patch route to regenerate a unique slug when the team name changes. The participant Team tab now keeps an active `team` query aligned with the renamed team slug so direct team links do not immediately go stale after a rename.

Updated canonical docs to replace the prior stable-team-slug rule, added unit coverage for selected-team slug syncing, expanded the team-formation integration route coverage for rename-time slug regeneration, and added BDD coverage for provisional team creation through the join-policy switch. Validation passed with `bun run lint`, `bun run typecheck`, `bun run test:unit`, and `bun x vitest run --config vitest.integration.config.ts tests/integration/server/api/team-formation-routes.test.ts`. The full Auth0-backed BDD suite was not run in this pass.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Fixed the provisional solo-team join-policy flow so enabling join requests now creates the team immediately through the existing participant create-team path instead of leaving the change in local-only state. The participant Team tab reuses the seeded solo-team name for that first persistence step, preserves the existing join-policy update behavior after the team exists, and reverts the local switch if creation fails.

Changed the canonical team-slug model so renaming a team regenerates a unique slug derived from the new name. The team profile patch route now returns the new slug on rename, and the participant Team tab keeps an active `team` query synchronized to that new slug when the page was already pointing at the renamed team.

Updated the canonical docs in `docs/domain-model.md`, `docs/api-surface.md`, and `docs/schema-outline.md`; added unit coverage in `tests/unit/app/utils/team-query.test.ts`; expanded the team-formation API integration test in `tests/integration/server/api/team-formation-routes.test.ts`; and added BDD coverage for provisional-team join-policy creation in `tests/bdd/features/authenticated/team-workspace.feature` plus its step definitions. Validation passed with `bun run lint`, `bun run typecheck`, `bun run test:unit`, and the targeted team-formation integration suite. The full Auth0-backed BDD suite was not run locally in this pass.
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
