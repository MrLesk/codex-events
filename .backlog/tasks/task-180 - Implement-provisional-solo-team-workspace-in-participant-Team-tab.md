---
id: TASK-180
title: Implement provisional solo-team workspace in participant Team tab
status: Done
assignee: []
created_date: '2026-04-04 08:27'
updated_date: '2026-04-04 10:47'
labels:
  - frontend
  - backend
  - docs
dependencies: []
priority: high
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Participants in the account hackathon Team tab should always work through a team workspace. Approved users without a persisted team should see a default one-person team derived from their platform profile, and the real team row should be created only when they confirm the team name or take another team action that requires persistence. After persistence, the experience should stay consistent with normal teams, including share-by-link and join-request flows.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Approved participants without an existing team see a default solo team workspace instead of a separate create-team flow
- [x] #2 The default solo team name is derived from the participant full name with display-name fallback and can be edited before persistence
- [x] #3 The first action that requires persistence creates the backing team row and keeps the participant in the same workspace flow
- [x] #4 Persisted team slugs use a random 4-digit suffix on creation and remain stable when the team name changes later
- [x] #5 Solo teams can be shared by link and used for join-request flows the same way as multi-member teams
- [x] #6 Participant Team tab copy and layout no longer frame solo participants as a separate mode from teams
- [x] #7 Relevant canonical docs and automated tests are updated for the new team behavior
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
Replace the standalone Team setup section with a header-level inline rename flow triggered by a pencil button next to the team name.

Keep the existing team-name validation and submit event, but gate the input and save button behind local editing state in ParticipantTeamWorkspacePanel.vue.

Update participant Team tab BDD steps to open the inline editor before filling the team name so the persisted-team flow stays covered.

Gate join-request props and section rendering behind admin membership on the currently viewed team so shared team visits do not expose request queues.

Filter participant directory entries to teams with open join policy before passing them to the directory panel, preserving existing pagination and selected-team behavior.

Revalidate with lint, typecheck, unit tests, and a live localhost check of both the viewed-team workspace and the other-teams list.

Update `updateCurrentTeamJoinPolicy` to apply the returned team detail to current/own/visible team state immediately, then refresh the directory asynchronously instead of blocking the pending action on a full reload.

Revalidate with lint, typecheck, unit tests, and the team-formation integration suite after the mutation-path change.

Align pending team join-request actions with the admin participants review button pattern by replacing the current AppButton approve/reject controls in ParticipantTeamWorkspacePanel.vue with the same outlined decision-button treatment, while keeping the existing immediate approve/reject mutation flow and pending-action keys.

Revalidate with lint, typecheck, unit tests, and a quick localhost check of the join-request card layout in the Team tab.

Pass `hackathon.maxTeamMembers` into `ParticipantTeamWorkspacePanel` and show a compact badge beside the `Team members` title using the existing active-member count (`activeMemberCount ?? members.length`) over the hackathon limit.

Move pending join-request approve/reject actions into the top row of the requester card so the action column sits beside the requester identity block, and add GitHub / LinkedIn / X links to both team-member cards and join-request cards using the existing admin review chip-link pattern.

Tighten the team-card social-link chips to a smaller footprint so they read like the participants metadata links instead of large standalone pills.

After join-request review, keep only pending requests in the Team tab join-request state and refresh the current team detail so approved users move into Team members while disappearing from Join requests. Also stop blocking the approve mutation on the visible-team directory reload.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Validated locally with `bun run lint`, `bun run typecheck`, `bun run test:unit`, and `bunx vitest run --config vitest.integration.config.ts tests/integration/server/api/team-formation-routes.test.ts`.

Verified the live localhost Team tab for an existing one-person team after the UI consolidation. The provisional no-team fixture route is not available in the local app instance, so that visual state was covered by code/test validation rather than a live browser route.

Follow-up UI tweak requested: provisional solo teams should start closed to join requests by default.

Adjusted follow-up scope to move team rename into the header as an inline pencil-triggered edit flow and remove the separate team-setup card.

Moved team renaming into a header-level inline edit flow triggered by a pencil button, removed the standalone Team setup card, updated the participant BDD rename step, revalidated with bun run lint, bun run typecheck, and bun run test:unit, and verified the live localhost Team tab interaction.

