---
id: TASK-293
title: Audit and update library versions for release readiness
status: Done
assignee:
  - Codex
created_date: '2026-04-25 22:41'
updated_date: '2026-04-25 22:48'
labels:
  - dependencies
  - release-readiness
dependencies: []
documentation:
  - docs/tech-stack.md
priority: medium
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Review package.json dependencies against current npm releases, check relevant changelogs for framework/tooling changes worth adopting, apply safe version bumps, and validate the final dependency set for release-readiness.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Outdated package versions are audited against current npm releases and notable changelog implications are recorded.
- [x] #2 Safe patch/minor dependency updates are applied to package.json and bun.lock where validation supports them.
- [x] #3 Major upgrades are either applied with validation or explicitly deferred with a reason.
- [x] #4 Required validation passes before commit: bun run lint, bun run typecheck, and bun run test:unit.
<!-- AC:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Updated all npm-outdated dependencies to their current latest releases, including the TypeScript 6.0.3 major upgrade, and regenerated bun.lock plus public/third-party-notices.generated.json. Changelog review found actionable release-readiness value in Drizzle 0.45.2's SQL identifier escaping security fix, Tailwind CSS 4.2.4's Vite alias import resolution fix, Vue language-tools 3.2.7's TypeScript 6.0.3 alignment, Vitest 4.1.5 bug fixes, and Playwright 1.59.1 regression fixes. Production build under the upgraded toolchain surfaced relative shared imports that Nitro could not bundle, so app/server shared imports now use Nuxt's #shared alias and Vitest unit/integration configs mirror that alias. No product behavior changed and canonical docs remain valid. Validation passed: bun outdated --latest, bun run lint, bun run typecheck, bun run test:unit, bun run test:integration, bun run build, and git diff --check.
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
