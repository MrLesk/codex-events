---
id: TASK-432.4
title: Add request-scoped D1 sessions and consistency bookmarks
status: To Do
assignee:
  - '@luna-d1'
created_date: '2026-08-19 06:22'
updated_date: '2026-08-19 06:22'
labels: []
dependencies:
  - TASK-432.1
references:
  - server/database/client.ts
  - wrangler.jsonc
  - tools/deploy/generate-wrangler-config.ts
parent_task_id: TASK-432
priority: high
type: enhancement
ordinal: 131000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Introduce a shared database access path that can use Cloudflare D1 Sessions API and read replicas while preserving local D1 tests and explicit read-after-write semantics.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Each HTTP request obtains one shared database client backed by one logical D1 session
- [ ] #2 Read-only requests default to low-latency replica-eligible consistency and mutations can continue from an incoming bookmark
- [ ] #3 Responses expose the next bookmark through one documented transport without leaking it into domain contracts
- [ ] #4 Local fake-D1 and integration support exercise the same application-facing database abstraction
- [ ] #5 Deployment guidance documents enabling read replication separately from checked-in binding configuration
- [ ] #6 Tests cover session reuse, bookmark propagation, read-only requests, and write-followed-by-read behavior
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
