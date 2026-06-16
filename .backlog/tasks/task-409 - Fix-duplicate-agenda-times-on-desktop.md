---
id: TASK-409
title: Fix duplicate agenda times on desktop
status: Done
assignee:
  - '@codex'
created_date: '2026-06-16 20:14'
updated_date: '2026-06-16 20:18'
labels:
  - frontend
  - bug
dependencies: []
modified_files:
  - app/components/public/events/EventAgendaPanel.vue
priority: medium
ordinal: 88000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Desktop agenda rows show the same time range both in the left timeline and inside each agenda card on the public event detail page and the account event page. Keep the desktop timeline as the time display while preserving the existing mobile card time controls.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Desktop agenda rows show each item time once on the public event detail page
- [x] #2 Desktop agenda rows show each item time once on the account event page
- [x] #3 Mobile agenda cards keep the existing start and end time display
- [x] #4 Validation for the focused UI change passes
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Inspect the agenda panel and nearby public event presentation helpers.
2. Hide the in-card time badge at desktop widths while keeping mobile time controls visible.
3. Run focused validation plus required project checks.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Changed the shared public EventAgendaPanel responsive classes so the in-card range chip is hidden at lg and above, where the desktop timeline is visible. The public route and account route both use this component; account route rendering redirected to Auth0 in the local unauthenticated browser session.

Validation passed: bun run lint, bun run typecheck, bun run test:unit, git diff --check. Browser QA passed on http://127.0.0.1:3000/events/certificate-build-preview?tab=details at desktop and 390px mobile. No dedicated component test was added because existing unit coverage does not mount Vue components or assert responsive CSS visibility.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Fixed duplicate desktop agenda time display by hiding the shared agenda card time range at desktop timeline widths while preserving mobile and tablet card timing. Verified static checks, unit tests, and rendered public-page desktop/mobile behavior; account page uses the same shared component but local rendering redirected to Auth0 without an authenticated session.
<!-- SECTION:FINAL_SUMMARY:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [x] #1 Canonical docs were updated or confirmed unchanged
- [x] #2 Code behavior matches canonical docs
- [x] #3 Relevant validation commands pass
- [ ] #4 Tests were added or updated when behavior changed
- [x] #5 Test gaps are documented when automation is not practical
- [x] #6 Config and developer workflow docs were updated when setup changed
- [x] #7 Auth and permissions changes follow the documented platform model
- [x] #8 Risks and follow ups are recorded in the task summary
<!-- DOD:END -->
