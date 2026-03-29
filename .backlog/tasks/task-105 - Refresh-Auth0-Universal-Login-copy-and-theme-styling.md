---
id: TASK-105
title: Refresh Auth0 Universal Login copy and theme styling
status: In Progress
assignee: []
created_date: '2026-03-29 20:01'
updated_date: '2026-03-29 20:07'
labels: []
dependencies: []
priority: high
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Update the hosted Auth0 Universal Login experience so it matches the Codex Hackathons brand more closely. The login page should use more meaningful subtitle copy, the visible wordmark should read as centered, and action links should use platform theme colors instead of the default blue. Keep the Auth0 tenant reproducible from the bootstrap automation rather than relying on manual dashboard-only edits.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 The hosted Auth0 login prompt shows updated subtitle copy that is more meaningful for Codex Hackathons users.
- [ ] #2 The visible Codex Hackathons wordmark on Universal Login is centered within the authentication card.
- [x] #3 The Reset password and Sign up links use the Codex Hackathons theme color instead of the default Auth0 blue.
- [x] #4 Auth0 bootstrap automation applies and verifies the canonical login copy and styling so the tenant remains reproducible.
- [x] #5 Unit coverage or equivalent validation covers the new bootstrap expectations and asset behavior.
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Implemented canonical Auth0 login subtitle copy, Universal Login template link styling, and centered wordmark SVG asset in code.

Applied Auth0 bootstrap successfully against the dev tenant; login prompt custom text and Universal Login template now match the new canonical state there.

Manual `bun run deploy:dev` is blocked from this shell because the available Cloudflare API token lacks Worker deploy permission for service `codex-hackathons-dev` (Cloudflare API authentication error 10000).
<!-- SECTION:NOTES:END -->

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
