---
id: TASK-287
title: Rewrite root README for platform adopters
status: Done
assignee:
  - Codex
created_date: '2026-04-22 18:33'
updated_date: '2026-04-22 18:35'
labels:
  - documentation
dependencies: []
documentation:
  - docs/README.md
  - docs/domain-model.md
  - docs/tech-stack.md
  - docs/permissions-matrix.md
priority: medium
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Rewrite the root README so it addresses operators and organizations evaluating whether to run Codex Hackathons on their own infrastructure. The README should sell the platform's strengths, explain the operational fit, and point implementation/contributor workflow readers to DEVELOPMENT.md and canonical product docs instead of mixing contributor-facing content into the public project overview.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 The README opens with a clear adopter/operator-facing value proposition rather than contributor setup context.
- [x] #2 The README explains the platform strengths and supported hackathon workflows using current canonical product language from docs/.
- [x] #3 The README keeps development workflow, test-running instructions, and contributor-oriented detail out of the main narrative and links to DEVELOPMENT.md for that material.
- [x] #4 The README gives prospective operators a clear view of required external services and deployment/runtime responsibilities without drowning them in exhaustive environment-variable listings.
- [x] #5 The README links to the canonical docs for domain rules, lifecycle, permissions, schema, tech stack, and testing strategy.
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Rewrite only the root README and keep the new Backlog task record in scope.
2. Reframe the README around the adopter/operator persona: value proposition, what the platform handles, why it fits teams running serious hackathons, and what infrastructure responsibilities come with it.
3. Use docs/domain-model.md, docs/permissions-matrix.md, and docs/tech-stack.md as the source for product and stack claims.
4. Remove exhaustive development/setup/test detail from the main narrative and point contributor workflow readers to DEVELOPMENT.md.
5. Validate the documentation edit with the repository-required commands if practical, and record any limitations.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Rewrote only README.md. Canonical docs were reviewed and left unchanged because the task changed public/adopter positioning, not product rules or implementation behavior.

Validation: `bun run lint` passed with existing vue/no-v-html warnings in app/components/admin/AdminCompetitionPrizeRedemptionsPanel.vue; `bun run typecheck` passed; `bun run test:unit` passed with 83 files and 560 tests.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Rewrote the root README for prospective adopters and operators instead of contributors. The new structure leads with the platform value proposition, explains why the project is a fit for teams running serious hackathon programs, summarizes participant, organizer, competition, outcome, and operating workflows, and keeps runtime/service responsibilities at an evaluation-friendly level.

The README now points development workflow, validation commands, and detailed environment setup to DEVELOPMENT.md while linking canonical docs for domain rules, lifecycle, permissions, schema, API surface, tech stack, and testing strategy.

Validation passed: `bun run lint` (existing vue/no-v-html warnings only), `bun run typecheck`, and `bun run test:unit`. No code behavior changed, so no tests were added or updated.
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
