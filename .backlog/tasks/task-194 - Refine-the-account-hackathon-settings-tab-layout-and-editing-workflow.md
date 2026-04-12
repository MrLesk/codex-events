---
id: TASK-194
title: Refine the account hackathon settings tab layout and editing workflow
status: Done
assignee:
  - codex
created_date: '2026-04-12 11:48'
updated_date: '2026-04-12 12:24'
labels: []
dependencies: []
references:
  - 'app/pages/account/hackathons/[slug]/index.vue'
  - app/components/account/hackathons/AccountHackathonAdminSettingsPanel.vue
  - app/components/admin/HackathonConfigForm.vue
  - app/utils/account-hackathon-tabs.ts
  - app/utils/hackathon-program-settings.ts
documentation:
  - docs/domain-model.md
  - docs/api-surface.md
  - docs/permissions-matrix.md
priority: high
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Refine the admin-only Settings tab in `/account/hackathons/:slug?tab=settings` so it matches the surrounding account workspace UX and supports a cleaner editing flow. The tab should surface a clear summary at the top, simplify the main configuration layout, replace the current terms publishing UI with direct markdown editors for application and winner terms, and redesign judging criteria editing to use the same row-based drag-and-drop interaction style used elsewhere in the workspace. The canonical hackathon model and permissions remain unchanged; this task is a settings-surface UX and workflow refactor only.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 The Settings tab shows a clear overview at the top with the hackathon creator and counts for admins, staff, and judges using the existing card pattern already used on nearby account workspace tabs.
- [x] #2 Settings tab spacing is normalized so section gaps are consistent, the basic configuration content reads as one cohesive surface, maximum team members and participants limit render side by side, and the misleading separate save card, Program Snapshot card, and stray Program Rules / Terms and Scoring heading are removed.
- [x] #3 Terms management is replaced with separate Application terms and Winner terms markdown editors, each with its own save action that creates a new version and immediately sets it as current using an auto-generated title.
- [x] #4 Judging criteria editing uses the agenda-style row layout with drag affordance on the left, editable fields in the middle, delete action on the right, supports local add/reorder/remove before persistence, and persists the full edited criteria list only when the user clicks save.
- [x] #5 Relevant tests are updated for the changed settings-surface behavior, any newly introduced API surface is documented, and `bun run lint`, `bun run typecheck`, and `bun run test:unit` pass locally.
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Add a four-card overview row at the top of the settings surface using the existing `hackathon-workspace-detail-inset` summary-card pattern. Derive the creator label from `createdByUserId` and loaded role-assignment user data when available, and compute admin, staff, and judge counts from the explicit role-assignment roster with platform-admin fallback labeling for creator when applicable.
2. Refine the settings configuration form layout in `HackathonConfigForm.vue` so section spacing is consistently `space-y-6`, `maxTeamMembers` and `participantsLimit` render side by side, and the main configuration flow reads as one carded surface with the save action at the bottom of the main configuration card rather than in a separate detached card.
3. Remove the Program Snapshot card and the stray Program Rules / Terms and Scoring heading from `AccountHackathonAdminSettingsPanel.vue`.
4. Replace the current terms publishing UI with two independent markdown editors, one for application terms and one for winner terms. Each save action should create a new terms version, auto-generate a title from document type plus next version and current date, then immediately set the new version as current before refreshing the workspace.
5. Rebuild judging criteria editing into an agenda-style local editor using `AdminEditorRowShell`, with local add/edit/reorder/delete support, drag-and-drop ordering, and a single explicit save action that persists the edited criteria set. Reuse the existing criteria endpoints by creating local drafts, patching existing rows, and removing deleted persisted rows in one save flow.
6. Update and add targeted unit tests for the helper copy/layout logic changed by this refactor, confirm canonical docs remain unchanged, and run `bun run lint`, `bun run typecheck`, and `bun run test:unit` before handoff.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
User approved the implementation plan on 2026-04-12 and requested the refactor to proceed.

