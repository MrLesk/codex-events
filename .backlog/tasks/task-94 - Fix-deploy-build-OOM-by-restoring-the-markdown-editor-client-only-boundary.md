---
id: TASK-94
title: Fix deploy build OOM by restoring the markdown editor client-only boundary
status: Done
assignee:
  - codex
created_date: '2026-03-29 17:25'
updated_date: '2026-03-29 17:26'
labels: []
dependencies: []
references:
  - >-
    https://github.com/MrLesk/codex-hackathons/actions/runs/23713933428/job/69078156680
documentation:
  - docs/tech-stack.md
  - .github/workflows/ci.yml
  - package.json
priority: high
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
The deploy-dev GitHub Actions job started failing on main at commit b103aa2 during `bun run build:cloudflare` with a Node heap out-of-memory error. Investigation showed the markdown editor path introduced in TASK-80 is being pulled into the SSR bundle because `AdminMarkdownEditorField.vue` statically imports `AdminMarkdownEditorClient.client.vue` from script setup. The intended fix is to restore the client-only boundary so the markdown editor remains out of the server bundle while preserving the existing admin editing UX.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 The markdown editor is no longer statically imported into the SSR bundle from the admin hackathon configuration form path.
- [x] #2 `bun run build:cloudflare` completes locally under a 2 GB Node heap cap for the current codebase.
- [x] #3 Existing markdown editing behavior in the admin settings flow remains intact.
- [x] #4 Required local validation is documented on the task before completion.
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Remove the explicit script import of `AdminMarkdownEditorClient.client.vue` from `app/components/admin/AdminMarkdownEditorField.vue` so Nuxt preserves the client-only component boundary.
2. Run targeted verification by rebuilding with `NODE_OPTIONS=--max-old-space-size=2048 bun run build:cloudflare` to confirm the prior OOM no longer reproduces.
3. Run the required local validation surface for this repo, at minimum `bun run test:unit`, and capture any practical coverage gaps.
4. Commit the code change together with the Backlog task update using the task-prefixed commit message, then push directly to `origin/main`.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Removed the explicit script import of `AdminMarkdownEditorClient.client.vue` from `app/components/admin/AdminMarkdownEditorField.vue` so Nuxt preserves the filename-based client-only component boundary during SSR bundling.

Verified the previous failure mode with `NODE_OPTIONS=--max-old-space-size=2048 bun run build:cloudflare`; the build now completes and the emitted `AdminHackathonCreateEditForm` SSR chunk is 58.3 kB instead of the prior ~1.5 MB regression seen during investigation.

Ran `bun run test:unit` successfully. No markdown-editor-specific automated UI test exists in the current unit surface; the runtime template and props wiring were left unchanged, so the fix is limited to build-time import behavior.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Restored the intended client-only boundary for the admin markdown editor by removing the explicit script import of `AdminMarkdownEditorClient.client.vue` from `AdminMarkdownEditorField.vue`. This keeps the `md-editor-v3` dependency graph out of the SSR bundle while preserving the existing template usage and fallback behavior.

The change fixes the deploy build OOM that started after TASK-80 by shrinking the `AdminHackathonCreateEditForm` SSR chunk back to normal size under the same 2 GB heap cap that previously reproduced the failure. Validation run: `NODE_OPTIONS=--max-old-space-size=2048 bun run build:cloudflare`, `bun run test:unit`.

No canonical docs or config changes were required. Residual risk is limited to the lack of dedicated automated UI coverage for the markdown editor itself; the runtime component wiring was intentionally left unchanged.
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
