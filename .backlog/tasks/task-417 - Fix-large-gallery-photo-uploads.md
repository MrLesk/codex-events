---
id: TASK-417
title: Fix large gallery photo uploads
status: Done
assignee:
  - '@codex'
created_date: '2026-06-21 17:30'
updated_date: '2026-06-21 17:40'
labels:
  - bug
  - backend
  - frontend
dependencies: []
ordinal: 96000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Uploading many gallery photos at once fails in production because the event photo metadata insert can exceed Cloudflare D1's bound-parameter limit. The upload flow should accept larger multi-photo selections without forcing operators to split files into small batches.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Event gallery uploads with more than 11 photos do not fail because of D1 bound-parameter limits
- [x] #2 Uploaded photo metadata is persisted for every accepted image and new rows remain hidden from the public gallery by default
- [x] #3 Focused tests cover a multi-photo upload large enough to exceed one D1 insert statement if it were not chunked
- [x] #4 Selecting hundreds of gallery photos in one browser selection starts an upload without requiring the operator to manually split files into batches
- [x] #5 The client sends photo uploads in bounded batches so individual requests stay within practical Worker request-size limits
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Keep the existing gallery upload endpoint but persist metadata in chunks sized below Cloudflare D1's 100-bound-parameter limit.
2. Update the account gallery upload caller so one selected file list is split into bounded batches and sent sequentially, preserving the existing panel/upload status contract.
3. Add focused integration coverage for an upload large enough to require multiple metadata insert statements and confirm rows stay hidden by default.
4. Run lint, typecheck, unit, integration, and BDD validation.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Implementation: client gallery uploads now split one selected File list into sequential five-file request batches, with a 50 MiB per-request byte guard. The photo endpoint also chunks event_photos metadata inserts at 11 rows per statement to stay below D1's 100-bound-parameter limit if another caller sends a larger multipart request. The authenticated upload rate limiter config was raised from 10/min to 60/min so multi-batch gallery uploads do not fail after a normal large selection.

Validation passed: git diff --check; bunx vitest run --config vitest.config.ts tests/unit/app/domains/events/gallery.test.ts tests/unit/server/domains/events/photos.test.ts tests/unit/tools/deploy/generate-wrangler-config.test.ts; bunx vitest run --config vitest.integration.config.ts tests/integration/server/api/event-routes.test.ts --testNamePattern 'event photo'; bun run lint; bun run typecheck; bun run test:unit; bun run test:integration; bun run test:bdd.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Fixed large gallery uploads by batching selected files on the client, guarding server-side event photo metadata inserts against D1 bound-parameter limits, and raising the authenticated upload request limiter for multi-batch gallery uploads. Added unit and integration coverage and verified the full lint/type/unit/integration/BDD suite.
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
