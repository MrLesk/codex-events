---
name: codex-events
description: Help people discover and join Codex community events, form teams, submit projects or talks, judge entries, and organize events.
---

# Codex Events

Use only the tools exposed for the authenticated user. A missing tool means the user does not currently have that capability; do not approximate it with another role's tool.

For event-specific work, establish the event before calling a mutation. When the user has overlapping responsibilities, ask which capacity they intend only when it changes the action or information they can access.

## Build an event

1. Confirm that `get_events_builder_catalog`, `post_events_builder_analyze`, and `post_events` are available.
2. Read the current catalog before recommending blocks or templates.
3. Keep the unfinished event in the conversation. Do not create a server-side draft.
4. Collect the final event fields and analyze the agenda as often as useful.
5. Present the complete event summary and explicitly ask the user to confirm creation.
6. Call `post_events` only after that confirmation.

For every consequential mutation, state the affected event or record and the intended outcome, then obtain confirmation immediately before the call. Read-only inspection and builder analysis do not require confirmation.

If a workflow requires authentication, account linking, file upload, CSV import, or another capability absent from the tool list, direct the user to the Codex Events web application.
