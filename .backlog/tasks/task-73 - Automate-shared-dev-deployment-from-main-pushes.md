---
id: TASK-73
title: Automate shared dev deployment from main pushes
status: Done
assignee:
  - '@codex'
created_date: '2026-03-29 13:39'
updated_date: '2026-03-29 13:40'
labels: []
dependencies: []
priority: high
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Extend the existing GitHub Actions workflow so the shared Cloudflare dev environment is migrated and deployed automatically after the fast CI gate passes on pushes to main. Keep the current manual deploy commands as the operational fallback path and document the GitHub secret requirements for the workflow.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 GitHub Actions deploys the shared Cloudflare dev environment automatically on pushes to main after the fast CI checks pass
- [x] #2 The deploy job applies remote D1 migrations for the dev environment before publishing the Worker
- [x] #3 Pull requests and non-main pushes do not publish the shared dev environment
- [x] #4 Repository docs describe the automated dev deploy path and the required GitHub Actions secrets
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Added a `deploy-dev` job to `.github/workflows/ci.yml` that runs only for `push` events on `refs/heads/main`, waits for `backend-checks`, cancels stale in-flight deploys through a dedicated concurrency group, installs Bun dependencies, applies the remote dev D1 migrations with `bun run db:migrate:dev`, and then publishes the shared Cloudflare Worker with `bun run deploy:dev`.

Updated `README.md` and `DEVELOPMENT.md` so the shared dev deployment flow now documents automatic GitHub Actions publishing on `main`, the required repository secrets (`CLOUDFLARE_ACCOUNT_ID`, `CLOUDFLARE_API_TOKEN`), and the existing local manual recovery path using `CLOUDFLARE_MGMT_TOKEN`.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Automated the shared Cloudflare dev deployment from `main` pushes.

What changed:
- Extended `.github/workflows/ci.yml` with a `deploy-dev` job that runs only on pushes to `main` after the fast CI gate passes.
- The deploy job applies `bun run db:migrate:dev` before `bun run deploy:dev` so the shared dev database and Worker stay aligned.
- Added deploy-job concurrency so stale in-flight deploys are canceled when a newer `main` push arrives.
- Updated `README.md` and `DEVELOPMENT.md` to describe the automated publish path, the required GitHub Actions secrets, and the manual recovery commands.

Validation:
- `bun run test:unit`
- `git diff --check -- .github/workflows/ci.yml README.md DEVELOPMENT.md '.backlog/tasks/task-73 - Automate-shared-dev-deployment-from-main-pushes.md'`

Risks and follow-ups:
- The workflow expects repository secrets `CLOUDFLARE_ACCOUNT_ID` and `CLOUDFLARE_API_TOKEN` to be configured before the first `main` push deploy can succeed.
- Manual recovery still uses the documented local Wrangler commands with `CLOUDFLARE_MGMT_TOKEN` if GitHub Actions is unavailable.
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
