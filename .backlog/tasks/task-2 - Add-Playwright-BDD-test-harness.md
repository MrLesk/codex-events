---
id: TASK-2
title: Add Playwright BDD test harness
status: Done
assignee:
  - codex
created_date: '2026-03-22 18:33'
updated_date: '2026-03-22 18:37'
labels:
  - testing
  - playwright
  - bdd
dependencies: []
references:
  - 'https://vitalets.github.io/playwright-bdd/#/'
  - docs/testing-strategy.md
  - docs/tech-stack.md
  - README.md
priority: medium
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Add a first-class Playwright end-to-end test harness using playwright-bdd for the Nuxt application. The repo currently has canonical testing docs that require Playwright-based E2E coverage, but no Playwright or BDD tooling is wired into the codebase yet. This task should introduce the project structure, scripts, and starter coverage needed to author Gherkin-based end-to-end scenarios in a way that matches the existing Bun + Nuxt setup.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 The project installs and configures Playwright and playwright-bdd so Gherkin scenarios can be generated and executed from the repository root.
- [x] #2 Repository scripts and config support the local E2E workflow, including BDD generation and Playwright test execution with sensible output paths ignored from version control.
- [x] #3 A starter BDD test structure exists in the repo with at least one runnable feature and matching step definitions aligned to the current application surface.
- [x] #4 Project documentation explains how to install browser dependencies, generate BDD tests, and run the new E2E workflow in this repository.
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Install Playwright and playwright-bdd dev dependencies in the root Bun project.
2. Add root scripts and Playwright configuration that generate tests from Gherkin features via defineBddConfig and run them from the repository root.
3. Add a starter tests/bdd structure with one public homepage smoke feature and matching step definitions that avoid dependency on Auth0 fixture setup.
4. Update repository documentation for browser installation, BDD generation, and end-to-end execution commands.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Discovery: repository currently has no Playwright, BDD, or test directories; canonical docs already require Playwright E2E coverage.

User approved the implementation plan on 2026-03-22.

Implemented root Playwright + playwright-bdd harness with Bun scripts, a generated output directory at .features-gen, and Playwright webServer startup against the local Nuxt app.

Added a starter public-homepage feature and step definitions so the initial BDD smoke test runs without requiring Auth0 fixture bootstrap.

Validation: bun run test:e2e:generate, bun run test:e2e:install, bun run lint, bun run typecheck, bun run test:e2e.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Added a first-class Playwright end-to-end harness on top of playwright-bdd for the root Bun + Nuxt project. The implementation adds @playwright/test and playwright-bdd, root scripts for browser install, BDD generation, and test execution, and a new playwright.config.ts that generates tests from tests/bdd/features into .features-gen and starts the local Nuxt dev server automatically for runs.

Added a starter BDD smoke test for the public homepage under tests/bdd so the repository now has a working feature file and step-definition example aligned to the current signed-out application surface. Updated README.md with the local E2E workflow and updated docs/testing-strategy.md to state that Playwright browser scenarios in this repository are authored as Gherkin features through playwright-bdd.

Validation run: bun run test:e2e:generate, bun run test:e2e:install, bun run lint, bun run typecheck, bun run test:e2e.
<!-- SECTION:FINAL_SUMMARY:END -->
