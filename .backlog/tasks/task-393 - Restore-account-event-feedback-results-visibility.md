---
id: TASK-393
title: Restore account event feedback results visibility
status: Done
assignee:
  - Codex
created_date: '2026-06-13 20:40'
updated_date: '2026-06-13 20:58'
labels:
  - bug
  - events
  - feedback
dependencies: []
references:
  - 'https://codex-events.com/account/events/codex-vienna-2026-04-18?tab=feedback'
documentation:
  - docs/domain-model.md
  - docs/api-surface.md
  - docs/permissions-matrix.md
priority: high
ordinal: 72000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
The account event workspace feedback tab at `/account/events/:slug?tab=feedback` can show no feedback even though feedback rows exist for the event. Restore the authorized account feedback results view so stored anonymous feedback entries are visible again for events such as Codex Vienna 2026-04-18.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Authorized judges, event staff, event admins, and platform admins can see existing feedback results in the account event feedback tab when feedback rows exist for the event.
- [ ] #2 The feedback tab distinguishes an actual zero-response event from a failed or incomplete feedback data load.
- [ ] #3 A regression test covers the account feedback results path for an event with multiple stored feedback rows.
- [ ] #4 Required validation for the touched code path passes before handoff.
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Started investigation from the production-visible account feedback tab report. Initial repository search found feedback routes, AccountEventFeedbackPanel, and an unrelated pre-existing modification in app/components/account/events/AccountEventParticipantVisibilityPanel.vue that must not be overwritten.

User asked to pause implementation and first verify whether production D1 contains `event_feedback` rows for `codex-vienna-2026-04-18`.

Production D1 check is currently blocked by local Wrangler authentication: `wrangler whoami` fails with Cloudflare API code 9109 (`Invalid access token`). No code changes have been made for the fix.

Production D1 verification results: using `.env` with `CF_MGMT_TOKEN` suppressed so Wrangler uses `CF_API_TOKEN`, the D1 database named `codex-hackathons` contains the event `codex-vienna-2026-04-18` in `completed` state but `count(event_feedback.id) = 0`. `event_feedback` has 0 rows total in `codex-hackathons`. Across visible D1 databases: `codex-events-test` has 0 feedback rows, `preview-mise-rms` does not have an `event_feedback` table, `dev-codex-hackathons` has 2 feedback rows total but 0 for the Vienna slug. No application code changes have been made.

Recovery investigation update: production Worker `codex-hackathons` current settings bind DB to D1 `4a138b1e-0267-47c4-8124-ab75cb530e28` (`codex-hackathons`). Current and representative deployed versions from Apr 17, Apr 19, Jun 4, Jun 9, and Jun 13 mostly use this same binding. One uploaded version, #87 from 2026-06-02 19:16:44Z, referenced D1 `365acfb3-601b-4434-ac2a-31e6d5fa09a6`; Cloudflare D1 API now returns 404 for that database ID and it does not appear in `wrangler d1 list`. Production schema has only `event_feedback` (no leftover `hackathon_feedback` table). `d1_migrations` shows feedback migrations 0043/0044 applied Apr 19/20 and event generalization migration 0050 applied Jun 2. Cloudflare audit log API access is blocked by token permissions (403), so deletion/binding-change audit could not be confirmed. Cloudflare docs state D1 Time Travel restore is in-place/destructive and current D1 does not support fork/clone from Time Travel; recovery of current D1 rows would require approved restore/export/restore-back choreography, while recovery of deleted D1 `365acfb3...` may require Cloudflare support or an external backup.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Investigated the missing feedback report without changing application code. Production D1 `codex-hackathons` contains the Vienna event but zero `event_feedback` rows, and `event_feedback` has zero rows total. The live production Worker is currently bound to that same D1. One uploaded Worker version from 2026-06-02 referenced deleted/missing D1 `365acfb3-601b-4434-ac2a-31e6d5fa09a6`, but Cloudflare D1 API returns 404 for it and it is absent from `wrangler d1 list`. Cloudflare audit logs were inaccessible with the current token. User chose to stop investigation rather than proceed with a D1 restore runbook or Cloudflare support path.
<!-- SECTION:FINAL_SUMMARY:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 Canonical docs were updated or confirmed unchanged
- [ ] #2 Code behavior matches canonical docs
- [ ] #3 Relevant validation commands pass
- [ ] #4 Tests were added or updated when behavior changed
- [ ] #5 Test gaps are documented when automation is not practical
- [ ] #6 Config and developer workflow docs were updated when setup changed
- [ ] #7 Auth and permissions changes follow the documented platform model
- [ ] #8 Risks and follow ups are recorded in the task summary
<!-- DOD:END -->
