---
id: TASK-110
title: Trim redundant validation and build steps from production release workflow
status: Done
assignee:
  - codex
created_date: '2026-03-29 21:40'
updated_date: '2026-03-29 21:43'
labels:
  - ci
  - release
dependencies: []
priority: high
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
The production GitHub release workflow currently reruns validation that is already covered by `main` CI and performs an explicit Cloudflare build before a deploy step that rebuilds the Worker again. Update the release workflow so it stays aligned with the manual release process: the operator verifies `main` CI before publishing a release, and the release workflow focuses on production deployment plus release-version write-back without redundant test/build work.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 The production release workflow no longer runs integration tests during release execution.
- [x] #2 The production release workflow avoids the explicit pre-deploy Cloudflare build that was duplicated by the deploy step.
- [x] #3 The release workflow still derives the version from the GitHub release tag, applies production Auth0 and Cloudflare changes, and commits the matching `package.json` version back to `main`.
- [x] #4 Operator-facing documentation reflects the streamlined release expectation if the workflow contract changed.
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
Approved scope: make the production release workflow deploy-only. Remove lint, typecheck, unit-test, integration-test, and explicit pre-build steps from `.github/workflows/release-production.yml`. Keep dependency install, release-version derivation, package.json sync, Auth0 setup, Cloudflare migrations/deploy, and package.json write-back intact. Update operator docs only if they currently promise release-time validation.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Removed release-time lint, typecheck, unit-test, integration-test, and explicit `build:cloudflare` steps from `.github/workflows/release-production.yml`. The release job is now deploy-only and still performs dependency install, release-version derivation, Auth0 alignment, D1 migrations, Worker deploy, and package.json write-back.

Confirmed from release run `23718767540` that the previous workflow built twice: once in `Build Cloudflare bundle` and again inside `Deploy production Worker` via Wrangler's configured custom build.

Updated `DEVELOPMENT.md` to document the new operator contract: publish a GitHub Release only after the tagged `main` commit has already passed CI.

Validation passed: YAML parse for `.github/workflows/release-production.yml` and `bun run test:unit`.

README did not need changes because it already described the release workflow at the right level without promising release-time validation.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Simplified the production release workflow to match the manual release process. The release job now assumes the tagged `main` commit already passed CI, skips redundant validation and the duplicate pre-deploy build, and keeps only the deployment-specific steps plus package-version write-back.
<!-- SECTION:FINAL_SUMMARY:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [x] #1 Canonical docs were updated or confirmed unchanged
- [x] #2 Code behavior matches canonical docs
- [x] #3 Relevant validation commands pass
- [ ] #4 Tests were added or updated when behavior changed
- [x] #5 Test gaps are documented when automation is not practical
- [x] #6 Config and developer workflow docs were updated when setup changed
- [x] #7 Auth and permissions changes follow the documented platform model
- [x] #8 Risks and follow ups are recorded in the task summary
<!-- DOD:END -->
