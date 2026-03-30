---
id: TASK-117
title: Restore local app database from remote dev D1
status: Done
assignee:
  - codex
created_date: '2026-03-30 16:22'
updated_date: '2026-03-30 16:28'
labels: []
dependencies: []
documentation:
  - DEVELOPMENT.md
  - docs/testing-strategy.md
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Replace the normal local app-development D1 database with a copy of the remote dev D1 database so local development regains the missing hackathon data. Scope is the full app-local database only; do not read from or modify production D1, and do not touch the dedicated local BDD D1 root.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 The normal local app-development D1 root is restored from the remote dev D1 database, with a reversible backup of the pre-restore local state captured first.
- [x] #2 The dedicated local BDD D1 root remains untouched by the restore flow.
- [x] #3 The restore procedure is verified locally enough to confirm the expected hackathon data is present after import.
- [x] #4 Validation notes record the exact commands used and any remaining manual verification gap.
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Back up the current normal local app D1 state at `.wrangler/state` to a timestamped path so the overwrite is reversible.
2. Export the full remote dev D1 database to a timestamped SQL dump using Wrangler.
3. Import that dump into the normal local app root only, without touching `.wrangler/state-bdd`.
4. Verify the restored local data is present and record the exact commands, outcomes, and any remaining manual gap.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Confirmed canonical docs unchanged because this task only restored local data and did not change product or workflow behavior.

Captured a reversible backup of the pre-restore local app D1 root at `.wrangler/state-backup-20260330-182436`.

Remote dev export/import flow required a staged restore because the raw D1 export order is not replay-safe against local invariants for hackathon current terms documents.

Verified `.wrangler/state-bdd` still does not exist after the restore, so the dedicated BDD local root remained untouched.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Restored the normal local app D1 root from remote dev D1 without touching production or the dedicated BDD local root.

Commands executed:
- `mv .wrangler/state .wrangler/state-backup-20260330-182436`
- `bun x wrangler d1 export dev-codex-hackathons --remote --env dev --config wrangler.jsonc --output .wrangler/dev-d1-export-20260330-182436.sql`
- `bun x wrangler d1 export dev-codex-hackathons --remote --env dev --config wrangler.jsonc --no-schema --output .wrangler/dev-d1-data-20260330-182436.sql`
- filtered out `d1_migrations` and `sqlite_sequence` rows to produce `.wrangler/dev-d1-data-importable-20260330-182436.sql`
- `bun x wrangler d1 migrations apply DB --local --persist-to .wrangler/state --config wrangler.jsonc`
- reordered the data import so hackathons were staged first, terms documents inserted next, and current terms pointers updated after the terms existed; imported via `bun x wrangler d1 execute codex-hackathons-local --local --config wrangler.jsonc --persist-to .wrangler/state --file .wrangler/dev-d1-data-reordered-no-temp-20260330-182436.sql`
- verified local counts and hackathon detail with `wrangler d1 execute` against local, and matched them against remote dev.

Verification:
- Local and remote dev both report: 1 hackathon, 3 users, 4 prizes, 4 hackathon terms documents, 2 hackathon role assignments, 2 user applications, 3 audit logs.
- Local and remote dev both report the same hackathon row: `hackathon_codex_vienna_2026_04_18`, `Codex Community Hackathon - Vienna`, `codex-vienna-2026-04-18`, `registration_open`, with current terms IDs `terms_app_codex_vienna_2026_04_18_v2` and `terms_win_codex_vienna_2026_04_18_v2`.

Limitations and follow-up:
- This was an operational restore only; no code or docs changed.
- The intermediate export and transformed SQL files under `.wrangler/` can be removed later if you do not want to keep them.
- The backup at `.wrangler/state-backup-20260330-182436` remains available for rollback if needed.
<!-- SECTION:FINAL_SUMMARY:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [x] #1 Canonical docs were updated or confirmed unchanged
- [x] #2 Code behavior matches canonical docs
- [x] #3 Relevant validation commands pass
- [ ] #4 Tests were added or updated when behavior changed
- [x] #5 Test gaps are documented when automation is not practical
- [ ] #6 Config and developer workflow docs were updated when setup changed
- [ ] #7 Auth and permissions changes follow the documented platform model
- [x] #8 Risks and follow ups are recorded in the task summary
<!-- DOD:END -->
