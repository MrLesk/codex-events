---
id: TASK-372
title: Stop auto approval at participant limit
status: Done
assignee:
  - Codex
created_date: '2026-06-04 18:28'
updated_date: '2026-06-04 18:36'
labels:
  - bug
  - participants
dependencies: []
modified_files:
  - docs/api-surface.md
  - docs/domain-model.md
  - docs/lifecycle-and-state-machines.md
  - docs/schema-outline.md
  - 'server/api/events/[eventId]/applications/index.post.ts'
  - tests/integration/server/api/application-routes.test.ts
priority: medium
ordinal: 68000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
When an event uses participant limits together with auto approval, automatic approval must only apply while the event still has available participant capacity. Once the approved participant count reaches the configured participant limit, new applicants remain pending so event staff can manually approve participants above the cap when they intentionally choose to do so.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Auto approval approves a new participant only when the approved participant count is below the configured participant limit.
- [x] #2 When the configured participant limit has been reached, new participant applications remain pending even if auto approval is enabled.
- [x] #3 Manual participant approval remains available after the event reaches the participant limit so staff can approve participants above the cap intentionally.
- [x] #4 Relevant validation covers the participant-limit and auto-approval interaction.
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Inspect canonical docs and the existing registration/participant approval implementation to confirm the current participant-limit and auto-approval model.
2. Locate the auto-approval decision point and update it so auto approval only applies while approved participant count is below the configured participant limit.
3. Preserve the manual approval path after the cap is reached so staff can intentionally approve participants above the cap.
4. Add or update focused tests for the participant-limit and auto-approval interaction.
5. Run required validation (`bun run lint`, `bun run typecheck`, `bun run test:unit`) plus broader tests if the touched area requires them, then finalize the Backlog task and commit/push the task file with code changes.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Implementation completed by changing application submission to insert new applications as submitted, then conditionally promote to approved only when auto approval is enabled and approved participant count remains below the configured participant limit. Manual staged approvals are unchanged and can still approve above the limit.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Summary:
- Updated application submission so auto approval performs a conditional promotion after insert and stops once the configured participant limit is reached.
- Preserved staged/manual admin approval behavior above the participant limit.
- Updated canonical docs to describe the participant limit as the capacity boundary for automatic approval only.
- Added integration coverage for auto approval below the cap, submitted/manual-review behavior at the cap, and manual approval above the cap.

Validation:
- `bunx vitest run --config vitest.integration.config.ts tests/integration/server/api/application-routes.test.ts`
- `bun run lint`
- `bun run typecheck`
- `bun run test:unit`
- `bun run test:integration`
- `bun run test:bdd`
- `git diff --check`

Risks and follow-ups:
- No known follow-up work. The manual approval path remains intentionally non-blocking because the participant limit is still an admin planning target outside automatic approval.
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
