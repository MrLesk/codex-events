---
id: TASK-213
title: Automate dev and production Luma webhook reconciliation
status: Done
assignee:
  - Worker B
created_date: '2026-04-13 19:19'
updated_date: '2026-04-13 19:43'
labels: []
dependencies: []
documentation:
  - README.md
  - DEVELOPMENT.md
  - 'https://docs.lu.ma/reference/post_v1-webhooks-create'
  - 'https://docs.lu.ma/reference/post_v1-webhooks-update'
  - 'https://docs.lu.ma/reference/post_v1-webhooks-delete'
priority: high
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Add repository-owned automation to reconcile the Luma webhooks needed for attendance sync in both the shared dev and production environments. The automation should manage the expected webhook URL, event type subscription, and signing secret using the existing deployment and bootstrap patterns in this repository.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 A repository-owned check/apply command can reconcile the required guest.updated Luma webhook configuration for dev and production.
- [x] #2 The automation can create or update the managed webhook and capture the signing secret needed by the application runtime.
- [x] #3 The dev and production workflows run the reconciliation step and upload any required webhook secret to the deployed Worker securely.
- [x] #4 Contributor and operator docs explain the required configuration, automated behavior, and recovery path.
- [x] #5 Automated tests cover the webhook bootstrap command's request construction and drift detection behavior.
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Add `tools/luma/webhook-bootstrap.ts` following the existing repo bootstrap pattern with `check` and `apply` modes, env-driven configuration, exact-URL managed webhook reconciliation, duplicate cleanup for same-URL managed hooks, and optional `--secret-bulk-path` output for Worker secret upload.
2. Treat one exact webhook URL per environment as the repository-managed object: `https://dev.codex-hackathons.com/api/public/luma/webhooks` for shared dev and `https://codex-hackathons.com/api/public/luma/webhooks` for production, both subscribed to `guest.updated` and kept active.
3. Implement drift detection from paginated Luma webhook list results: missing, mismatched event types or status, duplicate exact-URL hooks, and compliant state; `check` exits non-zero on drift and `apply` reconciles by create/update/delete followed by a final `get` to capture the current signing secret.
4. Keep `NUXT_LUMA_WEBHOOK_SECRET` as the canonical runtime secret name but leave Nuxt runtime wiring to TASK-212; this task only produces and uploads that secret through deployment automation.
5. Integrate shared dev and production workflows so each environment reconciles its managed Luma webhook before Worker secret upload, merges the generated `NUXT_LUMA_WEBHOOK_SECRET` into the `wrangler secret bulk` payload, skips the step cleanly when `NUXT_LUMA_API_KEY` is absent, and removes temporary secret files afterward.
6. Add unit coverage for script config resolution, HTTPS URL enforcement, paginated list handling, drift detection, create/update/delete/get request construction, duplicate reconciliation, and generated secret-bulk file shape.
7. Update `.env.example`, `README.md`, and `DEVELOPMENT.md` to document the new webhook automation inputs, deployment behavior, and recovery flow without changing canonical product behavior docs.
8. Validate with targeted unit tests first, then `bun run lint`, `bun run typecheck`, `bun run test:unit`, and `bun run test:integration`, and append task notes for any material findings or limitations.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Supervisor assigned worker planning. No code changes approved yet; waiting for plan review.

Confirmed against the live Luma API with the repo token: `GET /v1/webhooks/list` returns top-level `entries`, while `POST /v1/webhooks/create`, `POST /v1/webhooks/update`, and `GET /v1/webhooks/get` return the managed webhook under a top-level `webhook` object. `POST /v1/webhooks/delete` returns an empty JSON object. The webhook secret is present in list/create/update/get responses, so the deploy workflows can regenerate and upload `NUXT_LUMA_WEBHOOK_SECRET` without storing it in GitHub environment secrets.

Implemented repository-owned Luma webhook bootstrap automation in `tools/luma/webhook-bootstrap.ts`, added unit coverage in `tests/unit/tools/luma/webhook-bootstrap.test.ts`, and wired both deploy workflows to reconcile the environment webhook before `wrangler secret bulk` so `NUXT_LUMA_WEBHOOK_SECRET` is derived from Luma and uploaded to the Worker without a stored GitHub environment secret.

Validation results: targeted unit coverage for the new bootstrap script passed, full `bun run test:unit` passed, and a live smoke test against the real Luma API succeeded (`apply` created a disposable webhook and secret file, `check` reported compliant state, and the disposable webhook was deleted afterward). Repo-wide `bun run lint`, `bun run typecheck`, and `bun run test:integration` are currently blocked by concurrent TASK-212 changes outside this task: lint fails in `server/utils/luma-webhooks.ts`, typecheck fails because `checkedInAt` is now required in application creation code, and integration fails in `tests/integration/server/api/public-luma-webhook-routes.test.ts` because the invalid-signature case currently returns `luma_webhook_signature_expired` instead of `luma_webhook_signature_invalid`.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Implemented repository-owned Luma webhook reconciliation for dev and production. Added `tools/luma/webhook-bootstrap.ts` with `check` and `apply` modes, exact-URL managed webhook drift detection, duplicate cleanup, and optional secret-bulk file output containing `NUXT_LUMA_WEBHOOK_SECRET`. Wired both deploy workflows to reconcile the environment webhook before Worker secret upload and merge the generated webhook secret into the `wrangler secret bulk` payload without storing that secret in GitHub environment secrets. Updated `.env.example`, `README.md`, and `DEVELOPMENT.md` to document configuration, automation behavior, and recovery flow, and added unit coverage for config resolution, request construction, drift detection, duplicate handling, and secret file output. Validation passed in the integrated repo state with `bun run lint`, `bun run typecheck`, `bun run test:unit`, and `bun run test:integration`; a live smoke test against the real Luma API also succeeded using a disposable webhook lifecycle. Residual risk: deploy automation assumes the runtime webhook endpoint path remains `/api/public/luma/webhooks`, so future path changes must update the bootstrap inputs in both workflows.
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
