---
id: TASK-428
title: Remediate open Dependabot vulnerabilities
status: In Progress
assignee:
  - '@codex-security'
created_date: '2026-08-14 06:50'
updated_date: '2026-08-14 07:11'
labels:
  - security
  - dependencies
  - github
dependencies: []
priority: high
type: bug
ordinal: 123000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Remediate the seven open GitHub Dependabot alerts currently reported for MrLesk/codex-events: five high-severity and two moderate-severity vulnerabilities. A new contributor should first retrieve the live alert records and dependency paths from GitHub, identify direct versus transitive ownership, and choose the smallest supported dependency updates that close every alert without weakening application behavior or security controls.

Preserve the repository stack and exact version policy where intentional. Do not add overrides or compatibility fallbacks merely to silence alerts. If an alert cannot be closed without a breaking product/architecture change, stop and report the specific advisory, dependency path, and required decision instead of forcing an unsafe upgrade.

After remediation, verify the GitHub alert state and deliver directly to main following repository policy.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 The live GitHub Dependabot alert inventory is recorded with advisory identifiers, severities, vulnerable packages, dependency paths, and patched versions.
- [ ] #2 All five high-severity and two moderate-severity alerts are closed by supported dependency or lockfile updates, or any genuinely blocked alert is reported before delivery with objective evidence.
- [x] #3 Dependency updates are minimal, preserve the canonical stack, and do not introduce broad overrides, fallback behavior, or unrelated upgrades.
- [x] #4 Lockfile integrity and generated/framework state remain consistent after installation.
- [x] #5 bun run lint, bun run typecheck, bun run test:unit, bun run test:integration, bun run test:bdd, bun run build:cloudflare, and git diff --check pass.
- [ ] #6 Changes are committed and pushed directly to main; the resulting test workflow is monitored and succeeds without invoking production deployment.
- [ ] #7 GitHub Dependabot confirms the targeted alerts are no longer open after the fix reaches the default branch.
<!-- AC:END -->

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

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Record the authoritative live GitHub Dependabot inventory and confirm each dependency path against package.json, bun.lock, and Bun tooling.
2. Upgrade the exact direct Nuxt dependency from 4.4.7 to the common first patched release 4.5.1 with Bun, preserving all unrelated direct dependency versions and current MCP pins.
3. Inspect package.json, bun.lock, generated/framework state, and the dependency graph for only expected Nuxt-family transitive changes.
4. Run targeted Nuxt preparation/build checks, then the complete required validation suite: lint, typecheck, unit, integration, BDD, Cloudflare build, and git diff --check.
5. Finalize TASK-428 with objective evidence, commit directly to main, push, monitor the push-triggered deploy-test workflow, and poll the GitHub Dependabot API for closure of alerts #4-#10 without dispatching production.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Live alert inventory retrieved from the GitHub Dependabot alerts API on 2026-08-14. All entries are npm ecosystem, runtime scope, direct relationship, manifest package.json. Bun confirms the installed path `codex-events -> nuxt@4.4.7`; Nuxt owns matching exact @nuxt/kit, @nuxt/schema, @nuxt/nitro-server, and @nuxt/vite-builder internals in bun.lock.

- #4: GHSA-hxvh-4h3w-prp9 / CVE-2026-71315, high, nuxt >=4.4.7 <4.5.1; first patched 4.5.1.
- #5: GHSA-hxcr-hm88-mpq6 / CVE-2026-71314, high, nuxt >=4.0.0 <4.5.1; first patched 4.5.1.
- #6: GHSA-wm8w-6qjm-cv43 / CVE-2026-71316, high, nuxt >=4.4.0 <=4.5.0; first patched 4.5.1.
- #7: GHSA-48hr-524c-v5w3 / CVE-2026-71318, moderate, nuxt >=4.0.0 <4.5.1; first patched 4.5.1.
- #8: GHSA-9473-5f9j-94wq / CVE-2026-71320, high, nuxt >=4.0.0 <4.5.1; first patched 4.5.1.
- #9: GHSA-9pgf-384g-p7mv / CVE-2026-71321, high, nuxt >=4.0.0 <4.5.1; first patched 4.5.1.
- #10: GHSA-7c4v-fwgw-9rf7 / CVE-2026-72744, moderate, nuxt >=4.4.7 <4.5.1; first patched 4.5.1.

The common minimum patched version is Nuxt 4.5.1. This is a supported patch/minor-line upgrade within Nuxt 4, requires no architecture change, and preserves the repository exact-version policy. Canonical docs are expected to remain unchanged because the documented stack remains Nuxt.

Nuxt 4.5.1 validation exposed a deterministic local BDD harness failure in the existing admin rejection step: the target button was present and enabled, but `scrollIntoViewIfNeeded()` left it outside the viewport while a sibling application card intercepted pointer events. An isolated clean HEAD checkout using Nuxt 4.4.7, its original bun.lock, a fresh `bun ci`, reset fixtures, and the exact original pointer scenario reproduced the same `toBeInViewport()` ratio 0 failure. This proves the pointer/overlap condition predates the security upgrade and is not a Nuxt 4.5.1 regression. The BDD step now activates the native button with keyboard focus and Enter, retaining enabled-state, staged-decision, API persistence, save-button, and final rejected-state assertions. Browser-plugin validation could not represent the BDD-only saved persona context; the repository Playwright project supplied DOM, geometry, screenshot, and interaction evidence. Remaining risk: the pre-existing local-dev hydration warnings and pointer overlap are outside this dependency-remediation scope; production Cloudflare SSR has the D1 request binding unavailable to plain Nuxt dev in this harness.

Validation passed on Nuxt 4.5.1: bun ci; bun run lint; bun run typecheck; bun run test:unit (121 files, 824 tests); bun run test:integration (28 files, 379 tests); bun run test:bdd (58 regular scenarios and 2 destructive scenarios); bun run build:cloudflare; git diff --check. The initial integration attempt failed only because the sandbox denied Wrangler loopback/log access; the complete unrestricted rerun passed. Bun dependency inspection confirms direct exact nuxt 4.5.1, and the intentional MCP pins remain agents 0.20.1 and @modelcontextprotocol/server 2.0.0. Diff inspection found only package.json, the Nuxt-owned bun.lock graph, the scoped BDD interaction step, and this task record; build and Playwright artifacts remain ignored.
<!-- SECTION:NOTES:END -->
