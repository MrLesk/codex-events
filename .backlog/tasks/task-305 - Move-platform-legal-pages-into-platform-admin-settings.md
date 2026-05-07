---
id: TASK-305
title: Move platform legal pages into platform-admin settings
status: Done
assignee:
  - '@Sartre'
created_date: '2026-05-06 21:09'
updated_date: '2026-05-06 21:40'
labels:
  - open-source-readiness
  - p0
  - legal
  - platform-admin
dependencies: []
references:
  - shared/domains/platform/legal.ts
  - app/pages/privacy-policy.vue
  - app/pages/terms-and-conditions.vue
  - app/pages/imprint.vue
  - app/pages/account/platform-admins.vue
  - server/domains/platform/documents.ts
  - server/api/platform-documents/current.get.ts
  - server/api/platform-document-acceptances.post.ts
documentation:
  - docs/README.md
  - docs/domain-model.md
  - docs/api-surface.md
  - docs/schema-outline.md
  - docs/permissions-matrix.md
  - DEVELOPMENT.md
modified_files:
  - DEVELOPMENT.md
  - README.md
  - app/composables/usePlatformLegalSettings.ts
  - app/domains/accounts/shell-navigation.ts
  - app/pages/account/admin.vue
  - app/pages/account/platform-legal.vue
  - app/pages/imprint.vue
  - app/pages/privacy-policy.vue
  - app/pages/terms-and-conditions.vue
  - docs/api-surface.md
  - docs/domain-model.md
  - docs/permissions-matrix.md
  - docs/schema-outline.md
  - drizzle/0047_platform_legal_settings.sql
  - nuxt.config.ts
  - 'server/api/platform-documents/[documentType]/versions.get.ts'
  - 'server/api/platform-documents/[documentType]/versions.post.ts'
  - server/api/platform-legal-settings/current.get.ts
  - server/api/platform-legal-settings/current.patch.ts
  - server/api/public/imprint-contact.post.ts
  - server/database/schema.ts
  - server/domains/platform/documents.ts
  - server/domains/platform/legal-contact.ts
  - server/domains/platform/legal-settings.ts
  - shared/domains/platform/legal.ts
  - tests/integration/server/api/actor-platform-routes.test.ts
  - tests/integration/server/api/public-legal-routes.test.ts
  - tests/integration/server/auth/authorization-foundation.test.ts
  - tests/support/backend/api-route.ts
  - tests/unit/app/composables/usePlatformLegalSettings.test.ts
  - tests/unit/app/domains/accounts/shell-navigation.test.ts
  - tests/unit/server/domains/platform/documents.test.ts
  - tests/unit/server/domains/platform/legal-contact.test.ts
  - tests/unit/tools/platform-legal-bootstrap.test.ts
  - tools/platform-legal/bootstrap.ts
  - vitest.config.ts
  - vitest.integration.config.ts
priority: high
ordinal: 8000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Open-source release P0. The current public Privacy Policy, Terms and Conditions, and Imprint pages render repository constants from `shared/domains/platform/legal.ts` that hard-code one operator name, address, and support/privacy email addresses. That is unsafe for third-party self-hosting because an adopter could deploy legally incorrect controller details. Replace the hard-coded runtime legal-page model with platform-admin-managed platform settings/documents so each deployment explicitly owns its legal controller details and legal page content. Use the existing platform-document/versioning model where it fits, but include Imprint/operator details as first-class platform-admin-managed content too. Do not add fallback behavior that silently serves the current hard-coded operator identity.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Platform admins can view and update the runtime content/controller details used by the public Privacy Policy, Terms and Conditions, and Imprint pages from an authenticated platform-admin settings surface.
- [x] #2 Public legal pages render the current platform-admin-managed content for the active deployment instead of hard-coded operator constants from `shared/domains/platform/legal.ts`.
- [x] #3 Account registration and platform-document acceptance continue to reference exact current Privacy Policy and Platform Terms versions, with no regression to versioned consent behavior.
- [x] #4 Fresh/self-hosted deployments cannot accidentally publish the current hard-coded operator identity; required setup or bootstrap makes missing legal content explicit to the operator.
- [x] #5 Authorization prevents non-platform-admin users from modifying platform legal settings or platform legal document versions.
- [x] #6 Automated coverage verifies legal settings/document reads and writes, public legal page data loading, authorization, and registration consent behavior.
- [x] #7 Operator/contributor docs explain how a self-hosted operator configures legal controller details and current legal documents before launch.
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
Approved implementation plan for P0 legal-page platform settings:

