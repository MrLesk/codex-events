---
id: TASK-80
title: Add markdown editing for hackathon descriptions in admin settings
status: Done
assignee:
  - codex
created_date: '2026-03-29 15:48'
updated_date: '2026-03-29 15:54'
labels: []
dependencies: []
references:
  - app/components/admin/HackathonConfigForm.vue
  - app/components/account/hackathons/AccountHackathonAdminSettingsPanel.vue
  - app/components/public/hackathons/HackathonOverviewPanel.vue
documentation:
  - docs/README.md
  - docs/domain-model.md
  - docs/design-reference.md
  - docs/tech-stack.md
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Replace the plain description textarea in the hackathon admin settings flow with a full markdown authoring experience so hackathon admins can format the public overview content they publish without changing the underlying stored description field or API contract. The current edit surface is in the shared hackathon configuration form used from the admin settings panel, and the saved description is already rendered as markdown in participant-facing views.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Hackathon admins can edit the hackathon description from the admin settings surface using a markdown editor with formatting affordances instead of a plain multiline textarea.
- [x] #2 Existing hackathon descriptions load into the editor and saving keeps the persisted description in markdown form without changing the backend schema or request shape.
- [x] #3 Hackathon description rendering in existing read-only views continues to work with descriptions saved from the new editor.
- [x] #4 Automated coverage is updated for the changed behavior where appropriate, and `bun run test:unit` passes locally.
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Add a Vue-compatible markdown editor dependency that can work in the Nuxt client without changing the stored markdown format.
2. Introduce a reusable admin-facing markdown editor field for hackathon descriptions in the shared hackathon configuration form, replacing the current textarea while preserving the existing `form.description` binding and validation flow.
3. Keep the existing save path unchanged in the admin settings panel so the backend request body and schema continue to send `description` as markdown text.
4. Add targeted unit coverage for the new editor integration behavior where practical and verify the existing markdown render path still fits the saved content.
5. Run `bun run test:unit` and fix any regressions before handoff.

User approved implementation on 2026-03-29.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Replaced the shared hackathon description textarea with a reusable markdown editor field backed by `md-editor-v3` in the admin configuration form. The editor stays client-only, mirrors the app light/dark mode, and preserves the existing `form.description` markdown string so the PATCH payload and backend schema remain unchanged.

Configured the editor preview to match the app markdown renderer more closely by forcing `html: false`, `linkify: true`, and `breaks: true`, and disabled unsupported editor affordances such as mermaid and katex so admins do not author content that the public renderer cannot display.

Validation completed with `bun run typecheck` and `bun run test:unit`.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Added a full markdown authoring surface for hackathon descriptions in the admin settings flow using `md-editor-v3`. The shared hackathon configuration form now renders a reusable markdown editor field instead of a plain textarea, with a client-only fallback path for SSR, app-theme-aware light/dark styling, and editor markdown-it settings aligned with the existing public markdown renderer.

The saved description contract did not change: admin updates still write the same `description` markdown string through the existing configuration save path, and public/read-only rendering continues to use the existing markdown display pipeline. Unit coverage was extended to confirm markdown descriptions remain valid form input and are preserved when mapping hackathon records into editable form state.

Validation run:
- `bun run typecheck`
- `bun run test:unit`

Risk/follow-up:
- The editor dependency adds a larger client-side bundle for the admin description field than the previous textarea. No additional runtime configuration or documentation changes were required.
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
