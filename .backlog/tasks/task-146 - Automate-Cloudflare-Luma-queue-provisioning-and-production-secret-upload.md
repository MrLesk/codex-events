---
id: TASK-146
title: Automate Cloudflare Luma queue provisioning and production secret upload
status: Done
assignee: []
created_date: '2026-04-01 19:53'
updated_date: '2026-04-01 19:59'
labels: []
dependencies: []
references:
  - /Users/alex/projects/codex-hackathons/.github/workflows/ci.yml
  - >-
    /Users/alex/projects/codex-hackathons/.github/workflows/release-production.yml
  - /Users/alex/projects/codex-hackathons/wrangler.jsonc
documentation:
  - /Users/alex/projects/codex-hackathons/DEVELOPMENT.md
  - /Users/alex/projects/codex-hackathons/README.md
priority: medium
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Ensure the new Luma sync deployment requirements are covered in the checked-in operator workflow. Shared dev deployment and production release must account for the Cloudflare Queue resource used by Luma sync, and the production release workflow must upload the Luma API key as a Worker secret.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Shared dev deployment creates or reuses the Luma sync Cloudflare Queue before Worker deployment
- [x] #2 Production release creates or reuses the Luma sync Cloudflare Queue before Worker deployment
- [x] #3 Production release uploads the Luma API key as part of Worker secret sync
- [x] #4 Operator documentation states the queue and secret requirements for dev and production
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Update the shared dev CI deploy job to create or reuse every configured dev Cloudflare Queue from wrangler.jsonc before running migrations and deploy.
2. Update the production release workflow to create or reuse every configured production Cloudflare Queue from wrangler.jsonc and include NUXT_LUMA_API_KEY in the Worker secret bulk upload.
3. Update operator-facing documentation in README.md and DEVELOPMENT.md so dev and production setup requirements match the automated deploy behavior.
4. Run the required repository validation commands and record any residual operational caveats.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Implemented queue bootstrap directly in the GitHub Actions workflows with wrangler queues info/create loops over wrangler.jsonc producer queue names so deploys stay idempotent without adding a new repo-side infrastructure script.

Added NUXT_LUMA_API_KEY to the production secret bulk upload and documented that shared dev still requires the secret to exist when Luma sync is in use.

No dedicated automated tests were added for the workflow YAML because the changed behavior lives in GitHub Actions and Wrangler provisioning rather than application runtime; repository validation was limited to lint, typecheck, and unit tests.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Updated the shared dev CI workflow and the production release workflow to create or reuse every configured Cloudflare Queue from wrangler.jsonc before deployment, which covers the Luma sync queue automatically in both environments. The production release workflow now also uploads NUXT_LUMA_API_KEY as part of the Worker secret bulk sync. Operator documentation in README.md and DEVELOPMENT.md was updated to reflect the new queue automation and the remaining requirement that deployed environments provide the Luma API key when Luma sync is used.

Validation run locally:
- bun run lint
- bun run typecheck
- bun run test:unit

Residual risk: queue provisioning now happens automatically in CI and release, but shared dev and production still require the corresponding GitHub/Worker secret values to exist before Luma sync can run.
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
