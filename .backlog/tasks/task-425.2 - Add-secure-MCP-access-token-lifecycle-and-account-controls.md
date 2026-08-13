---
id: TASK-425.2
title: Add secure MCP access-token lifecycle and account controls
status: Done
assignee:
  - '@codex-mcp'
created_date: '2026-08-13 20:09'
updated_date: '2026-08-13 21:26'
labels:
  - backend
  - frontend
  - security
  - mcp
dependencies:
  - TASK-425.1
modified_files:
  - server/domains/mcp/tokens.ts
  - app/domains/accounts/mcp-tokens.ts
  - app/components/account/AccountMcpTokensPanel.vue
  - tests/unit/app/domains/accounts/mcp-tokens.test.ts
  - tests/integration/server/api/mcp-token-routes.test.ts
parent_task_id: TASK-425
priority: high
type: task
ordinal: 115000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Implement the credentials that authenticate remote MCP clients. Tokens belong to platform users and are managed only through session-authenticated browser/API flows; token-management operations must never be exposed as MCP tools.

Create mcp_access_tokens with owner, user-chosen name, safe display prefix, cryptographic secret hash, fixed expiry, coalesced last-used time, revocation, and timestamps. Generate a high-entropy secret, reveal it once, never store or log plaintext, enforce five active tokens per user, and set expiry to exactly 30 days after creation with no renewal or permanent option.

Add paginated list, create, and revoke REST APIs and an account-settings panel using existing App components and Vue/Nuxt conventions. Account deletion must remove/revoke credentials.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 An additive D1 migration and Drizzle schema define mcp_access_tokens, owner relationships, indexes, timestamps, and constraints without plaintext secret storage.
- [x] #2 Token generation uses cryptographically secure randomness; storage uses a secure one-way hash; verification avoids secret leakage; the complete credential appears only in the create response.
- [x] #3 Active-token cap, exact 30-day expiry, immediate revocation, expired/revoked rejection, and coalesced last-used writes are enforced and unit tested.
- [x] #4 Session-authenticated paginated list, create, and revoke APIs use shared contracts, omit secret hashes, and apply existing API envelope/error conventions.
- [x] #5 Account settings provides a focused token panel for naming, creating, copying the one-time credential, viewing display prefix/expiry/last use, and confirming revocation; it reuses App components and keeps the route page as composition.
- [x] #6 Account deletion removes or revokes every credential belonging to the deleted user.
- [x] #7 Tests cover generation, hashing, expiry, active cap, revocation, list pagination, API authorization, account deletion, and UI create/copy/revoke behavior.
<!-- AC:END -->

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

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Add the D1 migration and Drizzle mcp_access_tokens model with owner/index constraints and account-deletion cleanup.
2. Implement secure generation, hash-only storage, exact fixed expiry, five-active-token enforcement, verification, revocation, pagination, and coalesced last-use domain functions.
3. Add session-authenticated list/create/revoke APIs using the established API envelope and validation conventions.
4. Compose account settings with AccountMcpTokensPanel: the route remains account orchestration, while the panel owns token list/create/one-time copy/revoke state; it reuses AppInput, AppButton, and AppAlert because AccountSettingsProfileForm is the closest settings-form analog and cannot express credential lifecycle behavior through its profile-specific contract.
5. Add focused domain, API, deletion, and Vue behavior tests, then run required validation and finalize the subtask.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
TASK-425.1 shared boundary and canonical work was started first. TASK-425.2 schema uses migration 0071 by agreement with the concurrent TASK-426 owner, which will use 0072. Actor: a signed-in platform user managing credentials for an MCP client. Goal: create a named short-lived token, copy it once, inspect use/expiry, and revoke it. User terms: access token, expires, last used, revoke. Internal hashes and protocol mechanics remain omitted from UI copy.

Status corrected: implementation is present but this subtask is not active until TASK-425.1 is genuinely finalized. The first catalog approach was rejected and removed because adapting route handlers would make MCP a generic REST passthrough rather than putting domain behavior in shared application operations.

Dependency TASK-425.1 is complete. Existing token implementation is now the active slice. Focused token API integration tests pass; remaining verification adds expiry/revocation/last-use/account-deletion assertions and account UI behavior coverage before finalization.

Verification: token primitive and account action unit tests passed (3 tests); token/account API integration including generation, hash-only persistence, exact expiry constant, five-active cap, pagination-safe output, revocation, expired rejection, last-use coalescing, authorization, and account-deletion cleanup passed (51 tests across focused route files). Full lint/typecheck/unit/integration gates also passed during the preceding shared-operation slice.

Cross-review reopened this task behind TASK-425.1. Findings: token creation counts active rows then inserts, so concurrent creates can exceed the five-active-token cap; the account panel loads only the first 20 historical rows, so later active tokens may be invisible and irrevocable through UI. Required follow-up is an atomic conditional insert with concurrent integration coverage plus pagination-aware UI/API consumption tests.

Activated after TASK-425.1 remediation finalized. Implementation fixes now present: a single conditional D1 INSERT atomically enforces the five-active-token cap under concurrent requests, and the account domain/UI follows API pagination until all historical rows are loaded so active credentials remain visible and revocable.

Remediation verification: concurrent six-request API creation produced exactly five successful tokens and one sanitized limit conflict, with five persisted rows. The single conditional INSERT makes count-and-create one serialized D1 statement. Account list consumption now requests pageSize 100 and follows meta.total until every page is loaded; a 101-row unit fixture proves an active token behind 100 revoked historical rows remains present. Focused unit tests passed (4); focused token/account integration passed (52), including deletion cleanup and authorization. Full lint, typecheck, and unit gates passed in the preceding finalized slice.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Implemented secure 30-day MCP credentials with hash-only persistence, immediate revocation, account-deletion cleanup, and an atomic five-active-token cap. The session-authenticated account APIs and token panel now consume all result pages, keeping every active credential visible and revocable even after extensive history. Concurrency, pagination, UI-domain actions, authorization, expiry, revocation, coalescing, and cleanup tests pass.
<!-- SECTION:FINAL_SUMMARY:END -->
