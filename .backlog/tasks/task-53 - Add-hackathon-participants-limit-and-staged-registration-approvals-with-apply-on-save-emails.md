---
id: TASK-53
title: >-
  Add hackathon participants limit and staged registration approvals with
  apply-on-save emails
status: Done
assignee: []
created_date: '2026-03-28 11:12'
updated_date: '2026-03-28 11:22'
labels: []
dependencies: []
priority: high
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Implement three related admin-review enhancements: (1) add a participants-limit field on Hackathons, (2) surface that limit clearly in the admin application-approval UI, and (3) replace immediate application review transitions with a staged pre-approval flow persisted in DB where admin-set decisions are only applied and emailed when Save is triggered.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Hackathon data model, API contracts, and admin create/edit flows include a participants limit field persisted in DB.
- [x] #2 Admin operations application-review panel clearly shows participants limit context including approved count against limit.
- [x] #3 Admin can stage approve or reject decisions per submitted application and the staged decision is persisted in DB.
- [x] #4 A Save action applies staged decisions in batch and enqueues corresponding decision emails only at save time.
- [x] #5 Automated tests cover the new DB fields and staged-approval apply behavior.
<!-- AC:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Implemented participants-limit and staged application review workflow end-to-end. Added DB fields (`hackathons.participants_limit`, `user_applications.pre_approval_status`) with migration `drizzle/0017_participants_limit_and_preapproval.sql`, wired API contracts and serializers, and updated admin create/edit forms to support participants limit. Changed application approve/reject actions to stage decisions only, and added `POST /api/hackathons/:hackathonId/applications/actions/apply-staged-decisions` to apply all staged decisions, transition final status, write review metadata/audit logs, and enqueue emails at save time. Updated admin operations UI to show participants-limit context clearly, expose staged decision state, and add a Save staged decisions action. Updated canonical docs (`docs/domain-model.md`, `docs/schema-outline.md`, `docs/lifecycle-and-state-machines.md`, `docs/api-surface.md`) to match behavior. Updated unit/integration/bdd tests impacted by the new workflow. Validation run: `bun run test:unit` passed (34 files, 153 tests).
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
