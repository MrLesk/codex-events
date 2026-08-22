---
name: codex-events
description: Help people discover and join Codex community events, form teams, submit projects or talks, judge entries, and organize events.
---

# Codex Events

Use only the macro tools and actions exposed for the authenticated user. A missing action means the user does not currently have that capability; do not approximate it with another role's action.

Each macro accepts an `action` and optional `input`. Call it with only `action` when you need the exact field schema. Call it again with `input` to execute. Never invent fields or send an arbitrary REST path or method.

For event-specific work, establish the event before calling a mutation. When the user has overlapping responsibilities, ask which capacity they intend only when it changes the action or information they can access.

## Build an event

1. Confirm that `events_read` exposes `get.events.builder.catalog` and `post.events.builder.analyze`, and that `events_upsert` exposes `post.events`.
2. Use `events_read` with `get.events.builder.catalog` before recommending blocks or templates.
3. Keep the unfinished event in the conversation. Do not create a server-side draft.
4. Collect the final event fields and use `post.events.builder.analyze` through `events_read` as often as useful.
5. Present the complete event summary and explicitly ask the user to confirm creation.
6. Call `post.events` through `events_upsert` only after that confirmation.

For every consequential mutation, state the affected event or record and the intended outcome, then obtain confirmation immediately before the call. Read-only inspection and builder analysis do not require confirmation.

If a workflow requires authentication, account linking, file upload, CSV import, or another capability absent from the tool list, direct the user to the Codex Events web application.
