---
id: TASK-302
title: Refresh platform logo and favicon branding
status: Done
assignee:
  - Codex
created_date: '2026-04-29 17:00'
updated_date: '2026-04-29 17:14'
labels:
  - branding
  - frontend
dependencies: []
documentation:
  - docs/README.md
  - docs/domain-model.md
modified_files:
  - README.md
  - DEVELOPMENT.md
  - app/components/shell/AppShellHeader.vue
  - public/platform-mark.png
  - public/Hackathon Platform Logo.png
  - public/favicon.ico
  - public/favicon-16x16.png
  - public/favicon-32x32.png
  - public/apple-touch-icon.png
  - public/android-chrome-192x192.png
  - public/android-chrome-512x512.png
  - public/auth0/codex-hackathons-wordmark.svg
  - public/site.webmanifest
  - tests/unit/tools/auth0/auth0-branding-assets.test.ts
priority: medium
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Replace the current logo and favicon treatment with a distinct Codex Hackathons brand mark that can use a blue/violet palette similar to the provided reference but must not copy the official Codex logo shape, cloud silhouette, terminal glyph, or confusingly similar trade dress. The change should update website-visible branding and deployed static branding assets without changing product behavior.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 A new distinct platform brand mark is generated and saved as project-owned static assets.
- [x] #2 The site header shows the new mark alongside the existing platform name without introducing layout overlap on narrow or desktop widths.
- [x] #3 Favicon, app icon, manifest, and Auth0 branding assets use the new platform branding consistently.
- [x] #4 The official Codex logo shape and terminal glyph are not copied into project assets.
- [x] #5 Required validation passes locally: bun run lint, bun run typecheck, and bun run test:unit.
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Generate one project-owned raster app icon with the image model using the attached official mark only as a color reference, explicitly avoiding the official cloud silhouette, terminal chevron/underscore glyph, or copied trade dress.
2. Move the selected generated asset into public/ as the source platform mark, then derive favicon and app-icon sizes from that source so all static icon files stay consistent.
3. Replace the Auth0 wordmark SVG with a simple platform wordmark that includes the new distinct mark and update the asset test to assert the new structure.
4. Add the new compact mark to the app shell header beside the existing platform name, keeping the current text hierarchy and responsive layout.
5. Run required validation: bun run lint, bun run typecheck, and bun run test:unit.

Follow-up before commit: update the README header image reference from the derived app icon to the canonical platform mark, then rerun required validation, stage only TASK-302 branding changes, commit with the required Backlog commit format, and push main to origin/main.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Generated the project mark with the built-in image generation tool using the official Codex logo only as a color/material reference. The resulting mark uses three separate blue/violet glass ribbon segments and a central node on a dark rounded tile, avoiding the official cloud/blob silhouette and terminal chevron/underscore glyph.

Saved the generated source as public/platform-mark.png and derived favicon/app icon files from it. Updated the shell header to display the mark beside the existing platform name with truncation to avoid narrow-width overlap. Replaced the Auth0 wordmark SVG with a left-aligned wordmark and a matching vector rendition of the distinct mark.

Validation passed locally: bun run lint, bun run typecheck, and bun run test:unit. Canonical product docs are unchanged because this is a branding asset/UI chrome change, not a product-rule change.

After the first validation pass, reduced public/platform-mark.png to 512px and updated the header image to use the smaller generated icon assets via srcset. Reran bun run lint, bun run typecheck, and bun run test:unit; all passed.

Started the local dev server, verified http://localhost:3000/ returned 200 with the new header image markup and that /android-chrome-192x192.png returned 200, then stopped the server. The dev server emitted an existing-looking Vue/@vueuse warning during SSR; no branding validation failure was observed.

Follow-up update: README now references the canonical platform mark instead of the derived 512px PWA icon, and DEVELOPMENT.md now describes the Auth0 branding asset as the wordmark where it is not constrained by Auth0 environment variable names. AUTH0_BRANDING_LOGO_URL remains unchanged because it is Auth0's configuration field.

Final pre-commit validation after README/DEVELOPMENT reference cleanup passed: bun run lint, bun run typecheck, and bun run test:unit.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Summary:
- Replaced the old favicon/app-icon treatment with a generated, project-owned blue/violet platform mark saved at public/platform-mark.png and derived all browser/PWA icon sizes from it.
- Added the new mark to the shell header beside the existing platform name, using smaller icon assets via srcset and responsive truncation to avoid overlap on narrow widths.
- Reworked the Auth0 wordmark SVG to use the new distinct mark treatment and updated the asset test accordingly.
- Updated README and development documentation references so public docs point at the canonical platform mark/wordmark naming.

Validation:
- bun run lint
- bun run typecheck
- bun run test:unit
- Local dev server check: / and /android-chrome-192x192.png returned 200; server stopped after verification.

Risk/follow-up:
- The mark is intentionally distinct from the provided official Codex logo, but legal trademark clearance still requires human review if this is used publicly as a production brand asset.
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
