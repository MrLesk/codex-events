---
id: TASK-338
title: Move platform legal first-run setup into platform settings
status: Done
assignee:
  - Codex
created_date: '2026-05-30 21:31'
updated_date: '2026-05-30 23:43'
labels:
  - auth
  - documentation
  - operator-setup
dependencies: []
modified_files:
  - OPERATOR.md
  - app/domains/accounts/auth-navigation.ts
  - app/pages/account/register.vue
  - docs/api-surface.md
  - docs/domain-model.md
  - 'server/api/platform-documents/[documentType]/versions.post.ts'
  - server/api/platform-legal-settings/current.patch.ts
  - server/domains/accounts/index.ts
  - server/domains/platform/admins.ts
  - tests/integration/server/api/actor-platform-routes.test.ts
  - tests/unit/app/domains/accounts/auth-navigation.test.ts
  - tests/unit/app/domains/accounts/navigation-guards.test.ts
priority: medium
ordinal: 41000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Remove first-run operator instructions that seed platform legal settings and documents with SQL. The deployed platform should let the configured first platform admin create their platform account before legal documents exist, access the platform settings legal tab, and publish the initial imprint, Privacy Policy, and Platform Terms through the app UI.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 The configured first platform admin can create a platform account when no current platform Privacy Policy or Platform Terms exist.
- [x] #2 A platform admin without current platform-document acceptance can access the platform settings legal tab and the legal settings/document publish APIs needed to complete first-run legal setup.
- [x] #3 Regular platform users still require current platform-document acceptance for normal account and event workflows.
- [x] #4 OPERATOR.md instructs operators to add platform legal content through the platform settings page instead of Cloudflare D1 SQL.
- [x] #5 Canonical product/API docs describe the first-admin setup exception without weakening regular consent requirements.
- [x] #6 Relevant tests cover first-run account creation, platform settings access, legal/document API access, and regular consent guard behavior.
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Extend account registration so the configured first platform admin email can create an account without existing platform documents, while normal users still require current Privacy Policy and Platform Terms documents.
2. Allow platform admins without current platform-document acceptance to reach `/account/platform-settings?tab=legal` and call the platform legal settings/document publish APIs needed for first-run setup.
3. Update OPERATOR.md to make first admin creation precede legal-content setup and instruct legal setup through the platform settings legal tab, not D1 SQL.
4. Update docs/domain-model.md and docs/api-surface.md with the explicit first-run admin exception.
5. Add/adjust integration and navigation unit tests, then run targeted and project validation.
<!-- SECTION:PLAN:END -->

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

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
- Added the first-run setup path for the configured first platform admin when current platform documents do not exist and no active platform admin exists.
- Allowed unconsented platform admins to access only the platform settings legal tab and the legal settings/document publishing APIs needed for first-run setup.
- Kept normal account, event, and non-legal platform workflows behind current platform-document acceptance.
- Replaced operator SQL instructions with in-app legal setup through Platform settings.
- Validation passed: `bun run lint`, `bun run typecheck`, `bun run test:unit`, `bun run test:integration`, targeted navigation tests, and targeted actor API integration tests.
- `bun run test:bdd` still stops during fixture reset with the existing `judge_criterion_scores.score` CHECK constraint failure in `tests/bdd/support/platform-fixtures.ts`, before browser tests execute.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Implemented in-app first-run legal setup. The configured first platform admin can create the initial setup account before platform documents exist, then access the Platform settings legal tab to save legal settings and publish the initial Privacy Policy and Platform Terms. Normal users and normal account/event workflows still require current platform-document acceptance.

Updated OPERATOR.md to remove direct D1 SQL setup for platform legal content and documented the platform settings flow. Updated canonical domain/API docs to describe the first-admin exception and the continued consent requirement. Added unit and integration coverage for first-run registration, legal-tab access, legal/document publishing by an unconsented admin, and regular consent guard behavior.

Validation passed for lint, typecheck, unit, integration, targeted navigation tests, and targeted actor API integration tests. The BDD suite remains blocked before browser execution by the existing fixture score CHECK constraint failure in `tests/bdd/support/platform-fixtures.ts`.
<!-- SECTION:FINAL_SUMMARY:END -->
