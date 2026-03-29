---
id: TASK-76
title: Align Auth0 Universal Login branding with Codex Hackathons
status: In Progress
assignee:
  - '@codex'
created_date: '2026-03-29 14:29'
labels: []
dependencies: []
priority: high
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Extend the Auth0 bootstrap so the default Universal Login experience uses Codex Hackathons branding instead of generic Auth0 defaults. Keep the implementation on the supported branding and prompt surfaces rather than introducing a separate custom login page.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 The repository includes a hosted text-based Codex Hackathons wordmark asset suitable for Auth0 Universal Login branding
- [ ] #2 The Auth0 bootstrap can enforce the branded Auth0 application display name and the existing logo/color settings needed for Universal Login
- [ ] #3 Repository docs and env examples describe the branding-related Auth0 bootstrap inputs using the canonical Codex Hackathons defaults
- [ ] #4 Local validation passes and, when credentials are available, the bootstrap can be applied to the shared dev Auth0 tenant
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
