---
id: TASK-164
title: Add Luma event API id to hackathons and gate sync on it
status: Done
assignee: []
created_date: '2026-04-02 20:34'
updated_date: '2026-04-02 20:44'
labels: []
dependencies: []
references:
  - /Users/alex/projects/codex-hackathons/server/database/schema.ts
  - /Users/alex/projects/codex-hackathons/server/utils/applications.ts
  - /Users/alex/projects/codex-hackathons/server/utils/hackathon-management.ts
  - /Users/alex/projects/codex-hackathons/Figma-Design
  - /Users/alex/projects/codex-hackathons/app/components
  - /Users/alex/projects/codex-hackathons/tests
priority: high
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Add a dedicated `luma_event_api_id` field to hackathons, use it for Luma sync and backfill operations, and stop treating `luma_event_url` as the trigger for sync behavior.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Hackathons store a dedicated Luma event API id field
- [x] #2 Luma sync is enabled only when `requireLumaEmail` is true and `luma_event_api_id` is present
- [x] #3 Admin hackathon create and edit flows support the Luma event API id field
- [x] #4 Relevant unit and integration tests cover the new gating behavior
- [x] #5 bun run lint passes
- [x] #6 bun run typecheck passes
- [x] #7 bun run test:unit passes
<!-- AC:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Added a dedicated `luma_event_api_id` hackathon field across schema, create/update APIs, admin forms, and internal serialization. Split Luma email requirement from Luma sync enablement so participant profile requirements now follow `requireLumaEmail`, while async approval/rejection sync and legacy Luma backfill run only when a hackathon also has a configured `luma_event_api_id`. Removed event-page scraping from the Luma queue path and updated unit and integration coverage for the new gating and API-id-based flow.
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
