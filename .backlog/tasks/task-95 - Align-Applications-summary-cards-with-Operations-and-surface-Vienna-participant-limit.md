---
id: TASK-95
title: >-
  Align Applications summary cards with Operations and surface Vienna
  participant limit
status: Done
assignee:
  - codex
created_date: '2026-03-29 17:26'
updated_date: '2026-03-29 17:27'
labels:
  - ux
  - admin-ui
dependencies: []
documentation:
  - docs/api-surface.md
  - docs/schema-outline.md
priority: medium
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Refine the account hackathon Applications tab so its top summary area uses the same card treatment as the admin Operations surface instead of the lighter transparent stat row. When a hackathon has a participant planning target, display that limit clearly in the Applications summary area. The current local Vienna hackathon record (`codex-vienna-2026-04-18`) has `participants_limit` unset in local D1 state; set it to `80` so the updated UI can surface the intended planning target.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 The Applications tab summary area uses the same card-style visual treatment as the admin Operations summary row.
- [x] #2 When `participantsLimit` is present, the Applications tab clearly displays the planning target in the summary area.
- [x] #3 The existing application review actions and grouped applicant UI remain unchanged apart from the summary-area refinement.
- [x] #4 The local Vienna hackathon record `codex-vienna-2026-04-18` has `participants_limit = 80` in the current local D1 state if it was previously unset.
- [x] #5 Required local validation passes after the UI change.
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Replace the Applications tab's transparent stat row with the same `hackathon-workspace-detail-inset` summary-card treatment used by the Operations surface.
2. Fold participant-limit visibility into that summary row by adding a planning-target card when `participantsLimit` is present, using the existing participant-limit helper for current and projected fill messaging.
3. Leave the grouped applicant cards and staged-decision actions unchanged apart from the summary-area styling adjustment.
4. Update the current local D1 hackathon record `codex-vienna-2026-04-18` to `participants_limit = 80` because the local state currently stores `NULL`.
5. Run `bun run test:unit` after the UI change and confirm the local D1 update.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Aligned the Applications summary strip with the Operations summary-card treatment by reusing the same inset card visual style instead of the lighter transparent stat row.

Replaced the participant-limit alert with an inline summary card that shows the planning target and current/projected fill when `participantsLimit` is present, keeping the grouped applicant review area unchanged.

Updated the current local D1 record `hackathon_codex_vienna_2026_04_18` / `codex-vienna-2026-04-18` from `participants_limit = NULL` to `80`. This change lives in local `.wrangler/state` only and is not sourced from a checked-in seed file.

No dedicated automated test was added because this follow-up is presentational and reuses the existing participant-limit helper without changing its logic. Validation: `bun run test:unit`, `bun run typecheck`.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Aligned the Applications tab summary strip with the Operations surface by replacing the lighter transparent stat row in `AdminApplicationsReviewPanel.vue` with the same inset summary-card treatment. The summary area now feels consistent with the rest of the admin workspace while leaving the grouped applicant review blocks and staged-decision actions unchanged.

When a hackathon has a participant planning target, the Applications tab now shows that value directly in the summary row through a dedicated `Participants limit` card. That card also surfaces the current approved fill and projected fill after staged approvals, replacing the earlier participant-limit alert with a cleaner inline presentation.

I also checked the current local D1 state and found the active Vienna hackathon record `hackathon_codex_vienna_2026_04_18` / `codex-vienna-2026-04-18` had `participants_limit = NULL`. I updated that local record to `80`, so the Applications tab can show the intended planning target immediately in this environment. This DB change lives only in `.wrangler/state` and is not backed by a checked-in seed source.

Validation: `bun run test:unit`, `bun run typecheck`.

Risk / note: because the Vienna participant-limit update was applied directly to local D1 state, it will need to be re-applied if local state is reset from scratch unless a checked-in seed source for that hackathon is introduced later.
<!-- SECTION:FINAL_SUMMARY:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [x] #1 Canonical docs were updated or confirmed unchanged
- [x] #2 Code behavior matches canonical docs
- [x] #3 Relevant validation commands pass
- [ ] #4 Tests were added or updated when behavior changed
- [x] #5 Test gaps are documented when automation is not practical
- [x] #6 Config and developer workflow docs were updated when setup changed
- [x] #7 Auth and permissions changes follow the documented platform model
- [x] #8 Risks and follow ups are recorded in the task summary
<!-- DOD:END -->