Follow-up scope: only team admins should see join requests for a viewed team, and the participant directory should only list teams that are open to join requests.

Follow-up refinement: the workspace now hides the join-requests panel unless the viewer can manage the selected team, and the participant team directory now loads only teams whose join policy is open. No canonical doc changes were needed because join requests were already defined as an admin review surface and the directory copy already described teams open to collaborators.

Follow-up latency fix: the join-policy toggle stays disabled until the visible-team directory reload completes because the mutation awaits `loadVisibleTeams`. Investigating a local-state update plus background refresh so the toggle unlocks as soon as the PATCH succeeds.

Resolved follow-up latency issue in the join-policy toggle: `updateCurrentTeamJoinPolicy` was still awaiting `loadVisibleTeams`, which kept `pendingActionKey` set until the filtered team-directory GET finished. Changed the directory reload to fire-and-forget so the switch unlocks as soon as the PATCH response updates the current team state.

Revalidated with `bun run lint`, `bun run typecheck`, `bun run test:unit`, and `bunx vitest run --config vitest.integration.config.ts tests/integration/server/api/team-formation-routes.test.ts`. Live localhost verification on `/account/hackathons/codex-vienna-2026-04-18?tab=team&team=the-good-gang` confirmed the switch can be toggled back immediately even while the background `teams?page=1&page_size=6&open_to_join=true` request is still pending.

Aligned the Team tab join-request approve/reject controls in `ParticipantTeamWorkspacePanel.vue` with the admin participants review button pattern: outlined decision buttons, thumbs-up/thumbs-down icons, and loader state on the active action. Kept the existing immediate approve/reject mutations and test ids unchanged.

Revalidated with `bun run lint`, `bun run typecheck`, and `bun run test:unit`. A live localhost page with pending team join requests was not available in the current session, so the follow-up was verified through code inspection plus standard validation rather than an interactive fixture.

Added a compact member-capacity badge beside the `Team members` heading in `ParticipantTeamWorkspacePanel.vue`, using `activeMemberCount ?? members.length` over `hackathon.maxTeamMembers` passed from `AccountHackathonParticipantTeamPanel.vue`. Revalidated with `bun run lint`, `bun run typecheck`, and `bun run test:unit`, and confirmed the live localhost Team tab shows `1 / 4` next to the section title.

Moved pending join-request approve/reject actions into the right-side action column of the requester card and added GitHub / LinkedIn / X chip links to both team members and join-request users in `ParticipantTeamWorkspacePanel.vue`. Revalidated with `bun run lint`, `bun run typecheck`, and `bun run test:unit`, and confirmed on localhost that the Team tab now shows member/requester profile links and still renders pending approve/reject actions correctly.

Tightened the team-card social links to a smaller metadata-style treatment in `ParticipantTeamWorkspacePanel.vue` by reducing padding, text size, and icon size. Revalidated with `bun run lint`, `bun run typecheck`, and `bun run test:unit`, and confirmed on localhost that the Team tab links now read much lighter than the previous pill style.

Adjusted the join-request card layout so the pending approve/reject action stack centers vertically against the requester details on large screens in `ParticipantTeamWorkspacePanel.vue`. Revalidated with `bun run lint`, `bun run typecheck`, and `bun run test:unit`; the current localhost session no longer had a pending request card after reload, so the centering change was verified from code/layout rather than a live pending-request snapshot.

Restricted the account hackathon `team` workspace tab to approved participants by changing `getAccountHackathonTabAccess()` to use `hasApprovedParticipantAccess` and passing `applicationStatus === 'approved'` from the page shell. The existing route normalization in `[slug]/index.vue` now falls non-approved `?tab=team` access back to the first allowed tab instead of rendering the team workspace.

Added unit coverage in `tests/unit/app/utils/account-hackathon-tabs.test.ts` for the non-approved participant case. Revalidated with `bun run lint`, `bun run typecheck`, and `bun run test:unit`. A local non-approved participant browser fixture was not available in the current session, so the URL-fallback behavior was verified through the updated access logic and tests rather than a dedicated live non-approved route.

