---
id: TASK-205
title: >-
  Implement configurable blind and pitch judging across runtime, UI, and
  automated coverage
status: Done
assignee: []
created_date: '2026-04-12 22:07'
updated_date: '2026-04-13 10:18'
labels:
  - judging
  - implementation
dependencies:
  - TASK-204
references:
  - docs/domain-model.md
  - docs/lifecycle-and-state-machines.md
  - docs/permissions-matrix.md
  - docs/schema-outline.md
  - docs/api-surface.md
priority: high
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Bring the runtime into alignment with TASK-204 and the canonical docs by implementing per-hackathon judging configuration, stage-aware blind and pitch review behavior, manual finalist selection, final deliberation, and the required automated coverage across backend and frontend surfaces.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Hackathon configuration persists blind review count, optional pitch review, and blind/pitch score weights with canonical defaults and constraints.
- [x] #2 Runtime lifecycle, assignment behavior, scoring, and outcome calculations match the canonical blind_review, shortlist, pitch_review, and final_deliberation model.
- [x] #3 Admin and judge workspaces expose the correct behavior for blind-only, blind-plus-pitch, and pitch-only hackathons without leaking blind-stage identity.
- [x] #4 Automated validation and relevant tests cover the supported judging configurations and pass locally.
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Land schema and hackathon configuration API support for configurable judging.
2. Refactor judging lifecycle, assignment generation, scoring, and outcome backend.
3. Update admin workflow for shortlist, pitch review, and final deliberation.
4. Update judge workspace for blind and pitch assignment modes after TASK-201-compatible integration.
5. Refresh fixtures and automated coverage, then run full validation and finalize the parent task.
<!-- SECTION:PLAN:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Implemented the configurable judging model end to end. Hackathons now persist blind review count, optional pitch review, and weighted blind/pitch scoring defaults; runtime judging lifecycle, assignment fanout, scoring, shortlist finalist selection, pitch review, final deliberation, and winner announcement now match the canonical docs; and the admin and judge workspaces reflect the blind versus pitch split without leaking identity during blind review. Automated coverage was refreshed across unit, integration, and authenticated BDD layers so the supported judging configurations are exercised against the current runtime. Canonical docs from TASK-204 remained the source of truth and required no further edits during implementation. Final validation on the completed tree passed with `bun run lint`, `bun run typecheck`, `bun run test:unit`, `bun run test:integration`, and the full `bun run test:bdd` suite.
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
