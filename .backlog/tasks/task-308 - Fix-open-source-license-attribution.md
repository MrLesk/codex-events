---
id: TASK-308
title: Fix open-source license attribution
status: Done
assignee:
  - Codex
created_date: '2026-05-10 18:13'
updated_date: '2026-05-10 18:16'
labels:
  - open-source-readiness
  - p1
  - license
dependencies: []
references:
  - LICENSE
  - README.md
  - third-party-notices.md
  - public/third-party-notices.json
documentation:
  - README.md
  - DEVELOPMENT.md
modified_files:
  - LICENSE
  - .backlog/tasks/task-308 - Fix-open-source-license-attribution.md
priority: medium
ordinal: 11000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Open-source readiness P1. The checked-in MIT license still names the upstream Nuxt UI Templates copyright holder. Update project license attribution for this repository while preserving any required upstream attribution in the appropriate notice or documentation location. Keep the change tightly scoped to licensing/attribution files.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 The root LICENSE no longer incorrectly names Nuxt UI Templates as the sole project copyright holder.
- [x] #2 Any required upstream attribution for Nuxt UI Templates or other template-origin code is preserved in an appropriate notice/documentation location.
- [x] #3 The change is limited to licensing/attribution files unless repository evidence requires otherwise.
- [x] #4 Required local validation for the touched scope is run or the limitation is documented.
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Verify current repository evidence for Nuxt UI/Templates usage by checking LICENSE, package metadata, Nuxt configuration, README, generated notice files, and targeted searches for Nuxt UI/template-origin references.
2. Update only licensing/attribution files needed for open-source readiness: correct the root MIT LICENSE project copyright holder and preserve upstream Nuxt UI Templates attribution in the same licensing context if template-origin material remains.
3. Run validation appropriate for a license/docs-only change, preferring targeted text checks and documenting why full lint/typecheck/unit validation is not required for non-code text edits.
4. Update TASK-308 notes, acceptance criteria, Definition of Done, and final summary through Backlog MCP without touching TASK-309 or unrelated files.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Evidence reviewed before editing: LICENSE named Nuxt UI Templates as the sole copyright holder; package.json and nuxt.config.ts do not include @nuxt/ui; targeted search found a remaining template-origin component at app/components/TemplateMenu.vue and generated runtime dependency notices at public/third-party-notices.generated.json. Kept attribution in LICENSE because the generated notices asset is for installed runtime dependencies, not repository template-origin source material.

Updated only LICENSE. The root MIT copyright now names Codex Community, and a compact upstream template attribution preserves Nuxt UI Templates copyright for derived portions.

Validation run: git diff --check -- LICENSE; targeted rg checks across LICENSE, package.json, nuxt.config.ts, app/components/TemplateMenu.vue, and README.md. Full bun run lint/typecheck/test:unit was not run because this task changed only the plain-text LICENSE file and did not affect executable code, build configuration, generated notices, or product docs.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Summary:
- Corrected the root MIT LICENSE so Nuxt UI Templates is no longer listed as the sole project copyright holder.
- Preserved upstream Nuxt UI Templates attribution in LICENSE for remaining template-derived portions while keeping the change limited to licensing text.

Validation:
- Passed: git diff --check -- LICENSE.
- Passed: targeted rg checks confirmed the root copyright is now Codex Community and upstream Nuxt UI Templates attribution remains.
- Not run: bun run lint, bun run typecheck, and bun run test:unit because the only repository content change was the plain-text LICENSE file; no executable code, build configuration, generated notices, or product docs changed.

Risks/follow-ups:
- No follow-up required for TASK-308. If the leftover template menu source is removed later, the upstream attribution can be reviewed at that time.
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
