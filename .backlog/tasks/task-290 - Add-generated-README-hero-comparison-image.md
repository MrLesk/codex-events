---
id: TASK-290
title: Add generated README hero comparison image
status: Done
assignee:
  - Codex
created_date: '2026-04-22 19:17'
updated_date: '2026-04-22 19:18'
labels:
  - documentation
dependencies: []
documentation:
  - README.md
  - docs/assets/readme/platform-overview.svg
priority: medium
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Add a generated bitmap hero image to the README so it can be compared directly against the existing SVG platform overview. Preserve the current SVG and place it above the generated image as requested. Keep the change scoped to README presentation assets and do not touch unrelated parallel work.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 The existing SVG platform overview remains in the README.
- [x] #2 A generated bitmap alternative is committed under docs/assets/readme/ and referenced by the README.
- [x] #3 The README places the SVG above the generated image so readers can compare them directly.
- [x] #4 The change does not alter product claims, runtime behavior, or unrelated files.
- [x] #5 The generated image is inspected for obvious text artifacts before being referenced.
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Use the built-in image generation tool to create a generated bitmap hero alternative.
2. Inspect generated candidates and select the one without obvious text artifacts.
3. Copy the selected generated image into docs/assets/readme/ without deleting the generated original.
4. Update README.md so the existing SVG remains first and the generated bitmap appears below it for direct comparison.
5. Run lightweight validation appropriate for README/assets plus the repository-required commands if practical.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Used the built-in image generation tool. First candidate had visible text artifacts and was rejected. Second candidate was inspected and selected because the requested labels were readable and no obvious typo artifacts were present.

Copied the selected generated image from /Users/alex/.codex/generated_images/019db674-e2c8-7cb0-80dd-43f66d5cf97b/ig_0f71282a87ee85a60169e91e1ec174819193ab2afc119f4053.png to docs/assets/readme/generated-platform-overview.png, leaving the original generated file in place.

Updated README.md so the existing SVG overview remains above the generated bitmap overview for direct comparison. Validation: `xmllint --noout` passed for the SVG assets; `bun run lint` passed with existing vue/no-v-html warnings; `bun run typecheck` passed; `bun run test:unit` passed with 83 files and 560 tests.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Added a generated bitmap README hero comparison image below the existing SVG overview. The existing SVG remains first in the README and the new generated PNG is referenced immediately below it as `docs/assets/readme/generated-platform-overview.png`, allowing direct visual comparison.

The selected image was produced with the built-in image generation tool and inspected before use. An earlier generated candidate was rejected for text artifacts; the committed candidate keeps the labels readable and avoids obvious misspellings.

Validation passed: `xmllint --noout` for SVG assets, `bun run lint` with existing vue/no-v-html warnings only, `bun run typecheck`, and `bun run test:unit`. No product claims or runtime behavior changed.
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
