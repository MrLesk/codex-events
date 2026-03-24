---
id: TASK-8
title: Migrate UI stack from Nuxt UI to shadcn-vue in the Nuxt app
status: Done
assignee: []
created_date: '2026-03-24 18:32'
updated_date: '2026-03-24 18:44'
labels:
  - frontend
  - design-system
  - nuxt
dependencies: []
references:
  - /Users/alex/projects/codex-hackathons/nuxt.config.ts
  - /Users/alex/projects/codex-hackathons/app/assets/css/main.css
  - /Users/alex/projects/codex-hackathons/Figma-Design/src/styles/theme.css
  - 'https://www.shadcn-vue.com/docs/installation/nuxt'
priority: high
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Replace the current `@nuxt/ui` dependency and theme setup with a `shadcn-vue`-based stack while preserving the canonical app behavior and enabling reuse of the visual language established in `Figma-Design/`. The migration should keep the Nuxt application functional, remove direct Nuxt UI runtime dependence, and establish local UI primitives/components that can be styled to match the Figma reference more closely.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 The Nuxt app is configured according to the current shadcn-vue Nuxt installation requirements
- [x] #2 The app no longer depends on `@nuxt/ui` at runtime
- [x] #3 Existing app pages render using local UI primitives/components instead of Nuxt UI components
- [x] #4 The shared styling foundation is moved toward the Figma design token and Tailwind setup
- [x] #5 Typecheck passes or remaining blockers are documented explicitly
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Installed and configured `shadcn-nuxt`, `@nuxt/icon`, Tailwind Vite integration, and the `shadcn-vue` component registry for the Nuxt app.

Added generated shadcn-vue primitives under `app/components/ui/` and local `U*` compatibility components so existing pages continue to render without `@nuxt/ui`.

Reworked `app/assets/css/main.css` to provide a Tailwind v4 token layer aligned with the Figma dark visual language while preserving semantic utility names already used by the current templates.

Updated `docs/tech-stack.md` and `DEVELOPMENT.md` to reflect the new interface stack and generated component locations.

Validation completed with `bun run typecheck` and `bun run lint`. UI parity was not browser-verified in this turn, so remaining risk is visual mismatch rather than type/runtime integration.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Migrated the Nuxt app off `@nuxt/ui` and onto a `shadcn-vue` stack. The app now uses `shadcn-nuxt`, Tailwind Vite integration, generated shadcn primitives in `app/components/ui/`, and a local `U*` compatibility layer that preserves the existing page/component API while switching the runtime UI stack underneath. The shared CSS foundation was rewritten to use Tailwind v4 tokens and Figma-aligned dark styling semantics, canonical docs were updated to reflect the stack change, and both `bun run typecheck` and `bun run lint` pass.
<!-- SECTION:FINAL_SUMMARY:END -->

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
