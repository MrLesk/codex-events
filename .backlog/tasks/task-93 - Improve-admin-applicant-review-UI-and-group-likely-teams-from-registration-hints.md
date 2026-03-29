---
id: TASK-93
title: >-
  Improve admin applicant review UI and group likely teams from registration
  hints
status: Done
assignee:
  - codex
created_date: '2026-03-29 17:14'
updated_date: '2026-03-29 17:22'
labels:
  - ux
  - admin-ui
dependencies: []
documentation:
  - docs/domain-model.md
  - docs/api-surface.md
  - docs/permissions-matrix.md
priority: high
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Update the account hackathon Applications tab for hackathon admins and platform admins so applicant review is easier to scan and likely teammates appear together. The current admin review surface is a flat applicant list with weak separation between records. Registration already captures teammate hints (`fullName`, `email`) inside `registrationDetailsJson`; use those hints to build a UI-only likely-team grouping in the Applications tab. Matching should use exact applicant email first, and only fall back to very-high-threshold fuzzy name matching when no email match exists. Any fuzzy match must be clearly labeled in the UI, and unmatched hinted teammates should remain visible as pending within the grouped view.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 The Applications tab presents applicants with clearer visual separation than the current flat list and remains usable for hackathon admins and platform admins reviewing many applications.
- [x] #2 The Applications tab groups likely teammates together using registration teammate hints, treating grouping as a UI-only inference rather than a persisted team record.
- [x] #3 Applicant matching uses exact email equality first and only falls back to very-high-threshold fuzzy full-name matching when no applicant email match exists for that hint.
- [x] #4 Any applicant grouped through fuzzy name matching is clearly labeled as a fuzzy match in the UI so admins can distinguish inferred matches from exact matches.
- [x] #5 Hints that do not match a current applicant remain visible as pending teammates within the likely-team group rather than being dropped.
- [x] #6 Existing application review actions and staged-decision flows continue to work for each applicant inside the grouped layout.
- [x] #7 Relevant unit coverage is added or updated for the grouping and matching logic, and required local validation passes.
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Add a dedicated admin-application review utility that parses `registrationDetailsJson`, normalizes applicant and hinted teammate names and emails, and builds UI-only likely-team groups from the flat application list.
2. Implement matching in this order only: exact applicant email equality first; if a hint does not resolve by email, allow a very-high-threshold fuzzy full-name match only when the applicants hint each other; otherwise keep the hint as pending.
3. Return explicit group metadata so the UI can distinguish actual applicants, pending hinted teammates, and applicants who were linked through fuzzy matching.
4. Refactor `AdminApplicationsReviewPanel.vue` to render stronger grouped blocks for likely teams, clearer per-applicant separation inside each block, and explicit fuzzy-match labeling while preserving the existing staged-decision actions.
5. Add unit coverage for the grouping and matching utility, then run targeted tests followed by `bun run test:unit`.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
User approved a UI-only grouping approach for the Applications tab. Exact email matching takes precedence, name matching only runs when email does not resolve, and any fuzzy-linked applicant must be labeled clearly in the UI. Unmatched teammate hints remain visible as pending inside the inferred group.

Confirmed canonical docs remain unchanged. This feature is an admin Applications-tab presentation improvement built from existing registration hint data, not a domain or API contract change.

Added a new app-side grouping utility that parses `registrationDetailsJson`, groups likely teammates with exact-email-first matching, falls back to mutual high-threshold fuzzy full-name matching only when email does not resolve, and keeps unresolved teammate hints visible as pending.

Refactored `AdminApplicationsReviewPanel.vue` to render stronger inferred-team containers with nested applicant cards, fuzzy-match badges, and pending teammate hint cards while preserving the existing staged approval and rejection actions for each applicant.

No new dependency was added. The fuzzy fallback uses a local high-threshold Jaro-Winkler-style matcher plus a uniqueness margin because the repo did not already include a fuzzy-search package and the use case is pairwise name inference rather than open-ended search.

Validation: `bun test tests/unit/app/utils/admin-application-review.test.ts`, `bun run test:unit`, `bun run typecheck`.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Improved the admin Applications tab so applicant review is easier to scan and likely teammates appear together. The flat applicant list in `AdminApplicationsReviewPanel.vue` now renders stronger grouped containers derived from registration teammate hints, with nested applicant cards that preserve the existing staged approval and rejection actions. Groups that represent likely teams are visually separated from individual applicants, and pending teammate hints remain visible inside the same inferred team block instead of disappearing.

Implemented the grouping as a UI-only app utility in `app/utils/admin-application-review.ts`. It parses each application's `registrationDetailsJson`, resolves teammate links by exact applicant email first, and only falls back to a very-high-threshold fuzzy full-name match when email does not resolve. Fuzzy grouping requires mutual hinting between applicants, and any applicant brought into a group by that path is explicitly labeled in the UI as a fuzzy teammate match. Unresolved teammate hints are deduplicated within a group and shown as pending so admins can still see the intended team shape even before every applicant submits.

The shared `AdminApplicationRecord` type now includes `registrationDetailsJson` so the grouped review utility can stay type-safe. Unit coverage was added for exact-email grouping, mutual fuzzy-name grouping, one-sided fuzzy rejection, and pending-hint deduplication.

Validation: `bun test tests/unit/app/utils/admin-application-review.test.ts`, `bun run test:unit`, `bun run typecheck`.

Risks / follow-up: the inference remains intentionally conservative. If applicants provide very different name variants, initials, or nicknames without matching emails, the UI will leave those hints as pending instead of auto-grouping them. That is preferable to false positives in the current admin review flow.
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
