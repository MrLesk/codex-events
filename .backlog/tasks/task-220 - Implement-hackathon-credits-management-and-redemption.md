---
id: TASK-220
title: Implement hackathon credits management and redemption
status: Done
assignee:
  - '@codex'
created_date: '2026-04-14 17:58'
updated_date: '2026-04-14 18:16'
labels:
  - hackathon
  - credits
  - admin
  - participant
dependencies: []
documentation:
  - docs/domain-model.md
  - docs/schema-outline.md
  - docs/permissions-matrix.md
  - docs/api-surface.md
priority: high
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Add a new hackathon-scoped credits domain that is separate from winner prizes. Hackathon admins need a Credits tab where they can create credit offers, upload single-column CSV batches of redeemable codes or links, review remaining inventory, and see which users claimed each offer. Approved participants need a Credits tab in the account hackathon workspace where they can redeem at most one code per offer and then view the assigned value on later visits. If the assigned value is a URL it should render as a proper link rather than plain code text.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Canonical docs define hackathon credits as a separate domain from prizes, including approved-participant eligibility and per-offer single-claim behavior.
- [x] #2 Hackathon admins can create and edit credit offers and append inventory to an offer by uploading a single-column CSV in the hackathon Credits tab.
- [x] #3 The system tracks per-offer inventory, preserves claimed assignments, and guarantees that a user can claim at most one code per credit offer even under concurrent requests.
- [x] #4 Approved participants can use the hackathon Credits tab to claim available credits and later see their previously assigned value.
- [x] #5 Claimed values that are http or https URLs render as links in the participant UI; other values render as copyable codes or plain text.
- [x] #6 Automated tests cover the new credits model and claim behavior, and required local validation passes.
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Update the canonical docs to add a hackathon credits domain, schema outline, permissions, lifecycle expectations, and API surface separate from prizes.
2. Add persistent credits tables and relations in the server schema, plus a migration for credit offers and uploaded credit codes with per-offer single-claim guarantees.
3. Implement hackathon-scoped admin APIs to list, create, update, and import credits inventory using the existing hackathon admin route and multipart-upload patterns.
4. Implement participant-facing credits APIs to list visible credit offers for a hackathon and atomically claim one available code for the current approved participant.
5. Add a new Credits tab in the account hackathon workspace with an admin management panel and a participant redemption panel that share the same tab shell.
6. Add tests for schema and API behavior, especially single-claim enforcement, sold-out behavior, approved-participant gating, and URL-versus-code presentation helpers.
7. Run required validation: bun run lint, bun run typecheck, and bun run test:unit.
<!-- SECTION:PLAN:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Implemented a separate hackathon credits domain with new canonical docs, schema tables and migration, admin and participant credit APIs, and a shared Credits tab in the account hackathon workspace. Admins can create/edit credit offers, upload single-column CSV batches, review inventory and claim records, and approved participants can claim at most one code per offer and revisit their assigned code or link later. The claim path uses an atomic SQL update plus a partial unique index on (credit_offer_id, claimed_by_user_id) to enforce one claim per user per offer under concurrency. Added schema, utility, UI, and API tests, including a targeted integration suite for credit routes. Validation passed with bun run lint, bun run typecheck, bun run test:unit, and bun run vitest --config vitest.integration.config.ts run tests/integration/server/api/hackathon-credit-routes.test.ts. Follow-up/risk: CSV import is intentionally minimal and assumes a single-column, headerless file with one redeemable value per row.
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
