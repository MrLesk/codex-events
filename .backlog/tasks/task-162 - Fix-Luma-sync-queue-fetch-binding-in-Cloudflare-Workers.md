---
id: TASK-162
title: Fix Luma sync queue fetch binding in Cloudflare Workers
status: Done
assignee: []
created_date: '2026-04-02 20:12'
updated_date: '2026-04-02 20:13'
labels: []
dependencies: []
references:
  - >-
    /Users/alex/projects/codex-hackathons/server/utils/application-luma-sync-queue.ts
  - >-
    /Users/alex/projects/codex-hackathons/tests/unit/server/utils/application-luma-sync-queue.test.ts
priority: high
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Prevent the Luma sync queue worker from losing the Cloudflare Workers fetch binding and throwing Illegal invocation before the first Luma API response.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Luma sync queue requests use a fetch implementation that preserves the Cloudflare Workers this binding
- [x] #2 A regression test covers the unbound fetch case and proves Luma queue processing no longer throws Illegal invocation
- [x] #3 bun run lint passes
- [x] #4 bun run typecheck passes
- [x] #5 bun run test:unit passes
<!-- AC:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Wrapped the default Luma fetch path so Cloudflare Workers calls `globalThis.fetch(...)` with the correct binding instead of storing an unbound `fetch` reference. Added a regression test that stubs a binding-sensitive global fetch and proves queue processing still reaches `luma_sync_completed` when no custom fetch implementation is injected. Validation passed with `bun run lint`, `bun run typecheck`, and `bun run test:unit`.
<!-- SECTION:FINAL_SUMMARY:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [x] #1 Canonical docs were updated or confirmed unchanged
- [x] #2 Code behavior matches canonical docs
- [x] #3 Relevant validation commands pass
- [x] #4 Tests were added or updated when behavior changed
- [ ] #5 Test gaps are documented when automation is not practical
- [x] #6 Config and developer workflow docs were updated when setup changed
- [ ] #7 Auth and permissions changes follow the documented platform model
- [x] #8 Risks and follow ups are recorded in the task summary
<!-- DOD:END -->
