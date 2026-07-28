---
id: TASK-421
title: Authenticate local development through Codex app-server
status: In Progress
assignee:
  - '@codex'
created_date: '2026-07-28 16:08'
updated_date: '2026-07-28 17:31'
labels: []
dependencies: []
priority: high
type: feature
ordinal: 108000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Contributors can run the platform locally without provisioning Auth0 by using the Codex app-server already installed on maintainer machines. The development-only path must establish a normal platform identity without changing production authentication.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Running `bun run dev` does not require Auth0 configuration when Codex app-server authentication is available
- [ ] #2 A maintainer can authenticate locally with their ChatGPT account and receive a normal Codex Events application session
- [ ] #3 Production deployments continue to use Auth0 with unchanged authentication behavior
- [ ] #4 The application does not persist or expose OpenAI-issued credentials
- [ ] #5 Missing Codex installation and failed or cancelled authentication produce clear local-development errors
- [ ] #6 Contributor documentation and automated tests cover the supported local authentication flow
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
1. Detect local development with incomplete Auth0 configuration and enable the Codex-only path.
2. Run Codex login from the existing sign-in route, read the ChatGPT email from app-server, and create a local Codex Events session.
3. Feed the local session through the existing authentication seam; clear only that session on sign-out.
4. Add focused tests and contributor documentation, then run the required validation.
<!-- SECTION:PLAN:END -->
