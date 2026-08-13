---
id: TASK-426.1
title: Define Meetup talk-proposal contracts data model and lifecycle
status: Done
assignee:
  - '@codex-talks'
created_date: '2026-08-13 20:10'
updated_date: '2026-08-13 21:16'
labels:
  - backend
  - docs
  - database
  - meetup
dependencies: []
modified_files:
  - docs/domain-model.md
  - docs/lifecycle-and-state-machines.md
  - docs/permissions-matrix.md
  - docs/schema-outline.md
  - docs/api-surface.md
  - docs/testing-strategy.md
  - docs/tech-stack.md
  - server/database/schema.ts
  - drizzle/0072_talk_proposals.sql
  - server/domains/events/index.ts
  - server/domains/talk-proposals/index.ts
  - server/api/events/index.post.ts
  - 'server/api/events/[eventId]/index.patch.ts'
  - tests/unit/server/domains/talk-proposals/index.test.ts
parent_task_id: TASK-426
priority: high
type: task
ordinal: 118000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Start by making optional Meetup talk proposals canonical product truth, then implement the event configuration, database model, validation, lifecycle, and domain services. A Meetup remains registration-focused; this is a private call for talks, not a hackathon submission or public agenda system.

Add talkProposalsEnabled, talkProposalOpensAt, and talkProposalClosesAt to event create/update/read contracts. Only Meetups may enable it. Enabled Meetups require their own valid open/close window; existing Meetups stay disabled with null dates. Once any proposal exists the feature cannot be disabled, although an admin may change the closing time before event completion.

Add one private talk proposal per event/user with draft/submitted/withdrawn/accepted/rejected lifecycle, title, abstract, optional HTTP(S) demo-or-slides URL, decision data, reviewer, timestamps, and email delivery state.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Canonical domain, lifecycle, permissions, schema, API, and testing documents define talk proposals, actor language, visibility, eligibility, transitions, deadlines, decisions, and non-goals before code behavior diverges.
- [x] #2 Event create/update/read Zod contracts and serializers include all three configuration fields with Meetup-only and open-before-close validation.
- [x] #3 Existing Meetups default to disabled and null dates, non-Meetups cannot enable or retain proposal dates, and configuration changes are covered by tests.
- [x] #4 An additive D1 migration and Drizzle schema define talk_proposals with one row per event/user, allowed statuses, required fields, reviewer/email timestamps, foreign keys, and event/status review indexes.
- [x] #5 Admins cannot disable proposals after the first proposal exists and cannot change proposal configuration after event completion; closing-time changes before completion remain allowed.
- [x] #6 Domain services enforce draft to submitted to withdrawn to draft, submitted to accepted/rejected, read-only submitted state, final decisions, and deadline rules without compatibility fallbacks.
- [x] #7 Create/submit eligibility requires the owner application to be submitted or approved; later rejected/withdrawn applications preserve proposal visibility/reviewability but pause owner mutations until restored before deadline.
- [x] #8 Focused unit tests cover configuration, URL validation, unique ownership, eligibility, transitions, deadlines, and event completion rules.
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
1. Reconcile canonical lifecycle/schema/API/operations guidance with durable pending decision delivery, at-least-once queue semantics, conditional final decisions, and write-time configuration eligibility.
2. Extend the additive schema/migration and domain writes with decision CAS, durable enqueue/delivery state and leases, deterministic delivery identity, and mutually exclusive create/disable conditions.
3. Add focused domain and persistence race tests, run validation, document evidence, and finish 426.1 before activating 426.2.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Research: classified L2/high-risk. Closest anchors are server/domains/events for event contracts and serializers, server/database/schema.ts plus additive drizzle SQL, server/domains/submissions for lifecycle/deadline guards, and server/domains/applications for eligibility/status handling. UI/API/email work remains in dependent subtasks.

Implemented canonical documentation, Event configuration contracts/serializers, additive migration 0072, Drizzle talk_proposals model, configuration-lock helper, and focused talk-proposal domain services.
Validation: 33 focused unit tests passed; migration suite 26 tests passed; targeted ESLint passed; git diff --check passed. Full typecheck passed before concurrent TASK-425 files landed, then became blocked only by current TASK-425 errors in server/auth/actor.ts and server/application/operations/{catalog,execute}.ts; no TASK-426 type errors were reported.

Cross-review remediation (2026-08-13): reopened because final decision persistence and event/proposal configuration writes were not concurrency-safe. The canonical delivery model and schema also lacked a durable pending/reconciliation and consumer lease model. AC 1, 4, 5, 6, and 8 plus DoD 1-5 and 8 require renewed evidence.

Remediation implemented: canonical docs now define decision CAS, durable pending delivery state, producer/consumer leases, deterministic delivery identity, and honest Cloudflare Queue at-least-once limits. The TalkProposal schema and 0072 migration include durable delivery state/counters/leases/indexes. Creation verifies Meetup/window/application eligibility in the insert statement; disabling uses a NOT EXISTS condition in the event write. Final decisions conditionally update only submitted proposals and atomically create pending delivery state. Validation: focused domain 6/6, talk API integration 6/6 including create-versus-disable race, migration integration 26/26, Nuxt typecheck, targeted ESLint, and git diff --check passed.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Hardened the canonical Talk proposal persistence model against concurrent decisions and create-versus-disable races. Decisions now use a submitted-status compare-and-swap that atomically records durable pending email delivery state; proposal creation and disabling are mutually exclusive at write time. Verified with 12 focused domain/API tests, 26 migration tests, typecheck, targeted lint, and diff checks.
<!-- SECTION:FINAL_SUMMARY:END -->
