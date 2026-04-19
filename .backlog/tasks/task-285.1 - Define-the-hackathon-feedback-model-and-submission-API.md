---
id: TASK-285.1
title: Define the hackathon feedback model and submission API
status: Done
assignee:
  - codex
created_date: '2026-04-19 20:02'
updated_date: '2026-04-19 20:25'
labels: []
dependencies: []
documentation:
  - docs/domain-model.md
  - docs/schema-outline.md
  - docs/api-surface.md
  - docs/permissions-matrix.md
  - docs/tech-stack.md
parent_task_id: TASK-285
priority: high
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Define and implement the canonical feedback persistence model, request validation, API contracts, and access rules for post-hackathon feedback. This subtask covers the hackathon-scoped feedback data shape, the anonymous public submission endpoint used by `/hackathons/:slug/feedback`, the completed-state availability guard, and Cloudflare-backed per-IP throttling for repeated submissions.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Canonical docs and schema/API definitions describe the hackathon feedback entity, rating topics, optional comment, completed-state availability, and anonymous submission rules.
- [x] #2 A public hackathon feedback submission endpoint accepts the canonical feedback payload for completed hackathons only and rejects invalid payloads or unavailable hackathons with consistent API errors.
- [x] #3 Anonymous feedback submissions are rate-limited with the existing Cloudflare-backed request-throttling pattern so repeated submissions from the same IP are blocked for the configured period.
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Extend canonical docs and schema outline with a hackathon feedback entity that stores one 1-5 rating for each agreed topic plus one optional comment, scoped to a hackathon.
2. Add the database schema, shared constants/types, and validation helpers needed to persist feedback records and summarize the canonical question set.
3. Implement the anonymous public submission route for completed hackathons, resolving the hackathon by slug and rejecting unavailable or invalid submissions with consistent API errors.
4. Reuse the existing Cloudflare rate-limit helper pattern to add a dedicated public feedback per-IP throttle.
5. Add integration and unit coverage for validation, completed-state gating, and rate limiting, then update task notes with any discovered follow-up risks.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Implemented the canonical hackathon feedback model, migration, public submission API, completed-state guard, and a dedicated Cloudflare-backed feedback rate limiter.

Validation passed with `bun run lint`, `bun run typecheck`, `bun run test:unit`, plus targeted integration coverage for public submission and internal results access.

No dedicated BDD coverage was added for this feature; public and internal UI flows currently rely on unit, integration, lint, and typecheck coverage.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Implemented the canonical hackathon feedback backend contract. Added shared feedback question definitions, the `hackathon_feedback` table and migration, the anonymous `POST /api/public/hackathons/:slug/feedback` route, completed-state gating, and a dedicated Cloudflare-backed per-IP rate limiter. Updated canonical docs for the feedback entity, schema, API surface, and permissions model. Added unit and integration coverage for payload validation, DB constraints and migrations, local binding wiring, successful anonymous submission, completed-state rejection, rate limiting, and internal results access. No dedicated BDD coverage was added; browser-level UI behavior is still covered indirectly through the backend tests plus lint and typecheck.
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
