---
id: TASK-390
title: Add component reuse instructions
status: Done
assignee:
  - Codex
created_date: '2026-06-13 14:57'
updated_date: '2026-06-13 14:58'
labels:
  - docs
  - frontend
dependencies: []
documentation:
  - AGENTS.md
  - DEVELOPMENT.md
parent_task_id:
priority: medium
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Add repository instructions that require agents and contributors to search for,
reuse, and extend existing interface components before creating new components,
with clear ownership boundaries for generated shadcn-vue primitives, App
wrappers, shared domain components, and large page or panel components.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 `AGENTS.md` defines the component layers and requires agents to search for the closest existing analog before creating or copying interface components.
- [x] #2 `DEVELOPMENT.md` gives contributor-facing component reuse expectations for the Nuxt interface layer.
- [x] #3 New component creation requires documenting the closest existing analog and why extending it is not enough.
- [x] #4 The change stays instructions-only, with no audit scripts, CI checks, automation, nested `AGENTS.md`, or component-growth tooling.
- [x] #5 Docs-only validation with `git diff --check` passes.
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Review the existing interface-layer guidance and component directory layout.
2. Add root agent instructions for component ownership, reuse order, and new-component justification.
3. Expand contributor setup guidance with the same component reuse model.
4. Run docs-only validation and update this task with final notes.
<!-- SECTION:PLAN:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Root agent instructions now define interface component ownership and reuse
expectations for generated shadcn-vue primitives, App wrappers, domain/shared
components, and large page or panel components. Contributor setup now carries
the same reuse rule for interface work. New component creation requires the
closest existing analog and the reason extension is not sufficient to be
recorded in the task or implementation notes.

Validation: `git diff --check` passed. No lint, typecheck, or test commands
were run because this change is limited to Markdown instructions and Backlog
task text.

Residual risk: this is instructions-level guidance only, so enforcement depends
on future agent and review discipline rather than tooling.
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
