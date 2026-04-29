---
id: TASK-303.12
title: Move server platform account utilities into domain modules
status: Done
assignee: []
created_date: '2026-04-29 18:01'
updated_date: '2026-04-29 18:04'
labels:
  - architecture
  - server
  - refactor
dependencies: []
documentation:
  - docs/README.md
  - docs/domain-model.md
modified_files:
  - docs/security-analysis.md
  - server/domains/accounts/index.ts
  - server/domains/accounts/linking.ts
  - server/domains/accounts/auth-identities.ts
  - server/domains/accounts/profile-icons.ts
  - server/domains/platform/admins.ts
  - server/domains/platform/documents.ts
  - server/api/account.delete.ts
  - server/api/account.patch.ts
  - server/api/account/profile-icon.delete.ts
  - server/api/account/profile-icon.get.ts
  - server/api/account/profile-icon.post.ts
  - server/api/account/registration.post.ts
  - 'server/api/platform-admins/[userId].put.ts'
  - server/api/platform-admins/candidates/index.get.ts
  - server/api/platform-admins/index.get.ts
  - server/api/platform-document-acceptances.post.ts
  - 'server/api/platform-documents/[documentType]/versions.get.ts'
  - server/api/platform-documents/current.get.ts
  - >-
    server/api/public/hackathons/[slug]/published-projects/[userId]/profile-icon.get.ts
  - 'server/api/public/hackathons/[slug]/winners/[userId]/profile-icon.get.ts'
  - server/auth/actor.ts
  - server/routes/auth/link/callback.ts
  - server/routes/auth/link/complete.ts
  - server/routes/auth/link/login.ts
  - server/types/h3.d.ts
  - tests/unit/server/domains/accounts/index.test.ts
  - tests/unit/server/domains/accounts/linking.test.ts
  - tests/unit/server/domains/accounts/profile-icons.test.ts
  - tests/unit/server/domains/platform/documents.test.ts
  - tests/unit/server/routes/auth/account-linking.test.ts
  - tools/platform-admin/bootstrap.ts
parent_task_id: TASK-303
priority: medium
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Move platform-account, auth-identity, profile-icon, platform-admin, and platform-document business helpers out of server/utils into explicit server domain modules. Keep server/utils focused on technical infrastructure and update route/test imports directly without compatibility re-exports.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Account management, account linking, Auth0 identity resolution, and profile icon helpers live under a server accounts domain path.
- [x] #2 Platform admin and platform document helpers live under a server platform domain path.
- [x] #3 Routes, auth modules, server types, and tests import moved helpers from the new domain paths directly.
- [x] #4 No compatibility re-exports remain in server/utils for moved modules.
- [x] #5 Required validation passes: bun run lint, bun run typecheck, and bun run test:unit.
<!-- AC:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Moved platform-account management, account linking, Auth0 identity resolution, and profile icon helpers from server/utils into server/domains/accounts. Moved platform-admin and platform-document helpers into server/domains/platform. Updated routes, auth actor resolution, H3 context types, the platform-admin bootstrap tool, unit tests, and technical security-analysis paths to import the new domain modules directly with no compatibility re-exports. Product docs are unchanged because the canonical domain model already defines these concepts. Validation passed: moved account/platform focused tests, platform-admin bootstrap test, bun run lint, bun run typecheck, and bun run test:unit.
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
