---
id: TASK-432.7.1
title: Prevent protected page reads before account bootstrap
status: Done
assignee:
  - '@luna-bootstrap-gate'
created_date: '2026-08-21 00:23'
updated_date: '2026-08-21 01:48'
labels: []
dependencies: []
parent_task_id: TASK-432.7
priority: high
type: bug
ordinal: 149000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
CI browser evidence at SHA 932a11e9 showed /account/judging issuing a protected /api/account/judging read at 139.71ms before /api/session began at 423.18ms. The first read was abandoned and the page then issued the correct second read after bootstrap, violating the one-bootstrap-plus-one-critical-read architecture. Make the shared protected fetch boundary structurally unable to dispatch feature reads until account bootstrap and authorization generation are ready.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Direct navigation to every global protected workspace starts exactly one /api/session request before exactly one critical page read
- [x] #2 A protected useApiData/useApiFetch consumer cannot dispatch an initial request before bootstrap even under cold CI timing
- [x] #3 Aborted route/tab requests remain cancellable and are not retried as duplicate active-page reads
- [x] #4 A deterministic browser regression covers /account/judging and the shared invariant without timing sleeps or relaxed request counts
- [x] #5 The fix reuses the shared bootstrap/client boundary rather than adding page-local flags or retries
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
1. Inspect the failed b13d5d24 readiness implementation and trace the Nuxt app/bootstrap lifecycle across all useAccountBootstrap consumers, useApiData, and useProtectedApiFetch.
2. Replace serialized useState readiness with explicit non-serialized state scoped by the current useNuxtApp() instance; share one in-flight refresh per app, make clear reset readiness and in-flight state, and preserve abortable caller waiting without coupling useApiClient to protected code.
3. Add focused unit proof that serialized readiness cannot mark a fresh app ready, readiness is shared across consumers, clear resets it, and both protected fetch boundaries wait. Strengthen only the account-workspace topology assertion needed to prove warmed judging and cold held-session journeys each issue exactly one session request followed by one judging read.
4. Run focused unit, lint, typecheck, account-workspace BDD, and full regular/destructive BDD; inspect the final diff for TASK-432.7.1-only scope and amend b13d5d24 without pushing.

5. Correct warm-fixture isolation: warmGlobalSurface receives the explicit global criticalPath and awaits its exact successful JSON response before measurement capture; warmAccountEventSurface receives the event entry path and awaits that exact entry response. Remove timing sleeps and preserve exact one-session/one-critical-read assertions.
6. Validate warmed overview and judging examples, then the 23-case account-workspace BDD suite, lint/typecheck when needed, and git diff --check; commit a new fix without amending or pushing bfd09e94.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Implementation notes:

The failed b13d5d24 implementation used serialized useState(account-api:bootstrap-loaded) readiness, which could remain true across a fresh Nuxt app bootstrap. The fix uses a module WeakMap keyed by the current useNuxtApp instance. Readiness is shared across all useAccountBootstrap consumers, clear resets readiness and refresh state, versioning prevents stale responses from becoming ready, and concurrent consumers join one abortable refresh wait. useApiClient remains low-level and acyclic; both useApiData and useProtectedApiFetch retain their bootstrap gates. No page flags, sleeps, retries, compatibility shims, relaxed request counts, D1 changes, cache changes, deploy changes, or other task files were used.

No canonical documentation or configuration change was required. Focused unit coverage proves fresh app instances ignore serialized readiness, consumers share readiness, clear resets it, and an aborted waiter does not cancel the shared refresh.

Final validation on 2026-08-21:

- bunx vitest run tests/unit/app/composables/useAccountBootstrap.test.ts tests/unit/app/composables/useApiData.test.ts tests/unit/app/composables/useProtectedApiFetch.test.ts tests/unit/app/composables/useAdminWorkspace.test.ts — 4 files, 15 tests passed.
- bun run lint — passed.
- bun run typecheck — passed.
- bun run test:unit — 164 files, 1,091 tests passed.
- bun run test:integration — 44 files, 468 tests passed.
- bun run test:bdd:account-workspace — 23 passed (53.1s); warmed ordinary /account/judging and cold held-session judging each issued exactly one /api/session and one /api/account/judging, with no API errors, page errors, or duplicate critical reads.
- bun run test:bdd — exit 0; regular BDD 86 passed (2.2m), destructive BDD 2 passed (15.4s).
- Focused simplified-claiming reproduction — 1 passed (14.8s).
- git diff --check — passed. Source check found no useState readiness or account-api:bootstrap-loaded in app/composables/useAccountBootstrap.ts.

An intermediate full BDD run against a temporary over-constrained post-refresh assertion failed 85/86: simplified-claiming timed out filling the disabled Luma email field after a page 500, and the navigation guard reported Account bootstrap did not become ready after refresh. That assertion was removed; the focused scenario then passed and the final full BDD rerun above passed 86 regular plus 2 destructive tests.

CI run 32436271579 exposed a fixture-isolation race, not another protected-fetch escape: the warmed global overview helper used page.goto + heading visible + waitForTimeout(250), but /api/session started at 221.07ms and finished at 306.05ms while the captured successful /api/account/overview started at 350.34ms. The warm page’s legitimate critical read began after capture, so the test observed an abandoned request and a second current read. The judging and cold judging examples passed. Fix the shared helpers defensively by awaiting the exact successful critical response before the helper returns and before capture begins; pass criticalPath from globalSurfaces. Review warmAccountEventSurface for the same entry-read leak and pass/await its exact entry path when applicable. No runtime app, D1, cache, deploy, or unrelated task files are in scope.

Fix validation on 2026-08-21: targeted global account workspace scenario (overview, judging, redemption) passed 3/3; overview and judging each recorded exactly one /api/session and one critical read. bun run test:bdd:account-workspace passed 23/23 in 43.0s. bun run lint passed. bun run typecheck passed. bun run test:unit passed 164 files and 1,091 tests. bun run test:bdd passed 86 regular tests plus 2 destructive tests. git diff --check passed. The only changed files are the account-workspace topology support, its BDD step callers, and this task record; no runtime, D1, cache, deploy, or other task files changed.
<!-- SECTION:NOTES:END -->

## Comments

<!-- COMMENTS:BEGIN -->
created: 2026-08-21 01:00
---
Reopened after deterministic warmed /account/judging evidence disproved the prior completion. The revised contract is current Nuxt app-instance readiness with one shared abortable in-flight bootstrap.
---

created: 2026-08-21 01:22
---
Per finalization instruction, the task remains In Progress because an intermediate full bun run test:bdd invocation failed 85/86 before the over-constrained post-refresh assertion was removed. The final rerun passed 86 regular and 2 destructive tests.
---
<!-- COMMENTS:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Updated the shared account-workspace warm fixtures so each helper subscribes before navigation, awaits the exact completed critical GET response, validates its successful JSON data envelope, and only then waits for the stable heading/tab. Global callers pass surface.criticalPath and event callers pass the entry path; the arbitrary 250ms delay is removed. Verified with the targeted global scenario (overview and judging each exactly one session plus one critical read), bun run test:bdd:account-workspace (23/23), bun run lint, bun run typecheck, bun run test:unit (1,091 tests), bun run test:bdd (86 regular plus 2 destructive), and git diff --check. Scope is limited to the shared topology support, its step callers, and this task record.
<!-- SECTION:FINAL_SUMMARY:END -->
