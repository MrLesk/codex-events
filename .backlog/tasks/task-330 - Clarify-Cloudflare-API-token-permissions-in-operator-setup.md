---
id: TASK-330
title: Clarify Cloudflare API token permissions in operator setup
status: Done
assignee:
  - Codex
created_date: '2026-05-30 14:34'
updated_date: '2026-05-30 14:35'
labels:
  - docs
  - operator-setup
  - cloudflare
dependencies: []
modified_files:
  - OPERATOR.md
priority: medium
ordinal: 33000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Make the simple operator guide explicitly connect the Cloudflare API token creation step to the required token permissions so first-run operators know exactly what access the production deploy workflow needs.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 The Cloudflare API token creation step explicitly says to create a custom token with the listed permissions.
- [x] #2 The required Cloudflare token permissions remain visible in the simple operator guide.
- [x] #3 Docs validation passes.
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Updated OPERATOR.md so the Cloudflare resource setup step tells operators to create a custom API token with the listed permissions, and changed the permissions table intro to point back to that step. Preserved the existing uncommitted Email Sending/Routing wording change in the working tree without staging it.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Summary:
- Clarified the Cloudflare API token setup step in OPERATOR.md.
- Tied the permissions table directly to the API token from step 3.

Validation:
- git diff --check

Risks and follow-ups:
- Docs-only change. An unrelated pre-existing OPERATOR.md wording change remains unstaged in the working tree.
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
