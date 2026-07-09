---
id: TASK-420
title: Add simplified attendee credit claiming
status: Done
assignee:
  - '@codex'
created_date: '2026-07-09 20:21'
updated_date: '2026-07-09 22:05'
labels: []
dependencies: []
priority: high
ordinal: 99000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Add an opt-in simplified claiming flow for Meetup participants. Event admins configure the feature during event creation or in Settings, import an approved Luma attendee CSV, configure one HTTPS coupon-link offer in Credits, and share /events/:slug/redeem. Authenticated participants verify their Luma email, receive exactly one coupon, and are recorded as checked in. No redemption token or selected offer field is part of the model.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Meetup creation and Settings expose simplifiedClaimingEnabled, allow zero offers with the warning Add a credit offer before sharing the QR, enforce incompatible-configuration checks, and lock the setting and slug after the first simplified claim.
- [x] #2 Enabled events allow at most one credit offer under concurrency, hide it from participant Credits, reject generic claims, allow unclaimed offer deletion, lock the claimed offer, and restore normal credit behavior when disabled before any simplified claim.
- [x] #3 Settings imports bounded Luma CSV files through csv-parse/sync, requires email, first_name, last_name, and approval_status, stores only approved minimal attendee eligibility, merges names without removing existing rows, and shows readiness, URL, QR preview, and SVG download.
- [x] #4 The authenticated unlinked /events/:slug/redeem flow preserves login and legal-consent return paths, uses saved-email auto-claim with editable retry, is noindex/nofollow/no-referrer, and redirects with history replacement.
- [x] #5 Redemption atomically verifies roster eligibility and registration state, handles absent/submitted/approved/rejected/withdrawn applications, updates only permitted profile fields, allocates one HTTPS coupon, remains idempotent, prevents multi-account reuse, and handles final-inventory concurrency.
- [x] #6 Successful redemption records checked_in_at with simplified_claim source while preserving earlier check-ins and manual joined/not_joined precedence; certificate eligibility and Luma webhook source behavior remain correct.
- [x] #7 Credit and attendance audits omit attendee emails and coupon URLs, the normal approval email is queued once, and disabled, incomplete, closed, invalid, sold-out, and rate-limited states are covered.
- [x] #8 Canonical domain, lifecycle, permissions, schema, API, and testing documentation describes the implemented current behavior.
- [x] #9 bun run lint, bun run typecheck, bun run test:unit, bun run test:integration, and bun run test:bdd pass.
- [x] #10 In Meetup Settings, attendee-claiming tools render directly below the simplified claiming checkbox only while it is checked; newly enabled unsaved configuration shows a save-first notice.
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Extend the canonical schema, migration, event contracts, attendance source, and documentation.
2. Add event configuration validation, readiness reporting, approved-attendee CSV import, sole-offer enforcement, safe deletion, and post-claim locks.
3. Add atomic participant redemption with roster verification, application approval, coupon allocation, attendance, profile updates, audit records, email notification, rate limiting, and idempotency.
4. Add the Meetup creation/Settings controls, roster and QR tools, Credits ownership UI, and the unlinked authenticated redeem page.
5. Add schema, unit, integration, and Auth0-backed BDD coverage; run the full required validation suite.
6. Record each implementation slice and validation result in this task, then finalize, commit, and push the isolated change to main.
7. Integrate the attendee-claiming tools directly below the Settings checkbox, gate them by local and persisted configuration state, and cover placement and toggle behavior in BDD.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Schema slice: added the event flag, EventAttendeeEligibility, claim linkage, check-in source, migration backfill, and schema/domain tests.

Backend slice: added bounded approved-attendee CSV import, readiness API, one-offer and HTTPS guards, safe deletion, post-claim locks, rate limiting, and transactional idempotent redemption with approval email and separate claim/check-in audits. Each D1 batch mutation is gated by the unique claim timestamp instead of cross-statement changes() state.

Admin UI slice: added the Meetup toggle, Settings readiness/roster/URL/QR/SVG panel, sole-offer Credits messaging, HTTPS inventory guidance, and safe offer deletion.

Participant slice: added the unlinked authenticated /events/:slug/redeem page with account-consent return handling, saved-email auto-claim, editable retry, noindex/nofollow/no-referrer, and replacement redirect.

Test and docs slice: covered concurrent final-coupon claims, attendee-email reuse, all application states, attendance precedence, readiness/error states, rate limiting, and Auth0-backed redirect/admin attendance behavior. Updated canonical domain, lifecycle, permissions, schema, API, and testing docs.

Validation passed: git diff --check; bun run lint; bun run typecheck; bun run test:unit (110 files, 770 tests); bun run test:integration (25 files, 358 tests); bun run test:bdd (48 main scenarios and 2 destructive scenarios).

Test deployment inspection found that the attendee-claiming API and event flag were present, but the Settings QR panel rendered as an unresolved custom element. Nuxt path-prefixed the nested component auto-import; the parent used the filename-only tag without the explicit import used by adjacent nested components.

Repair validation passed: git diff --check; bun run lint; bun run typecheck; bun run test:unit (110 files, 770 tests); bun run test:integration (25 files, 358 tests); bun run test:bdd (49 main scenarios and 2 destructive scenarios). The new event-admin scenario asserts the Settings heading, redemption URL, QR image, and SVG download control.

Repair commit 8117aa49 was pushed to origin/main. GitHub deploy-test run 29051951697 completed successfully and deployed the repaired Worker to test.codex-events.com.

UX follow-up: move the attendee-claiming tools into the Participation Rules form directly below the checkbox. Keep creation lightweight because no event ID exists yet; when an existing disabled event is checked but unsaved, show a save-first notice.

Inline Settings UX implemented: the persisted tools component now composes inside Participation Rules immediately after the checkbox, is mounted only while checked, and uses an integrated section instead of a nested card. Newly checked unsaved events show a save-first notice; creation has no event-scoped tools before save.

UX follow-up validation passed: git diff --check; bun run lint; bun run typecheck; bun run test:unit (110 files, 770 tests); bun run test:integration (25 files, 358 tests); bun run test:bdd (49 main scenarios and 2 destructive scenarios).

Inline Settings UX commit 3f800be0 was pushed to origin/main. GitHub deploy-test run 29053036474 completed successfully and deployed it to test.codex-events.com.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Implemented simplified attendee credit claiming for Meetups across schema, APIs, admin configuration, Luma CSV roster import, private QR redemption, transactional coupon assignment, attendance, audit/email behavior, tests, runtime bindings, and canonical docs. All required validation passes. No follow-up work is currently known; additive roster imports and post-first-claim configuration locks are intentional product behavior.

Implementation commit 8f11fdc0 was pushed directly to origin/main with unrelated groma files excluded.

Follow-up repair explicitly imports the nested Settings panel and adds browser coverage for its rendered QR controls.

Repair commit 8117aa49 is deployed successfully to the test environment.

The Settings tools now sit directly below and follow the state of the simplified attendee claiming checkbox.

Inline-toggle UX commit 3f800be0 is deployed successfully to the test environment.
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
- [x] #9 Implementation is committed and pushed directly to origin/main with unrelated worktree changes excluded.
<!-- DOD:END -->
