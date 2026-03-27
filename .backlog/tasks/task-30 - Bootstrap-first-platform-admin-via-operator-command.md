---
id: TASK-30
title: Bootstrap first platform admin via operator command
status: Done
assignee:
  - codex
created_date: '2026-03-26 21:45'
updated_date: '2026-03-26 21:50'
labels: []
dependencies: []
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Provide an operator-safe way to grant initial platform admin access in environments where no platform admin exists yet, using application database authorization state and auditability.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 An operator command can grant platform-admin access to an existing active user identified by email or Auth0 subject.
- [x] #2 Running the command updates the target user so platform-admin access is active and leaves the user unchanged on repeated runs.
- [x] #3 Running the command ensures required hackathon-admin inheritance records exist for existing hackathons.
- [x] #4 Running the command records an audit log entry for the bootstrap grant operation.
- [x] #5 The command is executed successfully for the requested local user and the result is verified.
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Add an operator CLI script at tools/platform-admin/bootstrap.ts following existing tool script conventions.
2. Implement target-user resolution for an active user by email or Auth0 subject and support explicit command modes (apply/check).
3. Implement idempotent admin bootstrap updates: ensure is_platform_admin is true, backfill missing hackathon_admin role assignments for all existing hackathons, and write an audit-log entry for bootstrap grant.
4. Execute the command locally for leskcorp@gmail.com and verify resulting authorization state from the local D1 database.
5. Run bun run test:unit and finalize task notes with outcomes and any residual risks.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Implemented operator CLI at tools/platform-admin/bootstrap.ts with apply/check modes and --email/--subject targeting.

The command uses local Wrangler D1 platform proxy, promotes users.is_platform_admin, backfills hackathon_admin role assignments across existing hackathons, and writes audit_logs action platform_admin.bootstrap_granted when changes are applied.

Executed apply for leskcorp@gmail.com. Result: user promoted to platform admin, 24 hackathon-admin assignments created, audit log count now 1 for the bootstrap action.

Re-ran check/apply to verify idempotency. Result: compliant true, no additional changes, audit log count remained 1.

Added unit tests for CLI argument parsing in tests/unit/tools/platform-admin-bootstrap.test.ts.

Validation: bun run test:unit passed (29 files, 115 tests).
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Added a production-style operator bootstrap command for first platform-admin initialization and verified it locally against leskcorp@gmail.com.

What changed:
- Added tools/platform-admin/bootstrap.ts.
- Command supports `apply` and `check` modes.
- Supports target lookup by `--email` or `--subject`.
- Uses local Wrangler platform proxy + D1 binding resolution.
- Enforces idempotent bootstrap behavior:
  - promotes the target active user to `is_platform_admin = true`
  - backfills missing `hackathon_admin` role assignments for all existing hackathons
  - upgrades non-admin per-hackathon assignments to `hackathon_admin` when needed
  - writes `audit_logs` record with action `platform_admin.bootstrap_granted` when changes are applied
- Added docs for operators/contributors in README.md and DEVELOPMENT.md.
- Added unit coverage for CLI argument parsing in tests/unit/tools/platform-admin-bootstrap.test.ts.

Local execution and verification:
- Ran: `bun tools/platform-admin/bootstrap.ts apply --email leskcorp@gmail.com`
  - promoted user id 162a04a6-2431-44d4-b488-ca6b88b47b77
  - created 24 hackathon-admin assignment rows
  - wrote one audit entry
- Ran check/apply again to validate idempotency:
  - compliant true
  - zero additional updates
  - audit entry count remained 1

Validation:
- `bun run test:unit` passed.

Risk/follow-up:
- Global `bun run lint` currently fails due pre-existing unrelated files in the working tree; new script and its tests pass targeted eslint checks.
- This command currently targets local Wrangler/D1 proxy execution. If needed, add a remote/prod execution mode with explicit operator guardrails in a follow-up task.
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
