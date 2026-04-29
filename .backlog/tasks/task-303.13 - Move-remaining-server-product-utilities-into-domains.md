---
id: TASK-303.13
title: Move remaining server product utilities into domains
status: Done
assignee: []
created_date: '2026-04-29 18:05'
updated_date: '2026-04-29 18:07'
labels:
  - architecture
  - server
  - refactor
dependencies: []
documentation:
  - docs/README.md
  - docs/domain-model.md
modified_files:
  - docs/security-analysis.md
  - server/domains/hackathons/participation.ts
  - server/domains/applications/luma-webhooks.ts
  - server/domains/platform/legal-contact.ts
  - server/api/hackathons/participation.get.ts
  - server/api/public/imprint-contact.post.ts
  - server/api/public/luma/webhooks.post.ts
  - tests/unit/server/domains/applications/luma-webhooks.test.ts
  - tests/unit/server/domains/platform/legal-contact.test.ts
  - tests/integration/server/api/public-luma-webhook-routes.test.ts
parent_task_id: TASK-303
priority: medium
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Move the remaining product-facing helpers out of server/utils so the folder contains only technical infrastructure. Put hackathon participation summaries under the hackathons domain, Luma webhook handling under applications, and public legal contact handling under platform.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Hackathon participation helper lives under the hackathons server domain and its route imports that domain path directly.
- [x] #2 Luma webhook helper lives under the applications server domain and routes/tests import that domain path directly.
- [x] #3 Public legal contact helper lives under the platform server domain and routes/tests import that domain path directly.
- [x] #4 server/utils contains only cross-cutting technical infrastructure after the move.
- [x] #5 Required validation passes: bun run lint, bun run typecheck, and bun run test:unit.
<!-- AC:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Moved the remaining product-facing server utilities into domain modules: hackathon participation summaries now live under server/domains/hackathons, Luma webhook verification/normalization lives under server/domains/applications, and public legal contact email handling lives under server/domains/platform. Updated routes, unit tests, the affected integration test, and technical security-analysis paths to import the new domain modules directly. server/utils now contains only cross-cutting infrastructure helpers: Cloudflare queue routing, image signatures, outbound email, and rate limiting. Validation passed: moved unit tests, affected Luma integration test, bun run lint, bun run typecheck, and bun run test:unit.
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
