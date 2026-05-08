---
id: TASK-307
title: Generalize hackathons into typed events
status: Done
assignee: []
created_date: '2026-05-08 06:59'
updated_date: '2026-05-08 15:02'
labels:
  - events
  - schema
  - authorization
dependencies: []
documentation:
  - docs/domain-model.md
  - docs/schema-outline.md
  - docs/permissions-matrix.md
  - docs/api-surface.md
priority: high
ordinal: 10000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Convert the platform from a hackathon-only domain model into a generic event platform with event types hackathon, meetup, and build. The runtime should support only the new event routes, schema names, scoped role name, and event terminology. Existing data is migrated in place to hackathon events; no backward-compatible hackathon routes, adapters, aliases, dual reads, or runtime fallbacks are added.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Primary storage is renamed from hackathons to events with event_type values hackathon, meetup, and build, and existing hackathon rows migrate to event_type = hackathon.
- [x] #2 Runtime routes move from /hackathons to /events and /api/hackathons to /api/events, with old hackathon routes removed.
- [x] #3 Scoped role hackathon_admin is replaced by event_admin in schema, authorization helpers, actor summaries, and migrated role assignment rows.
- [x] #4 Event organizers can create any event type, receive event_admin on created events, and only see events where they have event_admin unless also platform admin.
- [x] #5 Meetup and build events support registration/application review but do not expose or allow teams, submissions, judging, prizes, winners, credits, or competition lifecycle actions.
- [x] #6 Canonical docs and tests describe the current event model without legacy compatibility language.
- [x] #7 Validation passes with bun run lint, bun run typecheck, bun run test:unit, and bun run test:integration.
<!-- AC:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Implemented the event platform generalization across storage, API, authorization, UI, documentation, and tests. The primary runtime model now uses events with event_type values hackathon, meetup, and build; existing hackathon data is migrated in place to hackathon events; scoped hackathon_admin roles migrate to event_admin. Runtime routes and app navigation now use /events and /api/events with no hackathon compatibility routes. Event organizers can create all event types and receive event_admin on created events, while meetup/build events are constrained to registration/application workflows and protected from competition-only teams, submissions, judging, prizes, winners, credits, and lifecycle actions.

Validation passed locally before finalization: bun run lint, bun run typecheck, bun run test:unit, and bun run test:integration. Remaining risk is in the deployed/Auth0-backed BDD path, which is being checked separately after the commit is pushed and the shared dev workflow is available.

Follow-up after push CI: the shared dev deployment exposed that D1 migrations cannot rely on PRAGMA foreign_keys=OFF for parent table rebuilds with existing child rows. Migration 0050 now renames the events table in place, adds event_type with a CHECK constraint, and uses PRAGMA defer_foreign_keys for the remaining event-scoped table renames. Registration-only event creation stores DB-compatible hidden judging defaults while serializers continue to expose disabled competition settings for non-hackathon event records.

Follow-up deploy fix: the event runtime keeps the repository's provisioned Cloudflare/Auth0 hostnames and external resource names on codex-hackathons.com while using event terminology in bindings, code, and product behavior. This keeps shared dev and production deploys on existing zones and data resources instead of requiring an unprovisioned codex-events.com zone.
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
