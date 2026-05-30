---
id: TASK-331
title: Move Cloudflare token permissions into first-run operator step
status: Done
assignee:
  - Codex
created_date: '2026-05-30 14:51'
updated_date: '2026-05-30 14:52'
labels:
  - docs
  - operator-setup
  - cloudflare
dependencies: []
modified_files:
  - OPERATOR.md
priority: medium
ordinal: 34000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Clarify the Cloudflare setup section by placing the API token permission table directly under the token creation step and explaining why the Cloudflare values are collected for later GitHub environment setup.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Cloudflare API token permissions appear immediately after the token creation instruction.
- [x] #2 The Cloudflare values table explains which GitHub environment variable or secret each saved value becomes.
- [x] #3 The Cloudflare resource defaults remain visible after the setup instructions.
- [x] #4 Docs validation passes.
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Reordered the Cloudflare setup section in OPERATOR.md so the API token permission table immediately follows the token creation step. Replaced the vague "Save these values" table with a GitHub production environment mapping that names the exact variable or secret each Cloudflare value becomes. Kept the default resource-name table below the setup inputs.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Summary:
- Moved Cloudflare API token permissions directly below the token creation instruction.
- Replaced "Save these values" with a table mapping each Cloudflare value to its GitHub variable or secret.
- Kept the default Cloudflare resource-name table visible after the setup inputs.

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
