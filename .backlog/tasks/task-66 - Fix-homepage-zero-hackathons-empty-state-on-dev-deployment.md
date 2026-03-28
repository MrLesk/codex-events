---
id: TASK-66
title: Fix homepage zero-hackathons empty state on dev deployment
status: Done
assignee:
  - '@codex'
created_date: '2026-03-28 22:59'
updated_date: '2026-03-28 23:01'
labels: []
dependencies: []
references:
  - app/pages/index.vue
  - README.md
  - DEVELOPMENT.md
documentation:
  - docs/README.md
  - docs/testing-strategy.md
priority: medium
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
The public homepage currently renders the temporary-unavailable fallback on the deployed dev site when the public hackathons API returns an empty list. Fix the landing page to use the correct SSR fetch path for internal API requests on Cloudflare and show an explicit zero-hackathons configured empty state instead of an error fallback.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 The public homepage does not render the temporary-unavailable fallback when /api/public/hackathons returns 200 with an empty list
- [x] #2 The homepage shows explicit zero-hackathons empty-state copy when there are no public hackathons configured
- [x] #3 Required validation and a live dev smoke check are recorded
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Root cause was not the empty-state copy itself. The homepage used server-side $fetch('/api/public/hackathons') inside useAsyncData, which resolved against http://localhost during Cloudflare SSR and forced the temporary-unavailable branch even when the live API returned 200 with an empty list.

Updated app/pages/index.vue to use Nuxt useFetch for the initial homepage and past-count requests, matching the rest of the repo's public page pattern so internal API calls resolve correctly during SSR on Cloudflare.

Adjusted the zero-results empty-state copy to explicitly say 0 hackathons are configured and suggest checking again later.

Live verification on https://dev.codex-hackathons.com now shows the rendered empty state instead of the warning fallback, and the SSR payload no longer contains localhost API URLs or 500 Server Error entries.

Validation: bun run test:unit passed, bun run build:cloudflare passed, bun run deploy:dev completed, live API returned 200 with an empty list, and the live homepage SSR HTML rendered the zero-hackathons branch.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Fixed the public homepage on the live dev deployment so an empty public hackathon list no longer renders as a temporary outage. The root page now uses useFetch for its initial internal API requests, which avoids the localhost SSR fetch failure on Cloudflare, and the live page now renders '0 hackathons configured' with the follow-up 'There are currently no public hackathons configured. Check again later.' No dedicated automated SSR regression test was added because the current local test harness does not exercise Nuxt page-level SSR payloads directly; the gap was covered with a live deployment smoke check after bun run test:unit and bun run build:cloudflare.
<!-- SECTION:FINAL_SUMMARY:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [x] #1 Canonical docs were updated or confirmed unchanged
- [x] #2 Code behavior matches canonical docs
- [x] #3 Relevant validation commands pass
- [ ] #4 Tests were added or updated when behavior changed
- [x] #5 Test gaps are documented when automation is not practical
- [ ] #6 Config and developer workflow docs were updated when setup changed
- [x] #7 Auth and permissions changes follow the documented platform model
- [x] #8 Risks and follow ups are recorded in the task summary
<!-- DOD:END -->
