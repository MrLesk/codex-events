---
id: TASK-431
title: Switch MCP OAuth registration from DCR to CIMD
status: In Progress
assignee: []
created_date: '2026-08-18 21:19'
updated_date: '2026-08-18 21:19'
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
- [ ] #1 Auth0 authorization-server metadata advertises CIMD support and does not advertise a DCR registration endpoint.
- [ ] #2 Trusted Codex HTTPS Client ID Metadata Documents remain administrator-registered and idempotent, with exact redirect URI validation.
- [ ] #3 Test deployment applies the tenant change and a Codex-compatible authorization flow reaches token issuance without creating a new DCR client.
- [ ] #4 Canonical and operator/developer docs describe CIMD as the registration path and no longer instruct clients to use DCR.
- [ ] #5 Regression tests cover tenant settings, metadata, issuer/resource alignment, and the too_many_entities failure path.
<!-- AC:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 Canonical docs were updated or confirmed unchanged
- [ ] #2 Code behavior matches canonical docs
- [ ] #3 Relevant validation commands pass
- [ ] #4 Tests were added or updated when behavior changed
- [ ] #5 Test gaps are documented when automation is not practical
- [ ] #6 Config and developer workflow docs were updated when setup changed
- [ ] #7 Auth and permissions changes follow the documented platform model
- [ ] #8 Risks and follow ups are recorded in the task summary
<!-- DOD:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Change Auth0 tenant bootstrap to enable CIMD and explicitly disable Dynamic Client Registration so authorization-server metadata has no registration_endpoint. 2. Preserve trusted administrator-managed CIMD imports and add tests for the disabled-DCR contract. 3. Replace DCR instructions in canonical/operator/developer/testing docs with CIMD-only guidance and correct issuer/resource discovery wording. 4. Run auth0 bootstrap/config tests and full validation, push main, deploy test only, and verify live authorization-server metadata.
<!-- SECTION:PLAN:END -->
