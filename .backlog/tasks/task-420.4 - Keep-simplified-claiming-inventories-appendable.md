---
id: TASK-420.4
title: Keep simplified claiming inventories appendable
status: Done
assignee:
  - '@codex'
created_date: '2026-07-13 21:17'
updated_date: '2026-07-13 21:23'
labels: []
dependencies: []
parent_task_id: TASK-420
priority: high
type: bug
ordinal: 103000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Allow event admins to append reward links and approved Luma attendees throughout the simplified claiming lifecycle. First redemption continues to lock event configuration, slug, and offer identity, but must not lock either append-only inventory. Imports deduplicate reward URLs and normalized attendee emails.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Reward-link upload remains enabled after the first redemption and appends only previously unseen HTTPS links.
- [x] #2 Duplicate reward links within one file, across later imports, and across concurrent imports do not create duplicate inventory rows.
- [x] #3 Luma attendee imports remain available after redemptions and keep one eligibility row per normalized email while refreshing names.
- [x] #4 The UI distinguishes locked configuration from appendable rewards and attendees and explains duplicate handling.
- [x] #5 Canonical documentation and regression tests describe and verify the append-only inventory behavior.
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
1. Update canonical lifecycle, permissions, API, and schema guidance to distinguish locked configuration from appendable inventories.
2. Remove the redemption lock from simplified reward imports and deduplicate input and stored links while preserving one simplified-only offer and atomic D1 batches.
3. Update Settings copy and controls so reward and attendee uploads remain available and explain unique-entry behavior.
4. Add integration and UI regression coverage for post-claim appends and duplicate reward/email imports.
5. Run the required validation suites, record results, finalize the task, and commit/push the isolated change to main.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Closest UI analog remains AccountEventSimplifiedClaimingPanel and AccountEventSimplifiedClaimingStep; no new component is needed. The attendee endpoint already uses an event/email unique constraint with upsert behavior. The reward endpoint currently blocks on summary.locked and must switch its SQL predicate from “no prior claims” to “no identical value in the simplified offer.”

Documentation slice: Updated the canonical domain, lifecycle, permissions, schema, API, and testing rules. The first claim now locks configuration and offer identity; both inventories remain appendable, rewards deduplicate by exact HTTPS value, and attendees merge by normalized email.

Backend slice: Simplified reward imports no longer reject a claimed event. Each file is deduplicated before batching, and each D1 insert selects only reward values not already present in the sole simplified offer. Import responses and audits now report added and skipped counts. Existing attendee imports were confirmed to remain unlocked and to upsert the event/email unique row.

Admin UI slice: Settings no longer labels or disables reward uploads as Locked after redemption. Active-state copy now limits the lock to the event URL and claiming option, both upload controls remain enabled, and reward/attendee guidance plus toasts explain unique-entry handling.

Initial regression check: `bun run test:integration -- tests/integration/server/api/simplified-claiming-routes.test.ts` passed (1 file, 9 tests), including post-claim reward appends, duplicate links in one/later/concurrent imports, and duplicate normalized attendee emails before and after claims.

Final validation: `bun run lint` passed; `bun run typecheck` passed; `bun run test:unit` passed (110 files, 771 tests); `bun run test:integration` passed (25 files, 360 tests); `bun run test:bdd` passed (50 regular/authenticated scenarios and 2 destructive scenarios). The Auth0-backed Settings scenario exercised the post-redemption state and verified both upload buttons remain enabled with no reward Locked badge. `git diff --check` passed.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Kept simplified claiming inventories appendable after redemptions. Reward imports now skip duplicate exact HTTPS links within a file, across prior uploads, and under concurrent uploads; Luma imports continue merging unique normalized emails and refreshing names. Settings keeps both uploads enabled and explains what remains locked. Canonical docs and integration/Auth0-backed UI coverage were updated. All required validation passed. No setup change, data migration, known risk, or follow-up is required.
<!-- SECTION:FINAL_SUMMARY:END -->
