---
id: TASK-312
title: Rename repository identity to Codex Events
status: Done
assignee: []
created_date: '2026-05-12 17:55'
updated_date: '2026-05-12 17:58'
labels:
  - open-source-readiness
  - repository
  - branding
dependencies: []
references:
  - package.json
  - bun.lock
  - README.md
  - DEVELOPMENT.md
  - AGENTS.md
modified_files:
  - package.json
  - bun.lock
  - AGENTS.md
  - DEVELOPMENT.md
priority: medium
ordinal: 15000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Align repository/package identity with the Codex Events product name while keeping live deployment domains on the currently owned codex-hackathons.com domain. This task is limited to repo/package/contributor-facing naming and the GitHub repository slug; it must not change deployment base domains, Cloudflare zones, Auth0 custom domains, CDN domains, or webhook domains.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 package.json and bun.lock use the package name codex-events.
- [x] #2 Contributor-facing repository references no longer describe the repo as codex-hackathons except where referring to the current live deployment domain or historical Backlog records.
- [x] #3 The GitHub repository is renamed from codex-hackathons to codex-events and the local origin remote points to the renamed repository.
- [x] #4 Live deployment domain references for codex-hackathons.com are preserved unless they are only describing the old repository/package name.
- [x] #5 Validation passes with lint, typecheck, unit tests, and git diff checks.
<!-- AC:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Renamed the repository/package identity to Codex Events while preserving live deployment domain references. Updated package.json, bun.lock, AGENTS.md, and the DEVELOPMENT.md Auth0 test connection example. Renamed the GitHub repository from MrLesk/codex-hackathons to MrLesk/codex-events and updated the local origin remote. Validation passed with bun run lint, bun run typecheck, bun run test:unit, git diff --check, and a focused rg check over package/contributor-facing docs. Event-specific legal text still contains historical Codex Hackathons product references and should be handled separately if legal copy should be reissued under Codex Events.
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
