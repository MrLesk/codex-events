---
id: TASK-326
title: Render imprint legal settings during SSR
status: Done
assignee:
  - Codex
created_date: '2026-05-29 21:18'
updated_date: '2026-05-29 21:19'
labels: []
dependencies: []
modified_files:
  - app/pages/imprint.vue
priority: medium
ordinal: 29000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Make the public imprint page render deployment-owned legal settings as part of the server-rendered page. The initial page response should include the legal notice/contact availability state so hydration does not need an extra browser-side request for the legal notice or contact-form availability. The contact form must remain interactive after render and submit through the existing public contact endpoint only when the user sends a message.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 The `/imprint` page resolves current platform legal settings during SSR and renders the legal notice or unavailable state in the initial HTML/Nuxt payload.
- [x] #2 Hydration of `/imprint` does not issue an additional browser-side `GET /api/platform-legal-settings/current` just to load the legal notice or contact-form availability.
- [x] #3 The contact form continues to submit client-side messages through `POST /api/public/imprint-contact` after the page has rendered.
- [x] #4 Required validation passes locally: `bun run lint`, `bun run typecheck`, and `bun run test:unit`.
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Update `app/pages/imprint.vue` to resolve platform legal settings with an awaited `useApiResponse` call during page setup, using the existing `current-platform-legal-settings` key and current API endpoint.
2. Keep the existing computed `settings` shape for the template and leave the contact form submission path on `POST /api/public/imprint-contact` unchanged.
3. Verify with required local validation (`bun run lint`, `bun run typecheck`, `bun run test:unit`) and a browser/network check that `/imprint` hydration does not request `/api/platform-legal-settings/current`.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Created after implementation because the work began as a direct code change and the user paused before commit to require Backlog tracking. Canonical docs checked: `docs/domain-model.md` defines `PlatformLegalSettings` as the source for public imprint content and contact routing, with missing settings explicitly unavailable. Implementation follows that rule by server-rendering the configured or unavailable state instead of adding fallback behavior.

Manual SSR/hydration verification completed on `http://localhost:3000/imprint`: the rendered page showed the final legal-settings unavailable state immediately in the local fixture, `curl` output included `current-platform-legal-settings` in the Nuxt payload, and a Playwright request observer saw no browser-side requests to `/api/platform-legal-settings/current` during hydration. No separate SFC SSR unit harness exists in this repo, so this page-level hydration behavior is covered by manual browser verification plus required validation commands.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Changed the public imprint page so platform legal settings are awaited during page setup with the existing `current-platform-legal-settings` API data key. The server-rendered response now includes the legal notice/contact availability state in the Nuxt payload, so hydration does not issue a browser-side `GET /api/platform-legal-settings/current` to load the legal notice or contact form availability. The contact form submit path remains unchanged and still posts to `POST /api/public/imprint-contact` after client render.

Validation passed locally: `bun run typecheck`, `bun run lint`, and `bun run test:unit`. Manual browser verification on `http://localhost:3000/imprint` confirmed zero hydration-time browser requests to `/api/platform-legal-settings/current`; `curl` confirmed the SSR payload contains `current-platform-legal-settings`. No automated SFC SSR test was added because this repository does not currently have a Nuxt page SSR test harness; the gap is recorded in implementation notes.
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
