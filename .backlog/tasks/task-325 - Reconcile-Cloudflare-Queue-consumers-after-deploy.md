---
id: TASK-325
title: Reconcile Cloudflare Queue consumers after deploy
status: Done
assignee:
  - Codex
created_date: '2026-05-28 21:38'
updated_date: '2026-05-28 21:49'
labels:
  - deploy
  - cloudflare
dependencies: []
modified_files:
  - .github/workflows/ci.yml
  - .github/workflows/release-production.yml
  - package.json
  - tools/deploy/generate-wrangler-config.ts
  - tools/deploy/reconcile-queue-consumers.ts
  - tests/unit/tools/deploy/generate-wrangler-config.test.ts
  - tests/unit/tools/deploy/reconcile-queue-consumers.test.ts
  - DEVELOPMENT.md
  - OPERATOR.md
priority: medium
ordinal: 28000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Make queue consumer setup idempotent for remote deploys. Wrangler deploy currently fails when an inactive Queue consumer still exists, because the generated config asks Wrangler to create consumers during deploy. Move consumer reconciliation into an explicit post-deploy step that can remove the target Worker consumer and add it back with the desired settings.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Generated Wrangler deploy config no longer creates Queue consumers during `wrangler deploy`.
- [x] #2 Dev and production workflows reconcile desired Queue consumers after the Worker deploy completes.
- [x] #3 The reconcile step removes the target Worker consumer when present or inactive and tolerates missing consumers.
- [x] #4 Desired queue consumer settings still come from the same generated deploy configuration values.
- [x] #5 Docs explain that Queue consumers are reconciled after deploy and that inactive consumers still occupy the single Worker consumer slot.
- [x] #6 Focused unit tests cover generated queue consumer config and reconcile command behavior.
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Split generated queue data so Wrangler deploy config contains producer bindings only while desired consumer settings are built from the same resolved deploy input.
2. Add a deploy helper that removes the configured Worker consumer for each desired queue while ignoring not-found errors, then adds it with configured batch and retry settings.
3. Wire dev and production workflows to deploy the Worker first and reconcile Queue consumers immediately after deploy.
4. Update operator/development docs to describe post-deploy Queue consumer reconciliation and the Cloudflare inactive-consumer caveat.
5. Add focused tests for generated config shape and queue consumer reconcile commands, then run required validation before committing and pushing.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Validation passed locally: `bunx vitest run tests/unit/tools/deploy/generate-wrangler-config.test.ts tests/unit/tools/deploy/reconcile-queue-consumers.test.ts`, `git diff --check`, `bun run lint`, `bun run typecheck`, and `bun run test:unit`.

The pushed CI run `26604046951` reached `Reconcile shared dev Queue consumers` and failed because Wrangler reports a missing consumer as `No worker consumer 'dev-codex-events' exists for queue ...`; the reconcile helper needs to treat that wording as a missing-consumer response.

Updated the missing-consumer matcher to include Wrangler's `No worker consumer ... exists for queue ...` wording and added that exact shape to the reconcile unit test. Validation passed after the update: `git diff --check`, `bun run lint`, `bun run typecheck`, and `bun run test:unit`.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Summary:
- Removed Queue consumers from generated Wrangler deploy config so `wrangler deploy` no longer tries to create them.
- Added a post-deploy Queue consumer reconciliation helper and wired dev/production workflows to run it after Worker deploy.
- Updated operator and development docs with the inactive-consumer caveat and required Wrangler consumer commands.
- Added focused unit coverage for generated consumer settings and reconcile remove/add behavior, including Wrangler's `No worker consumer ... exists` missing-consumer response.

Tests:
- `bunx vitest run tests/unit/tools/deploy/generate-wrangler-config.test.ts tests/unit/tools/deploy/reconcile-queue-consumers.test.ts`
- `bunx vitest run tests/unit/tools/deploy/reconcile-queue-consumers.test.ts`
- `git diff --check`
- `bun run lint`
- `bun run typecheck`
- `bun run test:unit`

Remote CI:
- Run `26604046951` confirmed the Worker deploy now succeeds and the remaining failure was the missing-consumer wording fixed in the follow-up commit.

Risks and follow-ups:
- The reconcile step removes the configured Worker consumer. If a queue is occupied by a different Worker consumer, Cloudflare will still reject the add and an operator should remove that conflicting consumer intentionally.
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
