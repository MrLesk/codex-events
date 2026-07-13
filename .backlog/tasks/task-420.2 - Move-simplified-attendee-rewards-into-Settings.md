---
id: TASK-420.2
title: Move simplified attendee rewards into Settings
status: Done
assignee:
  - '@codex'
created_date: '2026-07-13 20:00'
updated_date: '2026-07-13 20:36'
labels: []
dependencies: []
parent_task_id: TASK-420
priority: high
type: feature
ordinal: 101000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Make simplified attendee claiming an organizer-owned setup workflow in Meetup Settings. Organizers prepare the stable QR, upload private HTTPS reward links directly in the nested claiming section, and upload the final approved Luma roster during the event. Simplified-only rewards remain stored in the event credit tables but never appear in normal Credits surfaces or generic claim paths.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Checking simplified attendee claiming reveals one visually attached setup surface directly beneath the checkbox, including a save-first creation state, QR controls, reward-link upload, roster upload, and overall readiness.
- [x] #2 The redemption QR is available after the event is saved even before rewards or attendees are ready, while the participant redemption route remains unavailable until all readiness requirements pass.
- [x] #3 Uploading a bounded single-column CSV of HTTPS reward links from Settings atomically creates or reuses the event simplified-only offer, appends inventory, reports counts, and prevents concurrent duplicate simplified offers.
- [x] #4 Simplified-only offers are explicitly flagged in the schema, backfilled by migration for existing simplified events, excluded from normal admin and participant credit listings, and rejected by generic claim operations regardless of the event setting.
- [x] #5 An enabled simplified-claiming Meetup does not expose the normal Credits tab for its private reward inventory; ordinary event credits remain unchanged.
- [x] #6 Disabling simplified claiming before any claim leaves its reward inventory private and unavailable rather than converting it to ordinary credits; claimed simplified configuration remains locked and unclaimed private inventory can be deleted safely.
- [x] #7 Approved Luma roster imports remain additive and available while claiming is active, including after the first redemption.
- [x] #8 Canonical docs and automated schema, API, UI, integration, and BDD coverage describe and verify the updated organizer and participant behavior.
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
1. Update canonical credit rules, schema, and migration with an explicit simplified-only offer flag and backfill. 2. Add a Settings-owned reward import endpoint, scoped offer lookup, readiness counts, visibility filters, manual-claim guards, and safe disable/delete behavior. 3. Refactor the existing attendee claiming panel into an attached three-step setup surface with QR, reward upload, roster upload, and readiness states; hide the normal Credits tab for enabled simplified events. 4. Add focused unit/integration/BDD coverage, run all required validation, record results, and commit/push only this task.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Component map: EventConfigForm owns the checkbox and attached enabled/save-first shell; AccountEventSimplifiedClaimingPanel remains the event-scoped data and action container; AccountEventSimplifiedClaimingStep is a presentational row with typed number/title props and status/content slots. The existing claiming panel is the closest domain analog and is extended rather than replaced. No shared ordered setup-row component exists; the focused child avoids duplicating the same hierarchy three times while all controls continue to use AppButton, AppBadge, and AppAlert.

Schema slice: added simplified_claiming_only with a per-event partial unique index and an explicit migration that flags the sole offer of existing simplified events. Canonical domain, lifecycle, permissions, schema, API, and testing docs now make Settings the owner and keep disabled private inventory hidden.

Backend slice: added a bounded Settings reward-link import that uses one D1 batch to create/reuse the private offer and append HTTPS inventory, filters private offers from both Credits listings, rejects generic create/update/import/claim paths, keeps disablement private, and permits additive attendee imports after redemption. Focused integration and migration tests pass.

Admin UI slice: rebuilt the checkbox and panel as one attached, indented setup surface with QR, private reward upload/delete, Luma attendee upload, readiness, and three-step status. Creation and unsaved enablement show the same nested save-first shell. Enabled simplified events omit the Credits tab. Typecheck, unit tests, and focused lint pass.

Final UI slice: the full event-creation form and Settings form previously rendered separate participation-rule branches. The authenticated browser test exposed that only Settings had the nested setup. Both now reuse AccountEventSimplifiedClaimingControl, which owns the checkbox, lock state, and save-first/active child surface; the panel and ordered step component remain focused on persisted data and actions.

Validation: git diff --check passed. bun run lint passed. bun run typecheck passed. bun run test:unit passed (110 files, 771 tests). bun run test:integration passed (25 files, 360 tests). bun run test:bdd passed (50 regular/authenticated scenarios and 2 destructive authenticated scenarios). No known automation gaps, configuration changes, or follow-up risks remain.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Completed the organizer-owned simplified claiming workflow. Event creation and Settings now share one visually attached three-step setup for the stable QR, private reward-link inventory, and approved Luma attendee import. Simplified rewards carry an explicit database scope, remain hidden from normal Credits surfaces and generic claim paths even after disablement, and are created/appended atomically with concurrency protection. Readiness, safe deletion, post-claim locking, late roster imports, participant redemption, and check-in behavior are covered by schema/unit/integration/Auth0-backed BDD validation. All required commands passed; no known follow-up risks or test gaps remain.
<!-- SECTION:FINAL_SUMMARY:END -->
