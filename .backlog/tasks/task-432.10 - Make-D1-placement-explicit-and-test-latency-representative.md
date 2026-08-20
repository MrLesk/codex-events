---
id: TASK-432.10
title: Make D1 placement explicit and test latency representative
status: In Progress
assignee:
  - '@luna-infrastructure'
created_date: '2026-08-20 23:06'
updated_date: '2026-08-20 23:33'
labels: []
dependencies: []
parent_task_id: TASK-432
priority: high
type: enhancement
ordinal: 145000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
The test D1 database was auto-created in ENAM while the test users and Worker execute in Vienna; production is correctly placed in EEUR with EU jurisdiction. Strict first-primary requests in test therefore pay transatlantic latency and produce misleading page-level results. Deployment architecture must require intentional D1 placement, detect mismatches, and support a recoverable test migration without silently deleting databases.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 D1 provisioning accepts and documents an explicit operator-owned jurisdiction or location and does not rely on Cloudflare's implicit placement default
- [x] #2 Provisioning reports the actual existing database placement and fails with actionable guidance when it conflicts with the configured deployment placement
- [x] #3 A checked-in recoverable procedure migrates test data to a correctly placed replacement database without deleting the source before verification
- [ ] #4 Test latency gates record Worker colo, D1 region, read-replication mode, and consistency mode so comparisons are representative
- [ ] #5 Self-hosted operators can choose placement without Codex-specific hardcoding, while this repository's test and production environments use equivalent EU placement
<!-- AC:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [x] #1 Canonical docs were updated or confirmed unchanged
- [x] #2 Code behavior matches canonical docs
- [x] #3 Relevant validation commands pass
- [x] #4 Tests were added or updated when behavior changed
- [x] #5 Test gaps are documented when automation is not practical
- [x] #6 Config and developer workflow docs were updated when setup changed
- [ ] #7 Auth and permissions changes follow the documented platform model
- [x] #8 Risks and follow ups are recorded in the task summary
<!-- DOD:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Extend deployment configuration with an explicit D1 placement contract. 2. Make ensure-d1 validate existing placement without destructive repair. 3. Add unit tests and operator migration guidance. 4. Prepare a non-destructive EU replacement for test and switch the test binding only after export/import verification. 5. Re-run deployed latency evidence with matching placement.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Observed 2026-08-20: codex-events-test is ENAM, 811 kB, read replication disabled; browser and Worker traffic are VIE. Production codex-hackathons is EEUR, EU jurisdiction, 5.71 MB, read replication disabled. No production mutation is authorized or required.

Local code/docs/test slice completed. Deployment configuration now requires exactly one operator-owned CF_D1_JURISDICTION or CF_D1_PRIMARY_LOCATION_HINT value; existing D1 databases are inspected with wrangler d1 info --json and placement conflicts fail closed without delete/update; a recoverable source-retention replacement procedure is checked in at docs/d1-placement-and-replacement.md. Validation passed: bun run lint, bun run typecheck, bun run test:unit (159 files, 1068 tests), bun run build:cloudflare, and git diff --check. Rollout-dependent work remains open by design: test currently has no CF_D1_* placement variable and codex-events-test remains ENAM; production currently has no CF_D1_* placement variable and its existing database remains EU/EEUR. No remote D1 resource, variable, deployment, migration, or production state was changed.
<!-- SECTION:NOTES:END -->
