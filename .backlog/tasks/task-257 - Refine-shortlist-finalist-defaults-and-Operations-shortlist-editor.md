---
id: TASK-257
title: Refine shortlist finalist defaults and Operations shortlist editor
status: Done
assignee:
  - '@codex'
created_date: '2026-04-17 18:41'
updated_date: '2026-04-17 19:41'
labels:
  - judging
  - admin
  - frontend
  - backend
  - ux
dependencies: []
documentation:
  - docs/domain-model.md
  - docs/api-surface.md
  - docs/schema-outline.md
  - app/components/admin/AdminCompetitionShortlistPanel.vue
  - app/components/admin/HackathonConfigForm.vue
  - app/components/account/hackathons/AccountHackathonAdminSettingsPanel.vue
  - server/utils/shortlist.ts
  - server/utils/hackathon-management.ts
priority: high
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Add a canonical hackathon-level finalist count setting for shortlist-driven pitch hackathons and update the Operations shortlist editor to use that default and present the shortlist boundary more clearly. The shortlist flow should seed finalists from the top blind-ranked submissions by default, while the Operations UI keeps shortlist management blind, uses project-facing submission details, and simplifies the current finalist/not-finalist controls and layout.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Hackathon configuration exposes a canonical finalist-count setting with default value 10 and persists it through create update serialize and schema validation paths.
- [x] #2 Entering shortlist clears any previously saved shortlist state. Until admins save the shortlist, Operations derives the default finalist boundary from the top ranked blind-review submissions up to the configured finalist count.
- [x] #3 The Operations shortlist header and section chrome are simplified so finalist and not-finalist counts render in section titles, shortlist actions sit inline with the finalists heading, the continue-to-pitch action stays disabled until a shortlist has been saved and is ready to advance, and obsolete shortlist chips are removed.
- [x] #4 Shortlist rows use project-facing submission details in blind-safe form by showing project name with score on the primary line and submission description on the secondary line only when description content exists.
- [x] #5 Boundary movement controls allow cross-section moves at the edges only when valid, including moving the last finalist down and the top not-finalist up, and the empty-finalists drop zone renders as a single dotted placeholder without nested card chrome.
- [x] #6 Relevant docs and automated coverage are updated and required validation passes.
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Add a canonical hackathon config field for shortlist finalist count with default 10 across Drizzle schema, migrations, create/update validation, serialization, form state, and the admin Settings tab.
2. Update shortlist lifecycle seeding so starting shortlist persists the top ranked blind submissions up to the configured finalist count into pitchFinalistSubmissionIdsJson, without changing later manual shortlist edits.
3. Extend shortlist serialization/types to include submission summary so the Operations shortlist rows can render project name with score on the first line and description only when summary content exists.
4. Simplify the shortlist editor UI in AdminCompetitionShortlistPanel.vue: render counts in section titles, move Save shortlist and Continue to pitch inline with the finalists heading, remove obsolete chips/card chrome, keep Continue to pitch visibly disabled when unavailable, collapse the empty-finalists state to a single dotted placeholder, and tighten row layout so the right-side action stays inside the card.
5. Adjust shortlist row movement logic so edge arrow buttons enable only when they can cross the finalist boundary: the first not-finalist can move up into finalists, the last finalist can move down into not finalists, and non-boundary cross-section moves stay disabled.
6. Update canonical docs and automated coverage for the new setting and shortlist behavior, then run bun run lint, bun run typecheck, and bun run test:unit before handoff.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
L2 context brief: closest analogs are the existing judging configuration fields in app/components/admin/HackathonConfigForm.vue plus canonical serialization/validation in server/utils/hackathon-management.ts, and the shortlist workflow in app/components/admin/AdminCompetitionShortlistPanel.vue backed by server/utils/shortlist.ts and start-shortlist/select-finalists routes. Main risk is splitting the default finalist boundary between UI-only state and persisted shortlist state; using the canonical hackathon config and seeding pitchFinalistSubmissionIdsJson when shortlist starts avoids drift and keeps later pitch/final-deliberation stages consistent. Silent conventions to preserve: shortlist stays blind with respect to team identity, hackathon config changes flow through schema -> serializer -> settings payload -> form state, and Operations already owns shortlist lifecycle actions from TASK-239.

User approved the implementation plan on 2026-04-17 and requested that shortlist rows hide the secondary line entirely when a submission has no summary/description.

Implemented the canonical `shortlistFinalistCount` hackathon setting with DB default `10`, surfaced it through create/update/serialize/form paths, and added a manual migration at `drizzle/0039_shortlist_finalist_count.sql`.

