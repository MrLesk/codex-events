---
id: TASK-163
title: Resolve Luma event API ids from event pages instead of lookup-event
status: Done
assignee: []
created_date: '2026-04-02 20:24'
updated_date: '2026-04-02 20:27'
labels: []
dependencies: []
references:
  - >-
    /Users/alex/projects/codex-hackathons/server/utils/application-luma-sync-queue.ts
  - >-
    /Users/alex/projects/codex-hackathons/tests/unit/server/utils/application-luma-sync-queue.test.ts
  - >-
    /Users/alex/projects/codex-hackathons/tests/integration/server/api/admin-luma-backfill-routes.test.ts
priority: high
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Replace the broken `/v1/calendar/lookup-event` URL resolution path with event-page HTML parsing so Luma sync can derive the event api_id from the configured hackathon Luma event URL.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Luma sync resolves the event api_id from the configured Luma event page URL
- [x] #2 Tests no longer assume `/v1/calendar/lookup-event` is used for event URL resolution
- [x] #3 bun run lint passes
- [x] #4 bun run typecheck passes
- [x] #5 bun run test:unit passes
<!-- AC:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Confirmed directly with `NUXT_LUMA_API_KEY` that `/v1/calendar/lookup-event?platform=luma&url=...` returns HTTP 400 and expects `event_api_id`, while `GET /v1/event/get-guest` succeeds once given the real event id. Replaced event-id resolution with public event-page HTML parsing, using `__NEXT_DATA__` or the `luma://event/evt-...` meta fallback, and updated unit and integration tests to stop assuming the broken lookup-event endpoint.
<!-- SECTION:FINAL_SUMMARY:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [x] #1 Canonical docs were updated or confirmed unchanged
- [x] #2 Code behavior matches canonical docs
- [x] #3 Relevant validation commands pass
- [x] #4 Tests were added or updated when behavior changed
- [ ] #5 Test gaps are documented when automation is not practical
- [x] #6 Config and developer workflow docs were updated when setup changed
- [ ] #7 Auth and permissions changes follow the documented platform model
- [x] #8 Risks and follow ups are recorded in the task summary
<!-- DOD:END -->
