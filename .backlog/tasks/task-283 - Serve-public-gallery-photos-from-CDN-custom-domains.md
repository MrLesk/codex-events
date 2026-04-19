---
id: TASK-283
title: Serve public gallery photos from CDN custom domains
status: Done
assignee:
  - codex
created_date: '2026-04-19 18:44'
updated_date: '2026-04-19 18:49'
labels: []
dependencies: []
priority: high
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Switch public hackathon gallery images off Worker API routes and onto direct CDN-backed R2 URLs so public photo traffic does not generate per-image Worker requests. Keep the protected gallery on authenticated Worker routes. Use cdn.codex-hackathons.com in production and cdn.dev.codex-hackathons.com in dev.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Public gallery photo records return CDN-backed preview and original URLs instead of Worker image endpoints.
- [x] #2 Protected gallery photo records continue using authenticated Worker image routes.
- [x] #3 Runtime configuration and operator docs define the public CDN base URL for dev and production.
- [x] #4 Automated tests cover the new public URL shape and continue to validate gallery behavior.
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Add a runtime-configured public CDN base URL for hackathon images, with cdn.dev.codex-hackathons.com in dev and cdn.codex-hackathons.com in production.
2. Change the public gallery URL builder to emit direct CDN original URLs and Cloudflare /cdn-cgi/image preview URLs.
3. Leave protected gallery read paths unchanged so approved-member access still flows through authenticated Worker routes.
4. Update operator docs and the public gallery tests that currently assert Worker endpoint URLs.
5. Validate with bun run lint, bun run typecheck, and bun run test:unit, plus targeted integration coverage for public gallery routes.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
User confirmed the public CDN hostnames should be cdn.codex-hackathons.com in production and cdn.dev.codex-hackathons.com in dev.

Public gallery photo records now emit direct CDN original URLs and /cdn-cgi/image preview URLs when hackathonImages.publicCdnBaseUrl is configured. Protected gallery routes are unchanged.

The deployed dev and production wrangler environments now set NUXT_HACKATHON_IMAGES_PUBLIC_CDN_BASE_URL to https://cdn.dev.codex-hackathons.com and https://cdn.codex-hackathons.com respectively.

Local localhost development intentionally keeps the existing public Worker image URLs when the CDN base URL is unset because the local R2 proxy does not have a matching public custom domain.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Public gallery images now bypass the app Worker in deployed environments. The public gallery list route emits direct R2 custom-domain original URLs plus Cloudflare /cdn-cgi/image preview URLs based on hackathonImages.publicCdnBaseUrl, while protected gallery reads still use authenticated Worker endpoints. Added the dev and production CDN base URLs to wrangler, documented the new runtime setting, and updated unit plus integration coverage for the public URL shape. Validation passed with bun run lint, bun run typecheck, bun run test:unit, and a targeted public gallery integration run.
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
