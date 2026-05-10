---
id: TASK-310
title: Run post-TASK-307 terminology sanity check
status: Done
assignee:
  - Codex
created_date: '2026-05-10 18:13'
updated_date: '2026-05-10 18:22'
labels:
  - task-307
  - terminology
  - docs
  - copy
dependencies: []
references:
  - docs/domain-model.md
  - docs/api-surface.md
  - README.md
  - DEVELOPMENT.md
  - app/pages
  - app/components
  - tests
documentation:
  - docs/README.md
  - docs/domain-model.md
modified_files:
  - app/components/admin/EventConfigForm.vue
  - app/pages/admin/events/new.vue
  - server/api/events/index.post.ts
  - server/domains/events/index.ts
  - tests/integration/server/api/event-routes.test.ts
  - tests/unit/server/domains/events/index.test.ts
  - .backlog/tasks/task-310 - Run-post-TASK-307-terminology-sanity-check.md
priority: medium
ordinal: 13000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
After TASK-307 generalized hackathons into typed events, audit public copy, canonical docs, routes, tests, and operator-facing docs for stale or misleading `hackathon` terminology. Preserve `hackathon` where it names the supported event type or user-facing event category, but update stale generic platform language to the current typed-event vocabulary. Record unresolved terminology questions instead of silently making product-language decisions.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Canonical docs consistently describe the platform using the current typed-event model, preserving `hackathon` only where it names a supported event type/category.
- [x] #2 Public and actor-facing UI copy does not expose stale internal `hackathon` naming where the current actor should see `event`.
- [x] #3 Developer/operator docs and obvious tests are updated where stale generic terminology would confuse contributors or adopters.
- [x] #4 Code identifiers are not renamed unless they directly surface as user-facing copy or contradict the canonical model; avoid broad refactors during this sanity pass.
- [x] #5 Required validation passes before handoff: at least `bun run lint`, `bun run typecheck`, and targeted tests for touched copy/domain helpers.
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Scanned canonical docs, README, DEVELOPMENT.md, Vue pages/components, server domains, and tests for stale `hackathon` terminology after TASK-307. Canonical docs already describe Codex Events as a typed-event platform and remaining `Hackathon` usage in docs is tied to the supported competition event type.

Found one concrete mismatch behind the terminology pass: common application settings were split incorrectly in the event creation/configuration flow. `requireProofOfExecution` is documented as a shared application requirement for all event types, while submission summary/repository/demo requirements are Hackathon-only. The admin form and create route now preserve proof-of-execution for Meetup/Build events and keep only submission-specific requirements behind the Hackathon gate. Update payloads now allow common application requirement patches on registration-only events, while competition-only submission settings still reject for Meetup/Build.

Validation run: `bunx vitest run tests/unit/server/domains/events/index.test.ts`; `bun run test:integration -- tests/integration/server/api/event-routes.test.ts`; `bun run lint`; `bun run typecheck`; `bun run test:unit`; `git diff --check`. All passed.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Summary:
- Confirmed canonical docs and public README already use the typed-event vocabulary introduced by TASK-307; remaining `Hackathon` language is used where it names the supported competition event type.
- Fixed the event admin creation/configuration flow so shared application requirements are available for Meetup/Build events, while submission-specific settings remain Hackathon-only.
- Aligned create/update serialization and tests with the documented split between common application settings and competition-only submission settings.

Validation:
- Passed: bunx vitest run tests/unit/server/domains/events/index.test.ts.
- Passed: bun run test:integration -- tests/integration/server/api/event-routes.test.ts.
- Passed: bun run lint.
- Passed: bun run typecheck.
- Passed: bun run test:unit.
- Passed: git diff --check.

Risks/follow-ups:
- No unresolved terminology follow-up from TASK-310. Broad internal identifiers such as `isHackathon` were left in place where they only express the event-type branch in code.
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
