---
id: TASK-295
title: Remove React Email dependency from Nuxt app
status: Done
assignee:
  - Codex
created_date: '2026-04-26 10:10'
updated_date: '2026-04-26 10:13'
labels:
  - dependencies
  - release-readiness
dependencies:
  - TASK-294
documentation:
  - package.json
  - bun.lock
  - public/third-party-notices.generated.json
modified_files:
  - package.json
  - bun.lock
  - public/third-party-notices.generated.json
priority: medium
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Remove the unused React Email render package introduced in the dependency update batch so the Nuxt/Vue project does not carry React-specific runtime dependencies without a concrete product need. Confirm no code imports it, regenerate package metadata, and validate the Nuxt app still passes checks.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 `@react-email/render` is removed from project dependencies if no direct usage exists.
- [x] #2 The lockfile and generated third-party notices no longer include React Email packages made unnecessary by that direct dependency.
- [x] #3 Repo search confirms no direct React Email imports remain in app, server, shared, tools, or tests.
- [x] #4 Required validation passes before commit.
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Confirm `@react-email/render` has no direct imports or CLI/script usage in app, server, shared, tools, and tests.
2. Remove `@react-email/render` from `package.json` using the package manager, letting `bun.lock` update naturally.
3. Regenerate `public/third-party-notices.generated.json` so notices match the dependency graph.
4. Verify React/React Email packages are absent unless required transitively by some other dependency.
5. Run required validation: `bun run lint`, `bun run typecheck`, and `bun run test:unit`, plus targeted dependency/search checks.
6. Finalize TASK-295, stage only the task and dependency metadata files, commit, and push `main`.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Context-hunter classification: L1 dependency hygiene. Closest analog is TASK-293/TASK-294 dependency update and audit workflow. Main risk is removing a package that is not imported directly but still expected by a script or generated notice; mitigation is repo-wide usage search, lockfile regeneration, notice regeneration, and full validation.

Confirmed no direct React Email usage in app, server, shared, tools, tests, package scripts, or Nuxt config. Removed @react-email/render with Bun, regenerated third-party notices, and verified @react-email/render/react-email/react-dom/react no longer appear in bun.lock or notices. Bun normalized root lockfile dependency specifiers from previous latest markers to the package.json specs; bun install --frozen-lockfile passed with no changes.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Removed the unused @react-email/render dependency from the Nuxt app after confirming there are no direct imports or script/config references. Regenerated bun.lock and public/third-party-notices.generated.json so the dependency graph and notices no longer include React Email, React, react-dom, or the now-unused HTML-to-text/prettier transitive packages pulled by React Email.

Validation passed: targeted usage searches, bun pm why react (no package found), bun install --frozen-lockfile, git diff --check, bun run lint, bun run typecheck, bun run test:unit (84 files, 563 tests), bun outdated --latest (no outdated packages listed), and bun run build. Build completed successfully with existing sourcemap/chunk-size warnings only. No product behavior or canonical docs change was required.
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
