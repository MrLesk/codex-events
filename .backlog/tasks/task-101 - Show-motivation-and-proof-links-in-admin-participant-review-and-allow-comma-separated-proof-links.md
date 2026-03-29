---
id: TASK-101
title: >-
  Show motivation and proof links in admin participant review and allow
  comma-separated proof links
status: Done
assignee: []
created_date: '2026-03-29 18:30'
updated_date: '2026-03-29 18:35'
labels:
  - ui
  - admin
  - hackathons
dependencies: []
documentation:
  - docs/domain-model.md
  - docs/api-surface.md
  - >-
    /Users/alex/projects/codex-hackathons/app/components/public/hackathons/HackathonRegistrationPanel.vue
  - >-
    /Users/alex/projects/codex-hackathons/app/components/admin/AdminApplicationsReviewPanel.vue
  - /Users/alex/projects/codex-hackathons/app/utils/form-schemas.ts
  - /Users/alex/projects/codex-hackathons/app/utils/participant-application.ts
priority: high
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Refine the participant application flow so hackathon admins can review the applicant motivation and proof links without leaving the Participants workspace, and let applicants submit multiple proof links in the existing proof-of-execution field by separating them with commas. Preserve the current single-string storage model, but update validation, registration copy, and admin presentation so long text and multiple links remain readable.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 The admin Participants review UI shows the applicant's why-this-hackathon response when present.
- [x] #2 The admin Participants review UI shows the applicant's proof-of-execution links when present and renders comma-separated links as separate clickable items.
- [x] #3 The participant registration form explicitly tells applicants they can enter more than one proof link by separating links with commas.
- [x] #4 Application submission accepts a comma-separated list of proof links and validates that every provided link uses http or https.
- [x] #5 Long why-this-hackathon responses and longer proof-link lists use a compact expandable presentation instead of forcing full-height cards by default.
- [x] #6 Canonical docs are updated where needed to reflect the comma-separated proof-link behavior, and required local validation passes.
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Canonical docs were updated because this changes the current registration contract from a single proof URL to one-or-more comma-separated proof links in the existing `proofOfExecutionUrl` field. The admin participant review UI reuses parsed `registrationDetailsJson` already present in the grouped review model, so no API shape change was required for the new motivation and proof-link panels.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Added admin-side visibility for applicant motivation and proof links in the Participants review surface by rendering compact inline detail panels from the existing parsed registration details, with Show more/Show less behavior for longer motivation text and longer proof-link lists. Updated the registration flow so the proof-of-execution field now accepts one or more comma-separated http/https links while preserving the current single-string storage shape; validation and normalization now run through a shared proof-link helper used by both the form schema and the server serializer. Updated product copy and canonical docs to describe proof links rather than a single proof URL, including the admin hackathon configuration label and the registration helper text. Risks/follow-up: `proofOfExecutionUrl` remains the persisted field name and stores a normalized comma-separated string, so any future analytics or richer per-link UI should parse that string rather than assuming a structured array value.

Validation passed with `bun run test:unit`, `bun run typecheck`, and `bunx vitest run --config vitest.integration.config.ts tests/integration/server/api/application-routes.test.ts`.
<!-- SECTION:FINAL_SUMMARY:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [x] #1 Canonical docs were updated or confirmed unchanged
- [x] #2 Code behavior matches canonical docs
- [x] #3 Relevant validation commands pass
- [x] #4 Tests were added or updated when behavior changed
- [x] #5 Test gaps are documented when automation is not practical
- [ ] #6 Config and developer workflow docs were updated when setup changed
- [x] #7 Auth and permissions changes follow the documented platform model
- [x] #8 Risks and follow ups are recorded in the task summary
<!-- DOD:END -->
