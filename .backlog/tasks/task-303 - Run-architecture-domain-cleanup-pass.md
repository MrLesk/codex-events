---
id: TASK-303
title: Run architecture/domain cleanup pass
status: In Progress
assignee:
  - Codex
created_date: '2026-04-29 17:31'
updated_date: '2026-04-29 17:31'
labels:
  - architecture
  - refactor
dependencies: []
documentation:
  - docs/README.md
  - docs/domain-model.md
priority: medium
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Continue behavior-preserving architectural cleanup after the server and client application domain extractions. The goal is to reduce generic utility/module dumping grounds, improve domain cohesion, and stop when remaining opportunities are speculative or diminishing returns rather than clearly useful refactors.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Concrete architecture cleanup opportunities are evaluated against the current product docs and local code boundaries.
- [ ] #2 Generic server or client utility surfaces are reduced where the refactor is behavior-preserving and reviewable.
- [ ] #3 Each implemented slice is tracked, validated, committed, and pushed separately or as a clearly coherent commit.
- [ ] #4 Remaining architectural opportunities are summarized when they become speculative or diminishing returns.
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Work in reviewable architecture slices under this parent task, starting with server hackathon domain extraction.
2. Keep each slice behavior-preserving: move cohesive code to domain/integration modules, update imports/tests, avoid compatibility shims.
3. Run required validation for each code slice before finalizing and committing.
4. Use a high-effort architecture review pass to identify the next concrete slice, and stop when remaining ideas are speculative or too low-value for this repo stage.
<!-- SECTION:PLAN:END -->

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
