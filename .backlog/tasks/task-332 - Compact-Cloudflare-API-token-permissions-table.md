---
id: TASK-332
title: Compact Cloudflare API token permissions table
status: Done
assignee:
  - Codex
created_date: '2026-05-30 14:59'
updated_date: '2026-05-30 15:00'
labels:
  - docs
  - operator-setup
  - cloudflare
dependencies: []
modified_files:
  - OPERATOR.md
priority: medium
ordinal: 35000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Reduce repeated rows in the operator guide's Cloudflare API token permission table by listing read and edit access together for resources that require both.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Cloudflare API token permission rows combine read and edit access for the same resource.
- [x] #2 The table still clearly identifies account and zone scopes for each Cloudflare permission.
- [x] #3 Docs validation passes.
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Collapsed duplicated Cloudflare API token permission rows in OPERATOR.md by listing combined access values such as Read, Edit in a single row per resource. Updated the lead-in sentence to make clear both access levels are required when both are listed.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Summary:
- Compacted the Cloudflare API token permissions table to one row per scoped resource.
- Kept the note that both Read and Edit must be granted when both are listed.

Validation:
- git diff --check

Risks and follow-ups:
- Docs-only change.
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
