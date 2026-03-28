---
id: TASK-67
title: Seed Vienna hackathon data from local D1 into dev D1
status: Done
assignee:
  - '@codex'
created_date: '2026-03-28 23:01'
updated_date: '2026-03-28 23:06'
labels: []
dependencies: []
references:
  - wrangler.jsonc
  - drizzle
  - server/database/schema.ts
documentation:
  - docs/README.md
  - docs/domain-model.md
priority: high
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Copy the Vienna hackathon data slice from the local D1 database into the remote dev D1 database. Scope is limited to the Vienna event and the related records required for that event to function on the dev deployment.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 The Vienna hackathon and required related records exist in the remote dev D1 database
- [x] #2 Only the Vienna event slice is seeded; unrelated local hackathons are not copied
- [x] #3 The seed steps and verification are recorded
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Seeded the dev D1 database from the local Vienna hackathon slice only. Initial import failed because the SQL file used explicit BEGIN/COMMIT, which Wrangler remote D1 rejects, and because hackathons cannot be inserted with current terms pointers before the corresponding hackathon_terms_documents rows exist. Retried with a reordered Vienna-only SQL script: insert users, insert hackathon with NULL current terms, insert role assignments and terms docs, update current terms pointers, then insert prizes and user applications.

No repo code changed for this task. Verification was done against the remote dev D1 database and the live dev deployment rather than unit tests.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Seeded the remote dev D1 database with only the Vienna hackathon slice from the local D1 dataset. Verified the remote database now contains a single hackathon row for `hackathon_codex_vienna_2026_04_18` with matching dependent counts: 2 hackathon role assignments, 2 terms documents, 4 prizes, 2 user applications, 0 teams, 0 evaluation criteria, 0 judge assignments, and 0 prize eligibility snapshots. Confirmed the live dev API at `https://dev.codex-hackathons.com/api/public/hackathons` and the deployed homepage both serve the Vienna event.
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
