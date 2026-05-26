---
id: TASK-316
title: Simplify platform legal settings to markdown documents
status: In Progress
assignee: []
created_date: '2026-05-26 20:23'
updated_date: '2026-05-26 20:41'
labels: []
dependencies: []
modified_files:
  - DEVELOPMENT.md
  - OPERATOR.md
  - docs/api-surface.md
  - docs/domain-model.md
  - docs/schema-outline.md
  - app/composables/usePlatformLegalSettings.ts
  - app/pages/account/platform-legal.vue
  - app/pages/imprint.vue
  - app/pages/privacy-policy.vue
  - app/pages/terms-and-conditions.vue
  - server/database/schema.ts
  - server/domains/platform/legal-settings.ts
  - drizzle/0051_simplify_platform_legal_settings.sql
  - tests/integration/server/api/actor-platform-routes.test.ts
  - tests/integration/server/api/public-legal-routes.test.ts
  - tests/unit/app/composables/usePlatformLegalSettings.test.ts
  - tests/unit/tools/platform-legal-bootstrap.test.ts
priority: high
ordinal: 19000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Collapse platform legal settings into the two fields that have distinct runtime behavior: support email for contact-form routing and imprint markdown for the public imprint body. Privacy Policy and Platform Terms remain existing versioned markdown documents. Remove duplicated structured imprint-only fields and the separate privacy email from the admin UI, API contract, domain model, schema, docs, bootstrap tooling, tests, and deployed dev data in one coordinated change.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Platform legal settings contain only `supportEmail`, `imprintContent`, and timestamps; `operatorName`, `operatorAddress`, `privacyEmail`, `legalContactLanguages`, `businessPurpose`, and `editorialLine` are removed from the runtime contract instead of hidden behind UI fallbacks.
- [ ] #2 The platform legal admin page presents a focused support email field and three markdown editing surfaces: Imprint, Privacy Policy, and Platform Terms. The Imprint editor copy makes clear that operator details, legal notice text, privacy contact details, DSA contact points, platform purpose, and jurisdiction-specific disclosures belong in the markdown body.
- [ ] #3 The public imprint page renders configured imprint markdown exactly once and uses `supportEmail` for the contact form and support contact affordances; it does not render duplicated structured imprint metadata or a separate privacy email field.
- [ ] #4 Privacy Policy and Platform Terms pages keep using their versioned platform document content and no longer depend on structured privacy-contact metadata from platform legal settings.
- [ ] #5 A forward-only migration updates `platform_legal_settings` to the simplified shape and preserves existing content by folding removed structured values into `imprintContent` before dropping old columns, with no runtime compatibility fallback or dual-read path after migration.
- [ ] #6 Platform legal bootstrap config, API schemas, composables, docs, and tests are updated to the simplified contract; obsolete examples and SQL snippets no longer mention the removed fields.
- [ ] #7 The dev D1 database is updated after deployment so `/imprint`, `/privacy-policy`, `/terms-and-conditions`, and `/api/platform-legal-settings/current` return the simplified, non-duplicated content shape.
- [ ] #8 Validation passes locally before commit: `bun run lint`, `bun run typecheck`, and `bun run test:unit`.
<!-- AC:END -->



## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 Canonical docs were updated or confirmed unchanged
- [ ] #2 Code behavior matches canonical docs
- [ ] #3 Relevant validation commands pass
- [ ] #4 Tests were added or updated when behavior changed
- [ ] #5 Test gaps are documented when automation is not practical
- [ ] #6 Config and developer workflow docs were updated when setup changed
- [ ] #7 Auth and permissions changes follow the documented platform model
- [ ] #8 Risks and follow ups are recorded in the task summary
<!-- DOD:END -->