Follow-up bug fix: approved join requests were still visible in the Team tab because the join-request state retained reviewed records after refresh. Adjust the workspace composable to keep only pending requests in that state and avoid blocking approve on the visible-team directory reload.

Fixed the Team-tab join-request stale state in `useTeamFormationWorkspace`: after reloading team join requests, the composable now keeps only `pending` requests in state, and `approveJoinRequest` refreshes the current team plus pending requests before kicking the visible-team directory reload into the background. Updated the join-request loading copy to refer to pending requests only and added `tests/unit/app/composables/useTeamFormationWorkspace.test.ts` to pin that an approved request moves into team members while disappearing from join requests. Revalidated with `bun run lint`, `bun run typecheck`, and `bun run test:unit`.

Follow-up UX bug: approving a join request past team capacity currently fails silently because the Team tab only shows a success toast on truthy approve results. Align the approve/reject mutation handling with the existing toast pattern by surfacing `workspace.mutationError` as an error toast when approve/reject returns null.

Added an error toast to the Team-tab approve handler so failed approval attempts, including max-team-size rejections, surface `workspace.mutationError` immediately instead of failing silently while only the inline alert updates. Revalidated with `bun run lint`, `bun run typecheck`, and `bun run test:unit`. No dedicated component test was added because this panel does not currently have a focused mount/toast harness in the unit suite.

Follow-up directory refinement: hide teams that have already reached the hackathon member limit from the participant `Other teams` list, alongside the existing open-to-join filter. Checking whether the filtering should live in the participant workspace layer or be added as a list API option.

Added `has_capacity` to the team list API and used it in the participant workspace directory fetch so `Other teams` now excludes teams that are already at the hackathon member limit while keeping pagination totals accurate. Refactored the client fetch helper so the directory uses `open_to_join + has_capacity`, but own-team lookup stays unfiltered. Added integration coverage for the new list filter and revalidated with `bunx vitest run --config vitest.integration.config.ts tests/integration/server/api/team-formation-routes.test.ts`, `bun run lint`, `bun run typecheck`, and `bun run test:unit`.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Implemented provisional solo-team behavior in the participant Team tab so approved participants without a persisted team now start from a default own-team workspace instead of a separate create-team flow. Sharing and submission actions can lazily persist the team, solo and multi-member teams now use the same primary workspace card, new team slugs use a stable name-based slug plus a 4-digit suffix, and renaming no longer changes the slug.

Refined the Team tab UI so provisional solo teams start closed to join requests by default, the redundant summary and collaboration panels are removed, the join-policy switch now lives in the header, and team renaming happens inline from a pencil-triggered edit state next to the team name instead of a separate setup card. Updated canonical docs plus the integration, unit, and BDD coverage to match the new behavior.

Validation: `bun run lint`, `bun run typecheck`, `bun run test:unit`, and earlier during the main implementation `bunx vitest run --config vitest.integration.config.ts tests/integration/server/api/team-formation-routes.test.ts`. Manual verification: reloaded the localhost Team tab, confirmed the top-right join-policy toggle layout, and verified the inline team-name editor appears from the header pencil action.

Refined the participant Team tab so join requests are only shown for team admins on the selected team, including shared-team visits, while the join-requests fetch remains admin-gated in the workspace composable. Also tightened the `Other teams` directory to request only teams with `isOpenToJoinRequests = true` via the list API, keeping totals and load-more behavior aligned with what participants can actually join.

Validation for this follow-up: `bun run lint`, `bun run typecheck`, `bun run test:unit`, and `bunx vitest run --config vitest.integration.config.ts tests/integration/server/api/team-formation-routes.test.ts`. Automated coverage now includes the open-team list filter. Live localhost verification confirmed the updated participant team layout after reload; non-admin shared-team visibility was enforced via the existing admin-gated join-request fetch path plus the new UI gate.

Final follow-ups completed before shipping: approved join requests now disappear from the Team-tab request list and the approved participant appears immediately under team members; failed approve attempts such as max-team-size violations now raise an error toast; and the participant `Other teams` directory now excludes teams that are closed or already at member capacity via list API filters that preserve correct pagination totals.
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
