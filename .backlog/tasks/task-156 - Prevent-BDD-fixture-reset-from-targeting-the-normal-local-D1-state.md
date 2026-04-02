---
id: TASK-156
title: Prevent BDD fixture reset from targeting the normal local D1 state
status: Done
assignee: []
created_date: '2026-04-02 18:24'
updated_date: '2026-04-02 18:24'
labels:
  - testing
  - developer-experience
dependencies: []
documentation:
  - /Users/alex/projects/codex-hackathons/DEVELOPMENT.md
  - /Users/alex/projects/codex-hackathons/docs/testing-strategy.md
priority: high
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Tighten the local Auth0-backed BDD harness so it only uses a dedicated BDD persistence root and cannot silently reset or seed the normal local app state. This includes the resolver logic, BDD entry-point env wiring, and the canonical docs/examples that describe supported overrides.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 BDD state-root resolution uses only the dedicated BDD root and rejects attempts to point the harness at the normal local app state
- [x] #2 BDD command entry points and Playwright web-server startup no longer derive BDD state from a generic LOCAL_D1_STATE_ROOT fallback
- [x] #3 Repository docs and examples describe LOCAL_BDD_D1_STATE_ROOT as the supported BDD override path and remove the dangerous one-off LOCAL_D1_STATE_ROOT example
- [x] #4 Unit coverage verifies the new BDD state-root guard behavior
- [x] #5 bun run lint, bun run typecheck, and bun run test:unit pass locally
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Update the BDD state-root resolver to require a dedicated BDD root and reject configurations that resolve to the normal local app state.
2. Update the BDD shell entry points in package.json and playwright.config.ts so they derive BDD state only from LOCAL_BDD_D1_STATE_ROOT.
3. Update developer and testing docs to describe LOCAL_BDD_D1_STATE_ROOT as the supported BDD override path and remove the dangerous LOCAL_D1_STATE_ROOT example.
4. Add or update unit tests for the resolver guard behavior.
5. Run targeted and required validation: bun vitest run tests/unit/support/bdd/local-d1-state.test.ts, bun run lint, bun run typecheck, and bun run test:unit.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Confirmed the failure mode came from BDD giving precedence to LOCAL_D1_STATE_ROOT, which allowed the fixture reset path to target .wrangler/state.

Updated the resolver to fail fast when the resolved BDD root matches the normal local app root or when LOCAL_D1_STATE_ROOT disagrees with the BDD root.

Updated package.json and Playwright web-server startup so BDD derives its state root only from LOCAL_BDD_D1_STATE_ROOT or the dedicated default path.

Validated the focused resolver test plus lint, typecheck, and full unit tests locally.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Added a hard guard around the local Auth0-backed BDD state root so the BDD harness can no longer silently reset or seed the normal local app database. The resolver now requires a dedicated BDD root, rejects mismatched LOCAL_D1_STATE_ROOT overrides, and fails when the BDD root resolves to the normal local app state.

Updated the BDD entry points in package.json and playwright.config.ts so they derive their persistence root only from LOCAL_BDD_D1_STATE_ROOT or the dedicated .wrangler/state-bdd default. Updated DEVELOPMENT.md, docs/testing-strategy.md, and .env.example to document the supported override path and remove the dangerous one-off LOCAL_D1_STATE_ROOT example.

Validation run: bun vitest run tests/unit/support/bdd/local-d1-state.test.ts, bun run lint, bun run typecheck, bun run test:unit. Risk/follow-up: existing local state that was already overwritten by fixture data is not automatically restored by this change; this fix prevents future accidental targeting of the normal local app state.
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
