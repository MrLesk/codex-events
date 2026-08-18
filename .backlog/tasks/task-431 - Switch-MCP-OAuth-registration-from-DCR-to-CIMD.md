---
id: TASK-431
title: Switch MCP OAuth registration from DCR to CIMD
status: In Progress
assignee: []
created_date: '2026-08-18 21:19'
updated_date: '2026-08-18 21:52'
labels:
  - mcp
  - auth0
  - oauth
dependencies: []
references:
  - 'https://modelcontextprotocol.io/specification/2025-11-25/basic/authorization'
  - >-
    https://auth0.com/docs/get-started/auth0-overview/create-applications/register-applications-with-cimd
  - 'https://auth0.com/docs/get-started/applications/dynamic-client-registration'
priority: high
type: bug
ordinal: 126000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Ensure Codex MCP clients use the MCP-standard Client ID Metadata Document path in the test and production configuration. Auth0 currently advertises both CIMD and Dynamic Client Registration; new Codex clients can fall back to /oidc/register, exhaust tenant application capacity, and receive too_many_entities. CIMD is the supported registration path for this server, while DCR must not be advertised as an available fallback. Keep trusted CIMD metadata registration idempotent and preserve exact issuer/resource discovery.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Auth0 authorization-server metadata advertises CIMD support; the legacy registration endpoint rejects registration requests with dynamic registration disabled.
- [x] #2 Trusted Codex HTTPS Client ID Metadata Documents are administrator-registered and idempotent, with exact redirect URI validation.
- [x] #3 A deployed Codex CIMD authorization request reaches the Auth0 login redirect without creating a new DCR client; full token issuance remains a user-login smoke test.
- [x] #4 Canonical and operator/developer docs describe CIMD as the registration path and no longer instruct clients to use DCR.
- [x] #5 Regression tests cover tenant settings, metadata, issuer/resource alignment, stale-capacity cleanup, and the too_many_entities failure path.
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
1. Configure Auth0 to advertise CIMD and disable dynamic registration at the endpoint; Auth0 may retain the legacy registration_endpoint in discovery.
2. Keep trusted administrator-managed CIMD imports idempotent and add the affected Codex metadata URL to production configuration.
3. Reclaim only stale client-created Codex DCR applications when the tenant application limit blocks the CIMD import; delete their grants before clients.
4. Keep canonical/operator/developer docs CIMD-only.
5. Validate test and production metadata, authorization redirect, disabled registration, tests, and deployment.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Test deployment 32187353885 succeeded after commit 468b0cdf. Live test Auth0 metadata advertises client_id_metadata_document_supported=true; Auth0 still exposes the legacy registration_endpoint in discovery, but POST /oidc/register returns 400 dynamic client registration is disabled. This is Auth0 discovery behavior; no client can be created. CIMD-only docs follow-up committed as f3831313. Production was not deployed.

Production release v1.20.3 deployed the CIMD-only tenant setting and Worker. Production initially had 11 clients: four administrator-managed CIMD clients, three stale client-created Codex DCR clients, and four first-party clients. Release v1.20.5 added narrow cleanup for only name=Codex, external_metadata_type=dcr, external_metadata_created_by=client, deleting their client grants before deletion; the Codex CIMD URL was then registered successfully. Production run 32189622341 succeeded. Live checks: CIMD discovery=true; protected resource issuer/resource align; valid POST /oidc/register returns 400 dynamic client registration is disabled; authorization request using https://chatgpt.com/oauth/codex/R2uDUJ5iFGml/client.json and its loopback callback returns 302 to Auth0 login. Full token issuance requires completing an interactive user login and was not automated.
<!-- SECTION:NOTES:END -->

## Comments

<!-- COMMENTS:BEGIN -->
created: 2026-08-18 21:31
---
Test-only deployment verified. The user-facing contract now describes administrator-approved CIMD as the only supported registration path.
---
<!-- COMMENTS:END -->
