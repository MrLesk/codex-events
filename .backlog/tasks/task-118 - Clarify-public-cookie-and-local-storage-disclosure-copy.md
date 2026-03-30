---
id: TASK-118
title: Clarify public cookie and local storage disclosure copy
status: Done
assignee: []
created_date: '2026-03-30 16:44'
updated_date: '2026-03-30 16:44'
labels:
  - ui
  - legal-copy
dependencies: []
documentation:
  - shared/platform-legal.ts
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Align the public footer disclosure and privacy-policy text with the actual Austria-safe storage model used by the platform: strictly necessary cookies and local storage for authentication, security, and site preferences, with no tracking or advertising storage.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 The shared footer no longer says the site uses no cookies for tracking as the sole disclosure and instead reflects strictly necessary cookies and local storage
- [x] #2 The public privacy-policy cookies section matches the same storage model and mentions site preferences alongside auth and security
- [x] #3 Validation notes capture the changed-file checks and any existing repo-wide blockers
<!-- AC:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Clarified the public footer and privacy-policy storage disclosure so it reflects the actual Austria-safe model used by the site.

What changed:
- Updated `app/components/shell/AppShellFooter.vue` to say the site uses strictly necessary cookies and local storage for authentication, security, and site preferences.
- Updated `shared/platform-legal.ts` so the public privacy-policy cookies section matches that same storage model and explicitly mentions site preferences.
- Updated the public legal last-updated date to `30 March 2026`.

Validation:
- `bun x eslint app/components/shell/AppShellFooter.vue shared/platform-legal.ts`
- `bun run typecheck`
- `bun run test:unit`

Remaining limitation:
- `bun run lint` still fails in unrelated existing files outside this task (`server/middleware/local-d1-binding.ts`, `tests/support/backend/api-route.ts`, and `tests/unit/server/routes/auth/account-linking.test.ts`).
<!-- SECTION:FINAL_SUMMARY:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [x] #1 Canonical docs were updated or confirmed unchanged
- [x] #2 Code behavior matches canonical docs
- [ ] #3 Relevant validation commands pass
- [ ] #4 Tests were added or updated when behavior changed
- [x] #5 Test gaps are documented when automation is not practical
- [ ] #6 Config and developer workflow docs were updated when setup changed
- [ ] #7 Auth and permissions changes follow the documented platform model
- [x] #8 Risks and follow ups are recorded in the task summary
<!-- DOD:END -->
