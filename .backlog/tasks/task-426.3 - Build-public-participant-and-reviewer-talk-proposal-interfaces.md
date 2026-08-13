---
id: TASK-426.3
title: Build public participant and reviewer talk-proposal interfaces
status: Done
assignee:
  - '@codex-talks'
created_date: '2026-08-13 20:10'
updated_date: '2026-08-13 22:04'
labels:
  - frontend
  - vue
  - meetup
dependencies:
  - TASK-426.1
  - TASK-426.2
modified_files:
  - app/domains/events/records.ts
  - app/domains/events/admin-event.ts
  - app/domains/events/presentation.ts
  - app/domains/events/account-workspace-tabs.ts
  - app/domains/events/account-workspace-seo.ts
  - app/domains/talk-proposals.ts
  - app/components/admin/EventTalkProposalControl.vue
  - app/components/admin/EventConfigForm.vue
  - app/components/admin/AdminEventCreateEditForm.vue
  - app/components/public/events/EventTalkProposalCallout.vue
  - app/components/account/events/AccountEventTalkProposalPanel.vue
  - app/components/account/events/AccountEventTalkProposalReviewPanel.vue
  - app/pages/admin/events/new.vue
  - 'app/pages/events/[slug]/index.vue'
  - 'app/pages/account/events/[slug]/index.vue'
  - tests/unit/app/domains/events/admin-event-schema.test.ts
  - tests/unit/app/domains/events/account-workspace-tabs.test.ts
  - tests/unit/app/domains/talk-proposals.test.ts
  - tests/bdd/features/authenticated/talk-proposals.feature
  - tests/bdd/steps/talk-proposals.steps.ts
parent_task_id: TASK-426
priority: high
type: task
ordinal: 120000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Build the user-facing Meetup talk-proposal surfaces after the contracts and APIs exist. Participant copy must use Call for talks and Talk proposal. Internal schema, lifecycle, queue, or authorization language must not leak into the interface.

Public Meetup pages show a callout while the proposal window is upcoming or open and send people through the existing registration/account handoff. The account event workspace gets a Talk proposal tab for applicants who are currently eligible and for anyone who already owns a retained proposal. Staff/admin reviewers get list/detail access; only admins see decision controls. No proposal or accepted-talk content is public and no agenda item is created.

Before creating components, find the closest participant-submission and application-review analogs. Reuse App wrappers, vee-validate/Zod patterns, and one visual container depth. Route pages stay orchestration-only.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Event create/settings UI exposes the three Meetup-only proposal configuration controls, validates the independent window, and prevents invalid disable/completion changes with actor-native copy.
- [x] #2 Public Meetup view shows a Call for talks action only while upcoming or open and uses the existing registration/account handoff for anonymous or unregistered visitors.
- [x] #3 No submitted, accepted, or rejected proposal content appears on public pages and decisions do not create or modify agenda entries.
- [x] #4 Account workspace tab visibility includes eligible applicants and retained proposal owners even if their application later becomes rejected or withdrawn.
- [x] #5 Participant UI supports create/edit draft, submit, withdraw, revise, resubmit, and read-only submitted/decided states with clear deadline and eligibility behavior.
- [x] #6 Reviewer UI provides paginated list/detail to staff/admins, keeps staff read-only, and exposes accept/reject plus optional message only to event/platform admins.
- [x] #7 Components reuse existing App and domain patterns, use Composition API with script setup TypeScript, keep props/events typed, avoid nested card surfaces, and leave route pages as composition surfaces.
- [x] #8 Component and browser tests cover public visibility, handoff, participant transitions, retained visibility, staff read-only behavior, and admin decisions.
<!-- AC:END -->

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

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Re-read the current rendered Talk reviewer BDD and review-panel decision controls on the combined tree.
2. Extend browser BDD so an admin opens a submitted proposal, uses Do not accept, enters and verifies the optional decision message, sees rejected status, and observes decision-email queue/delivery evidence.
3. Run the focused Talk BDD plus affected UI/domain tests and targeted lint/diff checks.
4. Re-check only the reopened UI acceptance criteria from rendered evidence, finalize TASK-426.3, then activate TASK-426.4 for rollout-test evidence.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Component map: EventConfigForm remains the existing admin configuration surface; ParticipantTalkProposalPanel owns proposal form/status/actions and emits refresh; TalkProposalReviewPanel owns private list/detail and emits decision refresh; account/events/[slug]/index.vue only composes tabs and passes event/role context; public event detail composes one callout using existing AppCard/AppButton patterns. Closest analogs are ParticipantTeamSubmissionPanel and AdminApplicationsReviewPanel; separate components are required because Talk proposals are user-owned Meetup content with a different lifecycle and reviewer permission split.

Implemented EventTalkProposalControl, public EventTalkProposalCallout, private participant and reviewer panels, retained-owner tab access, and public-content isolation. Validation evidence: targeted ESLint passed; Nuxt typecheck passed; 67 focused UI-domain tests passed; focused Playwright BDD Call for talks scenario passed end to end. The initial browser run exposed and fixed two integration defects: serializeEvent omitted Call for talks fields, and URL validation threw on an empty optional URL. Full BDD before the fixes reached 50/52 with the Talk scenario failure plus one unrelated existing team-workspace navigation timeout; focused Talk BDD is now green.

Cross-review remediation (2026-08-13): reopened pending backend fixes. Participant mutations had an extra event-completed restriction, workspace tab visibility was broader than the canonical predicate and lacked an exact retained-proposal signal, and reviewer/staff/component rendered coverage was incomplete.

Remediation component map remains unchanged: route page owns data orchestration and exact tab signals; AccountEventTalkProposalPanel owns participant actions; AccountEventTalkProposalReviewPanel owns reviewer visibility/actions; EventTalkProposalCallout owns public upcoming/open display. No new app component is needed.

Remediation implemented: participant mutation availability is now exactly submitted/approved application plus independent open Call for talks; event completion is not an owner-mutation guard. The account route loads the exact own-proposal record, preserves it as a retained-owner signal, and updates that signal from the participant panel; the tab predicate is eligible current applicant OR retained owner OR reviewer. Staff/admin browser flow now renders the reviewer panel and proves staff has no message/decision controls while admin can decide through the UI. Validation: 37 focused UI-domain tests passed; three focused Playwright BDD scenarios passed and render public callout, participant panel, reviewer panel, retained-owner-only tab, disabled/upcoming/open/closed/completed-open public states, and completed-event withdrawal; Nuxt typecheck, targeted ESLint, and git diff --check passed.

Final coverage review (2026-08-14): reopened because the rendered admin BDD exercised acceptance only. API-level successful rejection does not objectively satisfy the explicit browser/component admin accept/reject coverage requirement.

Final rendered rejection coverage: added a separate browser scenario where a platform admin opens the private reviewer workspace for a submitted proposal, enters an optional speaker message, clicks Do not accept, sees the Not accepted detail state and persisted message, verifies the rejected API status, and verifies both the enqueue result and durable decisionEmailQueuedAt delivery state. Focused Talk BDD passed 4/4. Affected UI/domain/queue unit tests passed 71/71; targeted TypeScript/Vue ESLint and git diff --check passed.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Completed rendered reviewer decision coverage for both outcomes. The browser suite now exercises the admin Do not accept control with an optional speaker message, rejected status, and durable decision-email enqueue evidence, alongside the existing acceptance and staff read-only paths. Focused Talk BDD passed 4/4 and affected tests passed 71/71.
<!-- SECTION:FINAL_SUMMARY:END -->
