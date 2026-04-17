---
id: TASK-235
title: Support markdown credit offer descriptions in the hackathon credits tab
status: Done
assignee: []
created_date: '2026-04-17 11:12'
updated_date: '2026-04-17 11:16'
labels: []
dependencies: []
documentation:
  - docs/domain-model.md
  - docs/api-surface.md
priority: medium
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Allow hackathon admins and platform admins to author credit offer descriptions with the same markdown editor pattern used for other rich-text hackathon fields, then render that markdown cleanly in the participant credits experience. Keep the existing credit-offer API contract and storage shape as a plain string field while treating the participant-facing description as markdown content.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Admins can author new and existing credit offer descriptions with the existing markdown editor field used elsewhere in the product.
- [x] #2 Participant-facing credit offer descriptions render markdown content, including links and basic formatting, using the platform's existing markdown presentation pattern.
- [x] #3 The underlying credit offer create and update contracts remain string-based and existing credit behavior continues to work.
- [x] #4 Canonical docs and relevant tests are updated to reflect markdown support for credit offer descriptions.
<!-- AC:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Updated the hackathon credits tab so credit offer descriptions are authored with `AdminMarkdownEditorField` in both the create-offer and edit-offer flows, while preserving the existing string-based create and update API contract. Participant-facing credit cards and admin offer previews now render those descriptions through the shared markdown renderer and `hackathon-markdown` presentation styles, so links and formatting display cleanly. Canonical docs were updated to describe credit descriptions as markdown content, and tests now cover markdown rendering plus markdown-shaped credit description payloads in the credit route integration suite.

Validation: ran targeted `vitest` for `tests/unit/app/utils/markdown.test.ts` and `tests/integration/server/api/hackathon-credit-routes.test.ts`, then ran `bun run lint`, `bun run typecheck`, and `bun run test:unit` successfully.

Risk / follow-up: I did not run an authenticated browser pass against the live credits tab in this turn.
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
