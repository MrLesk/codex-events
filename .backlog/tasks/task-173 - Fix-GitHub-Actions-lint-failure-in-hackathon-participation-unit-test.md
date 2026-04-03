---
id: TASK-173
title: Fix GitHub Actions lint failure in hackathon participation unit test
status: Done
assignee:
  - '@codex'
created_date: '2026-04-03 20:22'
updated_date: '2026-04-03 20:23'
labels:
  - ci
  - lint
  - tests
dependencies: []
references:
  - 'https://github.com/MrLesk/codex-hackathons/actions/runs/23960810878'
  - tests/unit/app/utils/hackathon-participation.test.ts
priority: high
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Fix the GitHub Actions `ci` workflow failure on main caused by a lint error in `tests/unit/app/utils/hackathon-participation.test.ts` without pulling unrelated local edits into the commit.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 The latest `ci` workflow failure on `main` is reproduced to a concrete lint error.
- [x] #2 The committed fix removes the lint failure without including unrelated local changes from the same file.
- [x] #3 Required local validation commands pass before handoff and commit.
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Inspected the latest failing `ci` workflow run on `main` and confirmed the failure came from `eslint` reporting `@stylistic/no-multiple-empty-lines` in `tests/unit/app/utils/hackathon-participation.test.ts` at the committed `HEAD` version of the file. The local working tree already had unrelated unstaged edits in that same file, so the fix was staged as an index-only patch that removes the extra blank line from the committed version without pulling the unrelated test additions into the commit.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Confirmed the latest `ci` failure on `main` was a lint error from an extra blank line in `tests/unit/app/utils/hackathon-participation.test.ts`. Staged and committed only the one-line lint fix plus the Backlog task file, leaving unrelated local edits in that file untouched. Validation passed with `bun run lint`, `bun run typecheck`, and `bun run test:unit`.
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