1. Add a platform legal settings model for deployment-owned, non-consent legal metadata and imprint/contact content.
- Add a singleton `platform_legal_settings` table and Drizzle migration.
- Store operator/controller name, address, support email, privacy email, legal contact languages, business purpose, editorial line, imprint markdown/content, and timestamps.
- Do not seed or fallback to the current hard-coded operator identity.

2. Keep Privacy Policy and Platform Terms as append-only versioned `platform_documents`.
- Add platform-admin-only publish/create-next-version behavior for `privacy_policy` and `platform_terms`.
- Do not mutate content for a version that may already have user acceptances.
- Preserve exact-version acceptance behavior in account registration and re-consent flows.
- Missing current required platform documents must be explicit setup/unavailable state, not silently treated as accepted.

3. Replace public legal page runtime constants.
- `app/pages/privacy-policy.vue` and `app/pages/terms-and-conditions.vue` render current `platform_documents` content.
- `app/pages/imprint.vue` renders `platform_legal_settings` content/contact fields.
- Missing settings/documents show explicit unavailable/operator setup states and never display the old hard-coded operator values.

4. Add platform-admin UI for legal setup.
- Add a platform-admin settings surface, likely `/account/platform-legal`, linked from the admin workspace.
- Platform admins can update legal settings and publish new Privacy Policy / Platform Terms versions.
- Reuse existing markdown editor/admin form patterns where appropriate.

5. Update contact form delivery.
- Public imprint contact sends to the configured support email from platform legal settings.
- Missing support/contact settings uses the existing unavailable behavior rather than falling back.

6. Add first-run/operator setup support.
- Add or extend a config-file-based bootstrap/operator tool for legal settings plus first Privacy Policy and Platform Terms versions before launch.
- Keep it explicit; no repository-owned operator defaults.

7. Update canonical docs and operator docs.
- Update `docs/domain-model.md`, `docs/api-surface.md`, `docs/schema-outline.md`, `docs/permissions-matrix.md`, `README.md`, and `DEVELOPMENT.md` where behavior/setup changes.

8. Validation scope.
- Required validation before handoff: `bun run lint`, `bun run typecheck`, `bun run test:unit`, and `bun run test:integration`.
- Add/update unit and integration coverage for legal settings/document domain behavior, platform-admin authorization, public legal reads, contact recipient behavior, missing-setup behavior, and registration exact-version consent.

Decision: changing operator/contact/imprint settings alone does not force renewed user consent. Renewed consent is required only when a platform admin publishes a new Privacy Policy or Platform Terms version.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Assigned to subagent Sartre for a plan-only pass. No implementation is approved yet; parent agent will review and approve the plan before code changes.

Parent reviewed Sartre's plan and approved implementation with constraints: use append-only platform document versions for Privacy Policy and Platform Terms; use settings for operator/contact/imprint metadata; no fallback to hard-coded operator identity; run integration tests in addition to required local gates.

Implementation started after plan approval. Scope is limited to TASK-305: platform legal settings, append-only platform document publishing, public legal pages, admin settings UI, docs, and tests.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Implemented deployment-owned platform legal settings and append-only platform document publishing for TASK-305. Public Privacy Policy, Terms, and Imprint pages no longer read hard-coded operator constants; missing legal setup is explicit. Added platform-admin UI, server APIs, Drizzle migration, contact-form recipient resolution from settings, legal bootstrap tooling, docs, and coverage for authorization, public reads, document publishing, contact delivery, consent behavior, and test fixtures. Validation passed: `bun run lint`, `bun run typecheck`, `bun run test:unit`, and `bun run test:integration`. Remaining open-source readiness work outside this task: self-hosting Cloudflare/CI config templating P0 and LICENSE attribution P1.
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
