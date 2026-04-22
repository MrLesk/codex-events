---
id: TASK-288
title: Migrate outbound email delivery to Cloudflare Email Service
status: Done
assignee:
  - Codex
created_date: '2026-04-22 18:33'
updated_date: '2026-04-22 19:51'
labels:
  - email
  - cloudflare
  - migration
dependencies: []
references:
  - docs/tech-stack.md
  - README.md
  - DEVELOPMENT.md
  - wrangler.jsonc
  - server/utils/application-review-emails.ts
  - server/utils/hackathon-outcome-emails.ts
  - server/utils/legal-contact.ts
documentation:
  - 'https://developers.cloudflare.com/email-service/get-started/send-emails/'
  - 'https://developers.cloudflare.com/email-service/api/send-emails/workers-api/'
  - 'https://developers.cloudflare.com/email-service/reference/headers/'
  - 'https://developers.cloudflare.com/email-service/platform/limits/'
  - 'https://developers.cloudflare.com/email-service/platform/pricing/'
priority: high
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Replace Resend-based transactional email delivery with Cloudflare Email Service for the existing application decision, hackathon outcome, and public legal contact email flows. The project already runs on Cloudflare Workers and uses Cloudflare Queues for asynchronous participant-facing email jobs; use Cloudflare's Workers send_email binding rather than the REST API. The agreed migration path accepts queue-level at-least-once delivery and does not add a new app-side email delivery ledger. Update Wrangler to the latest available version as part of the migration.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Application decision emails, hackathon outcome emails, and public legal contact emails send through the Cloudflare Email Service Workers binding instead of Resend.
- [x] #2 Cloudflare email binding configuration is added to wrangler.jsonc for local, dev, and production environments with sender restrictions appropriate for the configured platform sender addresses.
- [x] #3 Runtime configuration, deployment workflows, environment examples, public/operator docs, canonical tech-stack docs, and legal provider copy no longer require or name Resend for outbound email delivery.
- [x] #4 The Resend dependency is removed and Wrangler is updated to the latest available version with lockfile changes kept scoped to this migration.
- [x] #5 Unit and integration tests are updated to cover Cloudflare Email Service success, configuration-missing, and retryable/non-retryable failure behavior without relying on Resend mocks.
- [x] #6 Required validation passes locally: bun run lint, bun run typecheck, and bun run test:unit.
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
Approved implementation plan:
1. Replace the Resend runtime shape with a single outbound email configuration for the Cloudflare Email Service Workers binding: binding name, from email, from name, and reply-to.
2. Add one `EMAIL` send_email binding to wrangler.jsonc for local, dev, and production, using allowed sender address restrictions for the configured platform sender addresses.
3. Update application decision, hackathon outcome, and public legal contact senders to call the Cloudflare binding through event/context or queue-provided Cloudflare env. Preserve notification metadata through Cloudflare-supported `X-Codex-*` headers.
4. Pass `env` from Cloudflare queue hooks into email queue processors so queue consumers can access the binding.
5. Update test support, unit/integration tests, docs, deployment workflows, `.env.example`, canonical tech-stack docs, legal provider copy, dependencies, and lockfile. Remove Resend and update Wrangler to the latest available version.
6. Run required validation: `bun run lint`, `bun run typecheck`, and `bun run test:unit`.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Created from user request to migrate current outbound email delivery from Resend to Cloudflare Email Service using the Workers send_email binding, and to update Wrangler to the latest available version during the migration. Initial repo discovery found Resend senders in server/utils/application-review-emails.ts, server/utils/hackathon-outcome-emails.ts, and server/utils/legal-contact.ts; queue consumers need Cloudflare env passed through to access the binding.

User approved the implementation plan for TASK-288, including a single `EMAIL` binding and no application-side email ledger.

