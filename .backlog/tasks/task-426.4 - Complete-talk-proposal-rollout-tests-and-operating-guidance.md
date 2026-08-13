---
id: TASK-426.4
title: Complete talk-proposal rollout tests and operating guidance
status: Done
assignee:
  - '@codex-talks'
created_date: '2026-08-13 20:10'
updated_date: '2026-08-13 22:05'
labels:
  - testing
  - docs
  - cloudflare
  - meetup
dependencies:
  - TASK-426.3
modified_files:
  - wrangler.jsonc
  - tools/deploy/generate-wrangler-config.ts
  - server/middleware/local-d1-binding.ts
  - tests/unit/tools/deploy/generate-wrangler-config.test.ts
  - tests/unit/tools/deploy/reconcile-queue-consumers.test.ts
  - tests/unit/server/middleware/local-d1-binding.test.ts
  - .github/workflows/deploy-production.yml
  - .github/workflows/deploy-test.yml
  - README.md
  - OPERATOR.md
  - DEVELOPMENT.md
  - tests/bdd/features/authenticated/talk-proposals.feature
  - tests/bdd/steps/talk-proposals.steps.ts
parent_task_id: TASK-426
priority: high
type: task
ordinal: 121000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Finish the optional Meetup call-for-talks feature for production operation. Close end-to-end test gaps, configure the decision-email queue in every environment, document deployment order and local verification, and run the full repository validation suite.

The additive D1 migration and queue resources must be deployed before application code. Operators need retry and outcome monitoring guidance that avoids proposal bodies. README wording is adopter-facing and should describe optional private Meetup talk proposals without implying a public speaker directory or automatic agenda creation.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 README describes optional Meetup calls for talks accurately and does not promise public accepted talks or agenda synchronization.
- [x] #2 OPERATOR.md and deployment tooling define the talk-decision email queue, producer/consumer bindings, migration-before-release order, retries, and monitoring without logging proposal bodies.
- [x] #3 DEVELOPMENT.md documents local proposal, decision-email, and relevant fixture/testing workflows.
- [x] #4 Unit and integration suites cover validation, eligibility, lifecycle, decision rules, email formatting, API permissions, deadlines, changed application status, queue retry/idempotency, and account deletion.
- [x] #5 BDD coverage includes participant draft/submit/withdraw/revise/resubmit, staff read-only review, admin accept/reject, decision email, public callout, and hidden/disabled/closed/completed states.
- [x] #6 The migration and queue configuration are represented consistently in local, test, development, and production Cloudflare configuration generation.
- [x] #7 bun run lint, bun run typecheck, bun run test:unit, bun run test:integration, bun run test:bdd, bun run build:cloudflare, and git diff --check all pass.
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
1. Record the final BDD coverage gap: API rejection did not prove the rendered admin reject control required by the rollout criterion.
2. Carry forward the TASK-426.3 browser scenario that clicks Do not accept, verifies the optional message and rejected state, and checks durable decision-email enqueue evidence.
3. Re-run focused Talk BDD plus Talk API/queue and runtime/deployment config tests on the current combined tree.
4. Re-check the reopened rollout criteria only from current evidence and finalize TASK-426.4 while leaving parent TASK-426 In Progress.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Research: existing local wrangler has three producer/consumer queues; remote generator intentionally emits producers only and a separate buildDeployQueueConsumerConfigs list for consumer reconciliation. local-d1-binding proxies producer bindings. MCP added namespace 1005/2005/3005 and related generated-config assertions; all queue patches must append without changing those values. Existing operator/developer docs group application review, outcome, and Luma queues and are the correct place to add Talk proposal decision delivery.

Final verification on the combined tree: expanded Talk BDD passed 1/1 and covers public handoff/content isolation, create/submit/withdraw/revise/resubmit, staff read-only review, admin acceptance with message, and email enqueue. Focused current-tree unit/integration/config matrix passed 21/21 across generator, consumer reconciliation, local binding, Talk domain/email, and API routes; Nuxt typecheck and git diff --check passed. The MCP owner independently reported the final combined full lint, typecheck, unit, integration, BDD, and Cloudflare build suite passing after the shared queue reconciliation expectations were updated. Disabled, closed, changed-application, completed, retry/idempotency, deletion, and final-decision branches are exercised in the focused domain/API suites; public hidden-event behavior remains in the existing public BDD suite.

Cross-review remediation (2026-08-13): reopened pending the preceding fixes. Operator retry language was not supported by a durable producer-recovery mechanism, and rollout evidence did not cover all disabled/upcoming/open/closed/completed, rejection, race, duplicate-delivery, and rendered-UI branches.

Remediation rollout scope: existing 0072 remains the additive pre-deploy migration because the feature has not shipped; no backfill or runtime compatibility path is introduced. The stable ten REST operation contracts are unchanged.

Remediation verification on the quiescent combined tree: durable pending/enqueue/delivery state with producer and consumer leases supports scheduled and startup reconciliation after enqueue failure; deterministic delivery identity and conditional claims make duplicate and concurrent attempts safe within the documented Cloudflare Queues at-least-once model. Expanded coverage includes successful rejection, concurrent decisions, producer enqueue failure and recovery, duplicate delivery, create-disable races, retained-owner tab visibility, staff read-only and admin controls, all public callout states, and owner mutation after event completion. Focused Talk BDD passed 3/3; queue unit passed 8/8; API integration passed 8/8; migration passed 26/26; focused UI passed 37/37; generated/runtime config passed 14/14. Final combined validation reported by the MCP owner passed lint, typecheck, unit (121 files/824 tests), escalated full integration, escalated full BDD, Cloudflare build, and git diff --check. No Talk REST path, route header, request schema, or response schema changed, and all ten operations remain in the exact MCP registry.

Final rollout review (2026-08-14): reopened because AC #5 explicitly names admin accept/reject BDD coverage, while the prior rendered flow covered acceptance and rejection only at the API integration layer.

Final BDD remediation verified on the current tree: focused Talk browser feature passed 4/4, including both rendered acceptance and rejection through real admin controls. The rejection scenario verifies the optional speaker message, Not accepted reviewer detail, rejected response state, enqueue result, and durable decisionEmailQueuedAt timestamp. Affected Talk domain/queue/runtime/deploy unit tests passed 28/28; Talk API plus migration integration tests passed 34/34; targeted ESLint and git diff --check passed. The earlier combined quiescent-tree full lint, typecheck, 824 unit tests, 379 integration tests, 59 BDD tests, Cloudflare build, and diff check remain the broad rollout evidence because this follow-up changed only BDD feature/step coverage.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Completed rollout coverage for both admin Talk-proposal decisions. The rendered browser suite now clicks Accept talk and Do not accept, verifies the optional decision message and final status, and proves durable decision-email enqueue state. Current focused Talk BDD passed 4/4, affected unit/config tests passed 28/28, and API/migration integration tests passed 34/34; prior full combined validation remains green.
<!-- SECTION:FINAL_SUMMARY:END -->
