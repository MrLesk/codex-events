---
id: TASK-60
title: Finalize platform privacy policy and platform terms
status: Done
assignee:
  - codex
created_date: '2026-03-28 14:57'
updated_date: '2026-03-28 16:12'
labels: []
dependencies: []
documentation:
  - docs/README.md
  - docs/domain-model.md
  - docs/api-surface.md
  - docs/testing-strategy.md
  - app/pages/privacy-policy.vue
  - app/pages/terms-and-conditions.vue
priority: high
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Replace the current placeholder platform privacy-policy and terms-and-conditions content with production-ready documents that match the current Codex Hackathons data flows, platform actor model, and exact-version platform-document architecture. The documents must be suitable for an Austria-based platform operator and align with GDPR transparency requirements and current processor/service-provider usage in the repository. Clarify owner-specific facts first before committing final text.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 The platform privacy policy reflects the current product's personal-data processing activities, categories, purposes, legal bases, recipients and processors, transfer posture, retention approach, data-subject rights, and complaint and contact information needed for a GDPR-aligned notice.
- [x] #2 The platform terms and conditions reflect the current platform model, user roles, acceptable use, account rules, hackathon workflow context, IP and content rules, suspension and termination rules, liability framing, and Austria-based operator details needed for a production launch.
- [x] #3 The canonical source for the final platform privacy-policy and platform-terms text is implemented consistently in the product so the public routes no longer show placeholder summaries.
- [x] #4 Open owner-specific legal and operational facts that are required for final text are collected and resolved before the task is promoted out of Draft.
- [x] #5 Relevant validation is run before handoff, including at minimum bun run test:unit unless blocked by missing prerequisites.
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Replace the placeholder public platform legal pages with production-ready English copy for Privacy Policy and Terms and Conditions, using repo-backed markdown content rendered through the existing page pattern.
2. Add a new public Imprint / Legal Notice page and link it from the shared footer.
3. Add a minimal public contact-form flow on the imprint page using the existing Nuxt + API-handler patterns and Resend-based email delivery so users have a direct contact method in addition to email.
4. Keep the current platform-document acceptance and version-tracking model intact; do not remove existing platform-document APIs, schema, or acceptance logic in this task.
5. Update any canonical docs only if the new legal/contact surface introduces repository-visible behavior that should be documented.
6. Add or update automated tests for the new server-side contact-form behavior, then run validation with at least bun run test:unit and relevant targeted tests.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Owner inputs collected on 2026-03-28: controller is Alexandru Gavrilescu acting as a private person; support contact support@codex-hackathons.com; privacy contact privacy@codex-hackathons.com; no DPO designated; platform is free for all actors; anyone can create an account and browse/apply; public legal documents should be English; no additional launch data beyond repo model; no special-category data, government IDs, payment data, or travel/immigration data; profile photos are optional account icons only; emails are transactional only; no analytics, session replay, advertising pixels, or marketing tooling at launch; winners, team names, project names, demos, and repositories may be published publicly; launch vendors are Auth0, Cloudflare, and Resend; Auth0 tenant region is EU; Cloudflare runs under normal global processing posture; controller is comfortable disclosing international transfers subject to vendor safeguards; no signed vendor DPAs currently confirmed; inactive accounts target retention 2 years; rejected applications target retention 1 month after hackathon close; approved applications and operational competition records should be retained as long as allowed; account deletion should preserve de-identified or pseudonymized operational records for compliance and competition integrity; users retain ownership of submissions/content; platform should receive a broad promotional reuse license; hackathon-specific terms should override platform terms where they conflict; platform users act as private individuals; owner prefers repo-backed public legal text and initially suggested removing DB-backed platform document logic.

