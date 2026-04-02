---
id: TASK-157
title: Fix hackathon admin terms management 400 errors
status: Done
assignee:
  - codex
created_date: '2026-04-02 18:25'
updated_date: '2026-04-02 18:30'
labels:
  - bug
  - admin
  - hackathon-terms
dependencies: []
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Hackathon admins should be able to publish and select hackathon terms from the admin settings panel without hitting raw schema-validation 400 responses. Investigate the terms-management flow in the account hackathon admin UI, correct the request behavior, and preserve the existing terms versioning/current-reference model.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Publishing hackathon terms from the admin settings panel succeeds when required terms inputs are provided and does not surface the reported schema-validation 400 for the normal flow.
- [x] #2 The admin settings panel prevents or clearly handles invalid terms submissions before they reach the API so admins are not exposed to raw request-schema failures.
- [x] #3 Automated coverage is updated for the affected terms-management behavior.
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Keep the existing canonical terms-document model, including the required non-empty title field.
2. Add a small admin-workspace helper that validates terms draft title and content before publish.
3. Update the hackathon admin settings panel to use that helper, prevent invalid publish requests, and surface a clear local validation message.
4. Add unit tests for the validator and run lint, typecheck, and unit tests before handoff.

5. Clarify the admin terms-management copy so publishing a version does not imply it is already the current document used in registration or prize redemption.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Discovery: the terms-management panel posts to the correct API routes, and the set-current server handler already expects only hackathonTermsDocumentId. The reported 400 matches the create-terms-version schema when title is blank or whitespace. The panel currently has no local validation for the terms draft before posting.

User-confirmed failing payload contains non-empty content but an empty title string. The fix should preserve the required title contract and improve the admin UX before the request reaches the API.

Additional user feedback: publishing a terms version without setting it current leaves registration in the existing 'terms unavailable' state. The admin panel should make the publish-vs-current distinction more explicit.

Validation: `bunx vitest run tests/unit/app/utils/admin-workspace.test.ts`, `bun run lint`, `bun run typecheck`, and `bun run test:unit` all passed locally.

Docs review: canonical docs remain unchanged. The domain model and API docs already describe versioned hackathon terms documents plus a separate current-reference step.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Kept the existing hackathon terms-document contract intact and fixed the admin UX around publishing terms. The admin settings panel now validates terms title and content locally before posting a new version, trims both fields before sending the request, and shows a clear inline validation message instead of letting the API return a raw schema-validation 400 for an empty title.

To reduce the follow-on confusion reported from the registration page, the terms-management copy and publish success message now explicitly explain that publishing creates a version and that the admin must still click `Set current` to make application terms active in registration or winner terms active in prize redemption. Added unit coverage for the new publish validator in `tests/unit/app/utils/admin-workspace.test.ts`.

Validation run locally:
- `bunx vitest run tests/unit/app/utils/admin-workspace.test.ts`
- `bun run lint`
- `bun run typecheck`
- `bun run test:unit`

Risk/follow-up note: this change does not auto-select the first published terms version as current; it clarifies the existing required step in the admin UI instead.
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
