---
id: TASK-150
title: Publish third-party notices page and generator
status: Done
assignee:
  - codex
created_date: '2026-04-01 21:22'
updated_date: '2026-04-01 21:48'
labels:
  - legal
  - frontend
  - tooling
dependencies: []
documentation:
  - /Users/alex/projects/codex-hackathons/package.json
  - >-
    /Users/alex/projects/codex-hackathons/app/components/shell/AppShellFooter.vue
  - /Users/alex/projects/codex-hackathons/app/pages/imprint.vue
  - /Users/alex/projects/codex-hackathons/app/pages/privacy-policy.vue
  - /Users/alex/projects/codex-hackathons/app/pages/terms-and-conditions.vue
priority: medium
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Add a public legal-style page for third-party notices, link it from the existing footer legal links, and add a repository script that regenerates the notices artifact from installed package metadata so frontend-distributed dependencies such as Fuse.js can be disclosed consistently.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 A public third-party notices page is available through the existing legal/footer navigation pattern without adding a global footer banner or every-page disclosure.
- [x] #2 The notices content is generated from repository dependency metadata by a documented repository script rather than maintained fully by hand.
- [x] #3 The generated notices output includes installed package name, resolved version, declared license, and license text or an explicit linkable source for each disclosed dependency, including Fuse.js.
- [x] #4 The notices page renders the generated notices content in a readable legal-page format consistent with existing public legal pages.
- [x] #5 Relevant unit coverage or generator validation is added for the new notices generation behavior.
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Add a runtime-dependency notices generator under tools that reads the root package.json dependencies, resolves the installed runtime dependency tree from node_modules, extracts package metadata plus bundled license or notice files, and writes a generated shared notices module committed with the repo.
2. Add unit tests for dependency traversal, metadata normalization, and generated notices output using temporary fixture package trees.
3. Add a public /third-party-notices page that follows the existing legal-page layout and renders the generated notices data in a readable, collapsible format.
4. Add the third-party notices route to the existing legal/footer navigation and document the refresh command in DEVELOPMENT.md.
5. Run bun run notices:generate, bun run lint, bun run typecheck, and bun run test:unit before handoff.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Initial discovery complete. Existing public legal pages use standalone Nuxt routes and the shell footer links directly to them. The repo currently has no third-party notices page or automated dependency-notice generation workflow.

User confirmed the notices scope should cover the installed runtime dependency tree only, excluding devDependencies.

Implemented a runtime dependency notices generator that resolves installed packages from node_modules, captures license and notice files when bundled, and writes a generated shared notices module for the public route.

Added a public /third-party-notices page plus footer legal navigation entry. The page renders one collapsible section per package with repository, homepage, npm links, notice text, and license text when present.

Validation completed: bun run notices:generate, bun run lint, bun run typecheck, bun run test:unit.

Residual risk: the generated runtime notices dataset is large because the installed runtime tree currently resolves to 773 packages. If the route payload becomes a performance concern later, the same generator output should be moved behind a static JSON or dedicated download endpoint rather than being imported directly into the page module.

User requested a correction after review: remove the direct footer link, expose the notices page from one existing footer/legal page instead, and set the notices page robots policy to noindex, follow rather than leaving it indexable.

Adjusted the notices page after review: removed the direct footer link, added the notices entry point on the Imprint page instead, and set the notices route robots meta to noindex, follow.

Small follow-up adjustment requested: keep the notices link on the Imprint page but remove it from the top of the contact-form sidebar so the contact workflow stays primary.

Moved the Imprint-page notices card from the top of the sidebar to the bottom so the contact form remains the primary sidebar action in both the default and post-submit states.

User correctly rejected the prior placement because it still lived in the contact sidebar column. Adjusting the Imprint layout so the notices entry sits in the main content column instead of the form sidebar.

Final placement correction: the notices entry now lives in the main Imprint content column beneath the legal text, and the right sidebar is reserved for the contact workflow only.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Added a generated third-party notices workflow and a public legal page for runtime dependency disclosures. The new Bun generator under tools/licenses walks the installed runtime dependency tree starting from package.json dependencies, resolves transitive packages through node_modules, extracts declared license metadata plus bundled LICENSE or NOTICE files, and writes the committed shared notices artifact consumed by the app. Unit coverage was added for license normalization, URL normalization, dependency resolution, runtime-tree traversal, and generated module output.

Added a new public /third-party-notices page that follows the existing legal-page layout and exposes the generated notices as collapsible package entries with version, declared license, repository or homepage links, npm package link, notice text, and bundled license text where available. After review, the page was removed as a direct footer item and is now linked from the Imprint page instead. The notices route now uses a robots directive of noindex, follow so the compliance page is discoverable from legal navigation without being treated as a search landing page. The final Imprint placement keeps the notices entry in the main content column beneath the legal text and leaves the right sidebar dedicated to contact. The package script for regenerating notices and contributor documentation in DEVELOPMENT.md were also added.

Validation run locally: bun run notices:generate, bun run lint, bun run typecheck, bun run test:unit.

Follow-up risk to monitor: the runtime notices dataset is large because the current installed runtime tree contains 773 packages. If route payload size becomes a problem, the generated data should move behind a static JSON or download endpoint while keeping the same generation flow.
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
