---
id: TASK-432.11
title: Restore safe Cloudflare edge caching for public delivery
status: In Progress
assignee:
  - '@luna-cache-topology'
created_date: '2026-08-20 23:32'
updated_date: '2026-08-21 00:07'
labels: []
dependencies: []
parent_task_id: TASK-432
priority: high
type: enhancement
ordinal: 147000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
The protected gateway now disables Cloudflare pre-Worker caching to prevent Cookie-insensitive authenticated response sharing. Restore edge HIT behavior only for explicitly public event HTML, JSON, and versioned media without re-enabling shared caching for the gateway, protected APIs, actor-specific content, or mutable originals. The architecture must remain self-hostable and fail closed when a route is not explicitly public.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Protected and unknown routes cannot be served from Cloudflare shared cache before authorization and retain private no-store responses
- [ ] #2 Explicit public event HTML, JSON, and managed versioned media can produce genuine Cloudflare edge HITs with the canonical 30-second freshness contract
- [x] #3 The cache key and entrypoint topology cannot vary protected content only by Cookie or other untrusted request metadata
- [ ] #4 Generated deployment configuration, operator documentation, source tests, and a deployed browser/edge gate preserve the split topology
- [x] #5 The solution does not introduce a runtime purge secret or claim strict revocation within the documented 30-second public freshness window
<!-- AC:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [x] #1 Canonical docs were updated or confirmed unchanged
- [x] #2 Code behavior matches canonical docs
- [x] #3 Relevant validation commands pass
- [x] #4 Tests were added or updated when behavior changed
- [x] #5 Test gaps are documented when automation is not practical
- [x] #6 Config and developer workflow docs were updated when setup changed
- [ ] #7 Auth and permissions changes follow the documented platform model
- [x] #8 Risks and follow ups are recorded in the task summary
<!-- DOD:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Keep the Nitro-generated `.output/server/index.mjs` as the uncached application handler and add a checked-in build wrapper that exports the default gateway plus a `PublicCache` WorkerEntrypoint.
2. Route only the canonical public homepage/event-detail HTML and the existing explicit public JSON/managed-media allowlist through `ctx.exports.PublicCache.fetch`; strip Cookie, Authorization, D1 bookmark, and other actor/request state before the cached call.
3. Configure Wrangler with top-level cache enabled, default gateway cache disabled, and only `PublicCache` cache enabled; update generated config and pin the Wrangler version required for per-entrypoint cache settings.
4. Add source/config/build tests proving unknown and protected paths never enter the cached entrypoint, public requests use a canonical sanitized cache request, and the generated deployment topology is fail-closed.
5. Update canonical operator/developer/agent guidance and TASK-432.11 notes, then run focused cache/entrypoint/config tests plus the required validation suite. Remote deployment, edge HIT proof, cache purge, and browser rollout remain outside this task.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Context brief: the current Nitro cloudflare-module build exports only the default handler from `.output/server/index.mjs`; Wrangler 4.85 cannot express the documented per-entrypoint cache map. The implementation will use a build wrapper and upgrade the checked-in Wrangler dependency to the supported per-entrypoint configuration surface. No D1 placement files or remote resources are in scope.

Architecture review follow-up: added explicit enable_ctx_exports to generated compatibility_flags because Cloudflare context docs require it for ctx.exports. Generated .wrangler/generated/test.jsonc from representative environment values and validated the actual wrapper/config with Wrangler 4.125.0 --dry-run; Wrangler ran build:cloudflare, bundled the wrapper, listed bindings, and exited without deployment. Focused topology/generator/entrypoint tests, lint, and typecheck pass.

Final local validation: bun run lint, bun run typecheck, bun run test:unit (161 files / 1,073 tests), bun run test:integration (43 files / 467 tests), bun run test:bdd (85 standard scenarios plus 2 destructive scenarios), and bun run build:cloudflare pass. Generated test config with representative environment values and validated the actual wrapper/config using Wrangler 4.125.0 --dry-run; this ran the configured Cloudflare build and exited without deployment. The upgraded local image runtime required replacing the existing invalid PNG test fixture with a valid equivalent; this is test-only. No remote resources were changed. AC #2 and #4 remain unchecked pending deployed edge HIT and real-browser evidence on test.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Implemented the fail-closed Cloudflare split entrypoint: the default Nitro gateway is uncached, only the explicit public allowlist enters the cached PublicCache WorkerEntrypoint through ctx.exports, and the cached request is sanitized of actor/request state. Generated Wrangler config enables top-level cache, disables the default export, enables PublicCache, and explicitly includes enable_ctx_exports. Local validation and Wrangler 4.125.0 dry-run pass; remote deployment and edge/browser evidence remain required.
<!-- SECTION:FINAL_SUMMARY:END -->
