---
id: TASK-6
title: Split GitHub Actions fast CI from on-demand Auth0-backed BDD runs
status: Done
assignee:
  - codex
created_date: '2026-03-24 16:24'
updated_date: '2026-03-24 16:27'
labels: []
dependencies: []
references:
  - /Users/alex/projects/codex-hackathons/.github/workflows/ci.yml
documentation:
  - /Users/alex/projects/codex-hackathons/docs/testing-strategy.md
  - /Users/alex/projects/codex-hackathons/DEVELOPMENT.md
priority: high
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Update the repository validation policy so push and pull request CI runs only the fast backend checks (`lint`, `typecheck`, `test:unit`, `test:integration`), while the Auth0-backed BDD suite moves to explicit on-demand execution and scheduled coverage. Keep the GitHub Actions workflow and contributor/canonical testing documentation aligned so the repository no longer claims that every CI run executes the full BDD release gate.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 GitHub Actions push and pull_request runs execute lint, typecheck, unit tests, and integration tests without running the Auth0-backed BDD suite automatically.
- [x] #2 The repository defines an explicit path to run the Auth0-backed BDD suite on demand, and a scheduled automated run remains available for periodic coverage.
- [x] #3 Canonical testing documentation and contributor workflow documentation describe the new fast CI gate and the separate BDD execution path consistently.
- [x] #4 The changed workflow and docs are validated locally with targeted checks or inspection sufficient to confirm the new trigger behavior and references are internally consistent.
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Update `.github/workflows/ci.yml` so `push` and `pull_request` run only the fast `backend-checks` job.
2. Add `workflow_dispatch` and `schedule` triggers and guard the Auth0-backed BDD job so it runs only for manual or scheduled invocations, while still depending on `backend-checks`.
3. Update `docs/testing-strategy.md` to distinguish the fast commit CI gate from the full Auth0-backed BDD gate and document when each runs.
4. Update `DEVELOPMENT.md` so contributor guidance stays aligned with the workflow and local `bun run test:bdd` instructions remain intact.
5. Validate the changed workflow/doc references with targeted inspection and relevant formatting or consistency checks.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Updated `.github/workflows/ci.yml` to add `workflow_dispatch` and nightly `schedule` triggers while restricting the Auth0-backed BDD job to manual or scheduled runs only.

Rewrote `docs/testing-strategy.md` to define separate fast CI and full Auth0-backed BDD validation surfaces.

Updated `DEVELOPMENT.md` so contributor guidance matches the new workflow policy and still documents local BDD execution.

Validated the workflow mechanically by parsing `.github/workflows/ci.yml` with Ruby YAML and running `git diff --check` on the changed files.

No application test files were changed because the work is limited to workflow policy and documentation; validation focused on trigger logic and documentation consistency.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Split the repository validation policy into a fast commit CI gate and a separate Auth0-backed BDD gate. `.github/workflows/ci.yml` now runs `backend-checks` on `push` and `pull_request`, and only runs the Auth0-backed BDD job for `workflow_dispatch` and a nightly `schedule` at 03:00 UTC. Updated `docs/testing-strategy.md` and `DEVELOPMENT.md` to document the two validation surfaces and keep local `bun run test:bdd` guidance intact.

Validation performed:
- Parsed `.github/workflows/ci.yml` successfully with Ruby YAML
- Ran `git diff --check -- .github/workflows/ci.yml docs/testing-strategy.md DEVELOPMENT.md`

Notes:
- No application test files were added or updated because the change is limited to CI workflow policy and documentation.
- The latest failing GitHub Actions run showed backend checks succeeding and the expensive failure occurring in the Auth0-backed BDD path, which is the policy split this task addresses.
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