Implemented the approved Cloudflare Email Service binding migration. Validation passed with `bun run lint`, `bun run typecheck`, `bun run test:unit`, focused integration coverage for the public legal contact route, `git diff --check`, and `bunx wrangler types ... --env dev --config wrangler.jsonc`. Lint still reports the existing admin prize redemption `v-html` warnings but exits successfully. No live provider send was performed; production requires the Cloudflare Email Service sending domain/sender address and Workers Paid plan to be enabled before real delivery.

Post-completion live send attempt on 2026-04-22: local remote-binding test with a temporary Worker resolved `env.EMAIL` as a remote Send Email binding but failed before startup on Cloudflare `/workers/subdomain/edge-preview` with 403 `Authentication error [code: 10000]`. `wrangler email sending send` and the REST endpoint `/email/sending/send` also failed with `Authentication error [code: 10000]` using the tokens available in local `.env`. No test email was sent; the local Cloudflare API token needs Email Sending send permission, and remote-binding testing also needs permission for the Workers remote preview endpoint.

Post-completion retry after local token update on 2026-04-22: `wrangler email sending send --env-file .env` succeeded and sent a real Cloudflare Email Service test email from `info@codex-hackathons.com` to `support@codex-hackathons.com`. A temporary Worker using `env.EMAIL.send()` with a remote `EMAIL` binding still failed to start Wrangler's remote preview session on `/workers/subdomain/edge-preview` with 403 `Authentication error [code: 10000]`, so direct Email Sending permission is fixed but local remote-binding preview still lacks the required Workers edge-preview permission or account capability. Temporary test Worker files were removed.

Post-completion dev sender correction on 2026-04-22: dev environment outbound email now uses `info@dev.codex-hackathons.com` in both `NUXT_OUTBOUND_EMAIL_FROM_EMAIL` and the dev `send_email.allowed_sender_addresses`; local and production remain on `info@codex-hackathons.com`. Added the dev sender to DEVELOPMENT.md. Verified with `bunx wrangler types /tmp/codex-hackathons-worker-configuration-dev-email.d.ts --env dev --config wrangler.jsonc`, `wrangler email sending send` from `info@dev.codex-hackathons.com`, `bun run lint`, `bun run typecheck`, `bun run test:unit`, and `git diff --check`.

Post-completion GitHub environment cleanup on 2026-04-22: updated GitHub environment `CLOUDFLARE_API_TOKEN` secrets for both `dev` and `production` from the local `.env` token that successfully sent through Cloudflare Email Service. Deleted stale `NUXT_RESEND_*` secrets from the `dev` and `production` environments; production did not have `NUXT_RESEND_FROM_NAME`, so that delete returned 404 and required no action. Verified both environments now list no Resend secrets and both Cloudflare tokens have updated timestamps.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Summary:
- Replaced Resend delivery in application review, hackathon outcome, and public legal contact email paths with a shared Cloudflare Email Service `send_email` binding helper using the `EMAIL` binding.
- Passed Cloudflare queue `env` into email queue processors, updated retry classification for Cloudflare provider errors, and updated route/test harness support for the new outbound email runtime configuration.
- Added `send_email` binding configuration and outbound email runtime variables to `wrangler.jsonc`, updated `.env.example`, deployment workflows, operator/developer docs, canonical tech-stack docs, and legal provider copy, removed the Resend dependency, and updated Wrangler to 4.84.1.

Validation:
- `bunx wrangler types /tmp/codex-hackathons-worker-configuration.d.ts --env dev --config wrangler.jsonc`
- `bun run lint` (passes; existing admin `v-html` warnings remain)
- `bun run typecheck`
- `bun run test:unit`
- `bunx vitest run --config vitest.integration.config.ts tests/integration/server/api/public-legal-routes.test.ts`
- `git diff --check`

Risks / follow-ups:
- No live Cloudflare Email Service send was performed in local validation. Production delivery depends on the Cloudflare account having Email Sending enabled on Workers Paid and the configured sender/domain onboarded in Cloudflare.
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
