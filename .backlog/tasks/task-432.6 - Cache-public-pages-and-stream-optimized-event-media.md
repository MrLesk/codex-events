---
id: TASK-432.6
title: Cache public pages and stream optimized event media
status: To Do
assignee:
  - '@luna-media'
created_date: '2026-08-19 06:22'
updated_date: '2026-08-19 06:22'
labels: []
dependencies:
  - TASK-432.1
references:
  - 'server/api/public/events/[slug]/images/background.get.ts'
  - 'server/api/public/events/[slug]/images/banner.get.ts'
  - server/domains/events/images.ts
parent_task_id: TASK-432
priority: high
type: enhancement
ordinal: 133000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Make public event delivery and event imagery use Cloudflare-native cache and transformation behavior instead of uncached Nuxt rendering and buffered original images.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Published public event pages and public event JSON have explicit cache keys, freshness, and mutation-driven invalidation semantics
- [ ] #2 Versioned public event image responses are cacheable and streamed without full arrayBuffer buffering
- [ ] #3 Page backgrounds request bounded responsive Cloudflare Images variants with modern negotiated formats
- [ ] #4 Private and mutable media keep appropriate authorization and cache isolation
- [ ] #5 Tests cover headers, streaming behavior, invalidation hooks, hidden-event behavior, and local fallback behavior
<!-- AC:END -->

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
