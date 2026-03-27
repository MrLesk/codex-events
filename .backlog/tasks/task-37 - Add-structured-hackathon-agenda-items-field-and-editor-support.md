---
id: TASK-37
title: Add structured hackathon agenda items field and editor support
status: Done
assignee: []
created_date: '2026-03-27 17:15'
updated_date: '2026-03-27 17:28'
labels:
  - hackathon
  - api
  - schema
  - ui
dependencies: []
priority: high
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Introduce a structured agenda items model on Hackathon so agenda content is no longer embedded in description markdown. Wire through schema, API, create/edit forms, and public rendering.
<!-- SECTION:DESCRIPTION:END -->

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

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Added structured hackathon agenda support end-to-end using a first-class field model.

Changes delivered:
- Added `agenda_items_json` to the hackathons schema (`server/database/schema.ts`) with migration `drizzle/0011_hackathon_agenda_items.sql`.
- Added validated agenda item API contract (`agendaItems`) in hackathon create/update schemas with item-level guards (ISO timestamps, end>=start, unique IDs) in `server/utils/hackathon-management.ts`.
- Added parse/serialize helpers between storage JSON and API array shape, and exposed `agendaItems` from both admin and public serializers.
- Wired create/update endpoints to persist agenda items through `agenda_items_json`.
- Updated admin client model/types and form conversion helpers in `app/utils/admin-workspace.ts`.
- Added agenda editor controls to `app/components/admin/HackathonConfigForm.vue` and wired create/update submit payloads in admin pages.
- Added public agenda rendering section in `app/pages/hackathons/[slug]/index.vue` independent from description markdown.
- Updated canonical docs in `docs/domain-model.md`, `docs/schema-outline.md`, and `docs/api-surface.md`.
- Updated/extended relevant unit and integration tests for schema and hackathon route payloads.

Validation run:
- `bun run test:unit` ✅
- `bun run typecheck` ✅
- `bun run test:integration` ✅
- `bun run lint` ✅ (existing `vue/no-v-html` warning on public hackathon detail markdown render)

Risks / follow-ups:
- Agenda item details currently render as plain text (not markdown); this is intentional to keep schedule items structured and safe.
- Existing description markdown remains supported; agenda and description are now separate fields.
<!-- SECTION:FINAL_SUMMARY:END -->
