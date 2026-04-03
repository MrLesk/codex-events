---
id: TASK-171
title: Add participant application withdrawal to account hackathon overview
status: Done
assignee:
  - codex
created_date: '2026-04-03 18:43'
updated_date: '2026-04-03 19:00'
labels:
  - participant
  - applications
  - account-workspace
  - docs
dependencies: []
priority: high
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Add canonical participant withdrawal support for hackathon applications as a retained `withdrawn` status rather than record deletion. Update the account hackathon overview to show a destructive withdrawal action with confirmation copy, and implement the supporting API, schema, docs, and tests in the narrowest safe scope. Initial scope assumption: self-serve withdrawal is allowed only when the participant has no active team membership in that hackathon.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Canonical docs define `withdrawn` as a terminal `UserApplication` state with retained record semantics and explicit participant-facing behavior
- [x] #2 Schema and API surface support participant-initiated application withdrawal with audit logging and no hard delete
- [x] #3 Account hackathon overview shows a destructive withdrawal action with confirmation and reflects withdrawn status in participant summaries
- [x] #4 Self-serve withdrawal is blocked when the participant still has an active team membership in the hackathon
- [x] #5 Unit and integration coverage exercise the new status and withdrawal route behavior
- [x] #6 Withdrawing from a Luma-enabled hackathon enqueues the canonical Luma rejection sync so the participant is removed from the event guest list.
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Update canonical docs to add `UserApplication.status = withdrawn`, define it as a retained terminal state, and document that self-serve participant withdrawal is allowed only when the participant has no active team membership in the hackathon.
2. Update persistence and shared application types to support the new state and `withdrawnAt`, including a Drizzle schema change and migration.
3. Add participant self-withdraw API support on the caller-owned application route, enforce own-application access plus the no-active-team guard, and write an audit record instead of deleting data.
4. Extend participant/account workspace helpers and overview UI to reflect `withdrawn` and expose a destructive withdrawal action with confirmation copy in the Overview tab.
5. Add or update unit and integration coverage for the new state and route behavior, then run lint, typecheck, unit tests, and the most relevant integration tests for the changed area.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Implemented application withdrawal as a retained `withdrawn` terminal state instead of deleting records, preserving terms-acceptance and audit history.

Scoped self-serve withdrawal to participants without an active team membership in the hackathon; active-team callers receive a blocking API error and a disabled overview action with the same reason.

Used a native confirmation popup in the account hackathon overview because this area does not currently have a reusable dialog primitive and the request only required a confirmation popup.

Validation completed with `bun run lint`, `bun run typecheck`, `bun run test:unit`, plus targeted integration coverage via `bunx vitest run --config vitest.integration.config.ts tests/integration/server/api/application-routes.test.ts`.

2026-04-03: Extended scope after user clarification that participant withdrawal must also remove the user from Luma for Luma-enabled hackathons.

Implementation will reuse the existing application Luma rejection sync path and queue semantics rather than introducing a withdrawal-only Luma state.

2026-04-03: Participant withdrawal now enqueues Luma rejection for Luma-enabled hackathons and stores `reject_failed` when queue enqueue is unavailable.

Final validation rerun passed: `bun run lint`, `bun run typecheck`, `bun run test:unit`, and `bunx vitest run --config vitest.integration.config.ts tests/integration/server/api/application-routes.test.ts`.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Added canonical participant application withdrawal as a retained `withdrawn` state across the docs, schema, API, and account workspace. The backend supports `POST /api/hackathons/:hackathonId/applications/me/actions/withdraw`, records `withdrawnAt`, clears staged pre-approval state, writes an audit log, blocks self-withdrawal when the caller still has an active team membership, and for Luma-enabled hackathons enqueues the canonical Luma rejection sync so the participant is removed from the event guest list.

The withdrawal flow now reuses the existing application Luma queue contract rather than introducing a withdrawal-specific external-sync model. When Luma enqueue is unavailable, the route still succeeds but stores `reject_failed` for operational follow-up, and startup recovery now re-enqueues stale withdrawn applications as rejected Luma syncs.

The participant overview warning and confirmation copy now mention Luma guest removal when applicable. Validation passed with `bun run lint`, `bun run typecheck`, `bun run test:unit`, and `bunx vitest run --config vitest.integration.config.ts tests/integration/server/api/application-routes.test.ts`.
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