Canonical docs were reviewed before planning; no product-doc changes are expected because this task changes the settings-surface UX and save workflow rather than the underlying hackathon model.

Implemented the settings-tab UX refactor in the admin settings panel and config form: added top summary cards, merged config sections into a single save surface, normalized section spacing, removed the snapshot/stray heading, and aligned participation inputs side by side.

Replaced the old terms workflow with two markdown editors that auto-generate version titles and set the created version current immediately after save. Rebuilt judging criteria into a local row editor with drag/drop ordering and a single save action.

Added a DELETE evaluation-criteria API route plus route test coverage so persisted criteria can be removed from the new editor. Updated `docs/api-surface.md` to document the added admin endpoint.

Validation completed successfully: `bun run lint`, `bun run typecheck`, `bun run test:unit`, and targeted `bun run test:integration -- tests/integration/server/api/hackathon-admin-routes.test.ts`. Residual gap: drag-and-drop UI interactions are still covered indirectly through component logic and server/integration coverage rather than browser-level automation.

Follow-up UI polish: adjust the participation-limits two-column row so the max-team-members field does not stretch taller than the participants-limit field when helper text is present in the neighboring column.

Patched the participation-limits grid in `HackathonConfigForm.vue` to use `md:items-start` in both settings and full modes, preventing the max-team-members field from stretching to match the neighboring helper-text column and keeping both inputs visually aligned. Revalidated with `bun run lint`, `bun run typecheck`, and `bun run test:unit`.

Follow-up UI cleanup: simplify the terms panel by removing the nested inset-card layout and trimming explanatory copy/title metadata down to a flat two-section editor with only compact current-version state.

Simplified the terms UI in `AccountHackathonAdminSettingsPanel.vue`: removed the inset-card-in-card layout, shortened the card title to `Terms`, removed generated-title and explanatory copy, and reduced each editor to a plain section with only a compact current-version label plus the editor and save action. Revalidated with `bun run lint`, `bun run typecheck`, and `bun run test:unit`.

Follow-up UI consistency pass: normalize section-level save buttons so terms, criteria, and prizes share the same explicit primary medium button treatment, while keeping the main configuration save larger as the page-level action.

Ran a copy pass on the settings tab to remove obvious over-explanation. Simplified settings helper copy, shortened the basic-information intro, trimmed Luma and description helper text, removed the redundant participants-limit helper, shortened requirement toggle labels, and rewrote the judging criteria / prize section descriptions to focus on the admin action instead of internal workflow language. Validation now passes cleanly again: `bun x eslint app/components/admin/HackathonConfigForm.vue app/components/account/hackathons/AccountHackathonAdminSettingsPanel.vue app/utils/hackathon-program-settings.ts tests/unit/app/utils/hackathon-program-settings.test.ts`, `bun run test:unit -- tests/unit/app/utils/hackathon-program-settings.test.ts`, `bun run lint`, and `bun run typecheck`.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Refined the account hackathon Settings tab to match the rest of the workspace and reduce misleading layout breaks. The page now starts with summary cards for creator, admins, staff, and judges; the core configuration reads as one continuous card with consistent section spacing; participation limits share a row; and the detached save card, Program Snapshot, and stray Terms/Scoring heading are gone.

Replaced terms publishing with two direct markdown editors for application terms and winner terms. Each save auto-generates a version title from document type plus version/date, creates the version, and immediately sets it current. Rebuilt judging criteria into the same row-based editing pattern used elsewhere, with local add/reorder/delete before one explicit save. Supporting this required a DELETE evaluation-criteria endpoint, which is now documented in `docs/api-surface.md`.

Tests and validation: updated unit coverage for settings helper copy/SEO, extended hackathon admin route integration coverage for criterion deletion, and ran `bun run lint`, `bun run typecheck`, `bun run test:unit`, and `bun run test:integration -- tests/integration/server/api/hackathon-admin-routes.test.ts` successfully. Follow-up risk: drag-and-drop remains unverified by browser automation, though the ordering logic and persistence path are covered by existing logic and integration tests.
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
