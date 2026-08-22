---
id: TASK-436
title: Restore rich event copy and country selection in builder
status: Done
assignee:
  - '@codex'
created_date: '2026-08-22 11:06'
updated_date: '2026-08-22 11:21'
labels: []
dependencies: []
references:
  - app/components/admin/builder/organisms/AdminBuilderBasicsForm.vue
  - app/components/admin/builder/organisms/AdminBuilderSettingsBoard.vue
  - app/components/admin/EventConfigForm.vue
  - app/components/admin/EventConfigProgramIdentitySection.vue
modified_files:
  - app/components/admin/builder/organisms/AdminBuilderBasicsForm.vue
  - app/components/admin/builder/organisms/AdminBuilderSettingsBoard.vue
  - tests/unit/app/components/admin/event-builder-rich-copy-controls.test.ts
  - tests/unit/app/domains/events/builder.test.ts
  - tests/bdd/features/authenticated/event-builder.feature
  - tests/bdd/steps/event-builder.steps.ts
priority: high
type: enhancement
ordinal: 154000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Event admins using the new event builder need the same authoring quality as the classic editor for public event copy and venue country selection. The builder should support Markdown for the public event description and track short descriptions, and should offer a controlled country selector rather than unrestricted country text.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 The builder event description supports the established Markdown editing experience in both create and edit flows, and saved Markdown remains unchanged in the event configuration.
- [x] #2 Builder track short descriptions support the established Markdown editing experience alongside the existing participant-guidelines and staff-instructions editors.
- [x] #3 For onsite events, the builder country field provides the same country choices and existing-value handling as the classic event editor.
- [x] #4 Required-field feedback, keyboard use, responsive layout, and the builder's existing visual hierarchy remain clear after the richer controls are introduced.
- [x] #5 Focused tests cover the builder control wiring and preservation of Markdown and country values.
<!-- AC:END -->

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

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Update AdminBuilderBasicsForm to bind the established AdminMarkdownEditorField directly to EventFormState.description and replace the onsite country text input with AppSelect options from getCountryOptions(form.country), preserving builder validation messages and onsite-only reveal behavior.
2. Update AdminBuilderSettingsBoard to bind the established AdminMarkdownEditorField to each track.shortDescription alongside the existing participant-guidelines and staff-instructions editors, without changing track fields or payload mapping.
3. Add focused unit coverage for builder control wiring and create/edit payload round-tripping of Markdown descriptions and existing country values; adjust existing BDD selectors for the richer controls.
4. Run focused tests, visual/interactive create and edit checks at desktop and mobile widths when the local app is available, then run lint, typecheck, and the full unit suite. Inspect scope, record evidence, and finalize TASK-436 per the task-finalization guide.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Research: the classic editor uses AdminMarkdownEditorField for event and track Markdown and derives country choices with getCountryOptions(form.country) into AppSelect. The builder already owns the canonical EventFormState and reuses buildEventCreateBody/buildEventConfigurationPatch, so this change remains at the control layer plus focused parity tests. Component map: AdminBuilderBasicsForm remains the basics/location editor (form model in; chooseLocation/eventStartsAt events out); AdminBuilderSettingsBoard remains the advanced settings/track editor (form model in; existing resource/terms/image events out). No new component is needed.

Implementation complete: the builder now uses AdminMarkdownEditorField for the public description and track short descriptions, and the onsite country control uses AppSelect with getCountryOptions(form.country). The established EventFormState and create/edit mappers were not changed. Canonical docs already define track short descriptions as Markdown and event country as canonical configuration, so no docs update was required.

Verification: focused unit tests passed (37/37 across builder, control wiring, and country options); bun run lint passed; bun run typecheck passed; bun run test:unit passed (168 files, 1125 tests); bun run test:integration passed (44 files, 491 tests). Authenticated Playwright BDD passed for desktop create/save/edit round-trip and mobile 390x844 layout (2 scenarios), and for track short-description Markdown editing with the established toolbar (1 scenario). bddgen passed. The first targeted BDD attempt identified that md-editor-v3 exposes a role=textbox contenteditable rather than a textarea; the test selector was corrected and the final runs passed. No test gaps remain. Config, developer workflow, auth, permissions, schemas, and persistence contracts are unchanged. No unresolved product or implementation risk identified. Shared TASK-435 hunks in the event-builder BDD and builder unit files were preserved.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Restored the established Markdown editing experience for builder event descriptions and track short descriptions, and replaced onsite country free text with the established country selector including current-value support. Markdown and country values stay on the canonical EventFormState and round-trip unchanged through create and edit payloads. Focused unit, full unit, integration, and authenticated desktop/mobile BDD verification passed; lint and typecheck passed. Canonical docs and configuration remain current, and no follow-up risk is known.
<!-- SECTION:FINAL_SUMMARY:END -->
