---
id: TASK-303
title: Run architecture/domain cleanup pass
status: Done
assignee:
  - Codex
created_date: '2026-04-29 17:31'
updated_date: '2026-04-29 18:12'
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
- [x] #1 Concrete architecture cleanup opportunities are evaluated against the current product docs and local code boundaries.
- [x] #2 Generic server or client utility surfaces are reduced where the refactor is behavior-preserving and reviewable.
- [x] #3 Each implemented slice is tracked, validated, committed, and pushed separately or as a clearly coherent commit.
- [x] #4 Remaining architectural opportunities are summarized when they become speculative or diminishing returns.
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Work in reviewable architecture slices under this parent task, starting with server hackathon domain extraction.
2. Keep each slice behavior-preserving: move cohesive code to domain/integration modules, update imports/tests, avoid compatibility shims.
3. Run required validation for each code slice before finalizing and committing.
4. Use a high-effort architecture review pass to identify the next concrete slice, and stop when remaining ideas are speculative or too low-value for this repo stage.
<!-- SECTION:PLAN:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Completed the architecture/domain cleanup pass across 15 tracked slices. Server business modules now live under explicit server/domains paths, with server/utils reduced to cross-cutting infrastructure helpers only: Cloudflare queue routing, image signatures, outbound email, and rate limiting. Client bounded domain helpers now live under app/domains, with app/utils left for cross-cutting presentation/navigation/form/date helpers plus the still-large admin-workspace surface. The remaining large client admin-workspace/form-schema split is no longer a low-risk mechanical move because it mixes shared admin record types, form state construction, lifecycle policy, and component-facing presentation rules; splitting it safely should be a separate, intentional admin workspace redesign rather than another utility-folder relocation. Validation passed on every slice with bun run lint, bun run typecheck, and bun run test:unit, plus targeted tests and affected integration coverage where imports changed.
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