Implemented repo-backed public Privacy Policy and Terms and Conditions content in a shared legal-content module and added a new public Imprint page linked from the shared footer. Added a minimal public imprint contact-form API route backed by the existing Resend provider pattern, with honeypot spam suppression and no new persistence layer. Updated docs/api-surface.md to document the new public legal-contact route and added unit plus targeted integration coverage for the new server-side contact behavior. Validation results: bun run test:unit passed; bun x vitest run --config vitest.integration.config.ts tests/integration/server/api/public-legal-routes.test.ts passed; targeted eslint pass completed with only existing vue/no-v-html warnings on repo-authored markdown render surfaces; bun run typecheck still fails due pre-existing unrelated issues in app/components/public/hackathons/HackathonTimeline.vue and server/api/hackathons/[hackathonId]/applications/*.ts.

Follow-up note: an uncommitted local experiment briefly introduced an imprint contact-form availability read and email-draft fallback, but that UX was rejected and reverted before any new publish step. The canonical implementation remains the direct server-side contact form only.

Applied follow-up imprint UX polish requested during review: changed the imprint markdown contact bullet to neutral wording that does not depend on left-versus-right layout placement, shortened the contact-form submit CTA to `Send`, and aligned the imprint form with the app's client-side validation pattern using a dedicated zod + vee-validate schema with inline field errors.

Adjusted imprint contact-form completion UX after review: on successful send, the page now swaps the form for a success confirmation state instead of leaving the user on an empty reset form, and request-level delivery failures are surfaced as an alert directly above the submit action while preserving the user's entered values.

Fixed a real server-side runtime bug in the imprint contact flow: the legal-contact utility was trying to resolve Nuxt runtime config through `globalThis.useRuntimeConfig`, which left `resend.apiKey` and `fromEmail` unreadable in the live Nuxt dev server even though `.env` was configured. Updated the resolver to use Nuxt's actual `useRuntimeConfig(event)` path and added a unit test that covers the fallback when `event.context.runtimeConfig` is absent.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Replaced the placeholder platform legal pages with production-ready repo-backed copy for the public Privacy Policy and Terms and Conditions, using a shared legal-content module that captures the agreed controller details, 18+ eligibility rule, Austria-based operator information, GDPR-aligned privacy disclosures, and the platform-level relationship between platform terms and hackathon-specific documents.

Added a new public Imprint page and linked it from the shared footer. The imprint includes operator and contact details plus a minimal public contact form that sends support/legal inquiries through the existing Resend email provider, with honeypot handling and no new database persistence. This required a new public API route (`POST /api/public/imprint-contact`) and a small delivery utility with validation and delivery-result handling.

Updated docs/api-surface.md so the canonical API documentation now includes the new `legal` domain and public imprint-contact endpoint. Added automated coverage for the new contact-form behavior in both unit and targeted integration tests.

Validation:
- `bun run test:unit` passed
- `bun x vitest run --config vitest.integration.config.ts tests/integration/server/api/public-legal-routes.test.ts` passed
- targeted `eslint` on changed files passed with only existing `vue/no-v-html` warnings on repo-authored markdown-render pages
- `bun run typecheck` still fails because of pre-existing unrelated errors in `app/components/public/hackathons/HackathonTimeline.vue` and `server/api/hackathons/[hackathonId]/applications/*.ts`

Remaining external follow-up before launch: vendor data-processing agreements and transfer paperwork still need to be executed operationally; that is not something the codebase can complete on its own.

Follow-up imprint UX polish: the left-column contact copy now uses neutral wording ('contact form on this page'), the form CTA is shortened to `Send`, and the imprint contact form now uses app-style inline client-side validation with field-level errors instead of plain required-only inputs. Validation for this follow-up: targeted unit tests for the new imprint form schema passed, the public legal-routes integration test still passed, eslint reported only the existing markdown `v-html` warning, and the full unit suite remains blocked only by unrelated `auth-navigation` failures already present in the worktree.

Additional imprint UX fix: successful contact submissions now transition into a confirmation state with an explicit follow-up action to send another message, rather than resetting back into an empty form. Delivery failures remain visible above the submit action without clearing the current form values.

Server-side imprint delivery fix: the public legal-contact route now correctly resolves Resend configuration from Nuxt runtime config in the live app, not just in the test harness. Added unit coverage for the `useRuntimeConfig(event)` fallback path, which closes the 503 false-negative that was making the form claim delivery was unavailable despite `.env` being populated.
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
