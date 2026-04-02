---
id: TASK-158
title: Auto-select first hackathon terms version as current
status: Done
assignee:
  - codex
created_date: '2026-04-02 18:31'
updated_date: '2026-04-02 18:36'
labels:
  - bug
  - admin
  - hackathon-terms
dependencies: []
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
When a hackathon admin publishes the first terms version for a document type and the hackathon has no current reference for that type yet, the platform should automatically make that new version current. This should remove the empty-state friction in registration and prize-redemption setup without changing the explicit current-selection workflow for later versions.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Creating the first-ever `application_terms` version for a hackathon automatically sets it as the hackathon's current application terms.
- [x] #2 Creating the first-ever `winner_terms` version for a hackathon automatically sets it as the hackathon's current winner terms.
- [x] #3 Creating a later terms version does not replace an existing or missing current reference automatically.
- [x] #4 Automated coverage is updated for the affected admin API behavior.
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Keep explicit `set-current` as the canonical way to replace the current terms version.
2. Update the terms-version creation handler so it auto-selects the new document only when it is the first version ever created for that hackathon and document type.
3. Add integration coverage for first-version auto-current on application and winner terms, plus a guard that later versions do not replace the current reference.
4. Confirm canonical docs remain unchanged and run `bun run lint`, `bun run typecheck`, and `bun run test:unit`.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Discovery: `versions.post` currently inserts the new terms document and returns it, but never updates the hackathon's current terms reference. The existing `set-current` route already handles explicit current selection and should remain the path for replacing an existing current version.

User approved implementation and chose the stricter rule: auto-set current only when there were no prior versions for that document type, not merely when the current reference is null.

Validation: `bunx vitest run --config vitest.integration.config.ts tests/integration/server/api/hackathon-admin-routes.test.ts`, `bun run lint`, `bun run typecheck`, and `bun run test:unit` all passed locally.

Docs review: canonical docs remain unchanged. The domain and API docs already support separate version creation and current-reference behavior; this change only adds first-version auto-selection.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Updated the hackathon terms version-creation API so the first-ever version for a document type becomes current automatically. In `server/api/hackathons/[hackathonId]/terms/[documentType]/versions.post.ts`, the handler now sets the matching current terms reference only when the newly created document has `version === 1`, which matches the approved rule to auto-select only the very first version and leave all later versions on the explicit `Set current` path.

Extended `tests/integration/server/api/hackathon-admin-routes.test.ts` to cover three cases: later versions do not replace an existing current reference, the first application and winner terms versions auto-select as current, and a later version does not auto-select when older versions exist but no current reference is set.

Validation run locally:
- `bunx vitest run --config vitest.integration.config.ts tests/integration/server/api/hackathon-admin-routes.test.ts`
- `bun run lint`
- `bun run typecheck`
- `bun run test:unit`

Risk/follow-up note: this is intentionally API-driven behavior, so both the admin UI and any other caller that uses the same create-version route inherit the same first-version auto-current rule.
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