Starting shortlist now seeds `pitchFinalistSubmissionIdsJson` from the top ranked blind-review submissions up to the configured count, while keeping later manual shortlist edits authoritative.

Reworked the Operations shortlist editor to remove obsolete chips/card chrome, show counts in section titles, inline the shortlist actions with the finalists heading, hide empty descriptions, use project-facing row labels, keep `Continue to pitch` visually disabled, and allow boundary-crossing arrow moves only at valid edges.

Validation results: `bun run lint`, `bun run typecheck`, and `bun run test:unit` all passed locally after the final UI adjustment.

Reopened after follow-up clarification: while in `shortlist`, the top `shortlistFinalistCount` finalists should be derived for display only until admins press `Save shortlist`; `pitchFinalistSubmissionIdsJson` must remain unsaved until that action persists the shortlist.

Follow-up correction: shortlist no longer writes `pitchFinalistSubmissionIdsJson` when `shortlist` starts. The shortlist GET view now derives the default top-`shortlistFinalistCount` finalists only when no shortlist has been saved yet, keyed off `finalRankingSubmissionIdsJson` remaining empty.

Operations now reads `meta.hasSavedShortlistSelection` from `/shortlist`, enables `Save shortlist` even when only the derived default is shown, and re-enables `Continue to pitch` only after a shortlist has been explicitly saved and has at least one finalist.

Additional validation: `bun run test:integration` passed locally after the shortlist semantics fix.

Follow-up UI workflow change: `Save shortlist` is now idempotent in Operations, and `Continue to pitch` saves the current shortlist draft first when the draft differs from persisted shortlist state or when no shortlist has been saved yet.

2026-04-17: Follow-up UX tweak approved to improve Continue to pitch button contrast and require confirmation when advancing from an unsaved derived shortlist because the action will save and advance in one step.

2026-04-17: Completed the follow-up contrast/confirmation tweak and re-ran the required local validation commands.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Added a canonical hackathon-level shortlist finalist count and wired it through the full admin configuration stack. The new `shortlistFinalistCount` field defaults to `10` in the schema, is validated and serialized with the rest of hackathon config, is included in create/update payloads, and is exposed in the admin Settings form when pitch review is enabled. Canonical docs were updated to describe the new setting and the shortlist default-boundary rule.

Corrected the shortlist state model so entering `shortlist` no longer persists pitch finalists. `start-shortlist` now clears saved shortlist state, while the shortlist read path derives the default top-ranked finalist boundary in memory from `shortlistFinalistCount` only when no shortlist has been saved yet. Saving shortlist still persists both the finalist boundary and the full shortlist order, and starting pitch now requires that saved shortlist state rather than any derived default.

Refined the Operations shortlist editor to match the approved behavior. Finalists and not-finalists show counts in their section titles, shortlist actions sit inline with the finalists heading, the old chips and extra card chrome were removed, empty finalists render as a single dotted drop zone, and `Continue to pitch` now stays disabled until a shortlist has been explicitly saved and is ready to advance. Shortlist rows render `{project name} - {score}` on the primary line and show submission description only when summary content exists. Boundary controls allow the first not-finalist to move up into finalists and the last finalist to move down into not-finalists while keeping invalid cross-boundary arrow moves disabled.

Tests and validation: updated unit and integration coverage for the new config field, derived shortlist defaults, saved shortlist semantics, and start-pitch guards. `bun run lint`, `bun run typecheck`, `bun run test:unit`, and `bun run test:integration` all passed locally.

Operational note: apply the new migration `drizzle/0039_shortlist_finalist_count.sql` with the project’s normal database migration flow before relying on the new config field in shared environments.

Follow-up workflow adjustment: the Operations shortlist panel now allows repeated saves, and `Continue to pitch` persists the current shortlist draft in the background before starting pitch when needed. This keeps the server-side guard that pitch requires a saved shortlist while removing the extra manual save step from the admin workflow.

Follow-up UX polish: `Continue to pitch` now uses a higher-contrast neutral solid button treatment in the shortlist header instead of the low-contrast secondary style.

Follow-up safeguard: when admins advance from a derived shortlist that has never been saved, Operations now asks for confirmation before it saves the shortlist in the background and opens the live pitch stage.

Validation: `bun run lint`, `bun run typecheck`, and `bun run test:unit` passed locally after this follow-up. No dedicated UI automation was added for the confirmation dialog because this area does not currently have component-level interaction coverage.
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
