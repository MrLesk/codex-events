---
id: TASK-395
title: Show prize reward values on public certificates
status: Done
assignee:
  - Codex
created_date: '2026-06-13 20:56'
updated_date: '2026-06-13 21:04'
labels: []
dependencies: []
references:
  - >-
    https://codex-events.com/events/codex-vienna-2026-04-18/6b72ee04-bb54-41da-9680-23b13c510f9d
documentation:
  - docs/lifecycle-and-state-machines.md
  - docs/schema-outline.md
modified_files:
  - shared/domains/events/certificates.ts
  - shared/domains/events/prizes.ts
  - server/domains/events/certificates.ts
  - app/domains/events/presentation.ts
  - 'app/pages/events/[slug]/[userId].vue'
  - tests/unit/shared/domains/events/certificates.test.ts
  - tests/unit/shared/domains/events/prizes.test.ts
  - tests/unit/app/domains/events/presentation.test.ts
  - tests/integration/server/api/public-certificate-routes.test.ts
priority: medium
ordinal: 74000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Public certificate pages should show the actual awarded prize values in the winner line instead of only prize definition names. For the Vienna winner example, first place should clearly show the $15,000 API credit award and the 1 year ChatGPT Pro member benefit. The certificate verification copy should also use concise public-facing language rather than a long URL-centered sentence.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Completed hackathon certificates display each awarded prize with its reward value when the prize has reward data, for example "1st Place API Credits ($15,000)" and "Top 5 Teams Member Benefit (1 year ChatGPT Pro)".
- [x] #2 Certificate summaries and exported certificate formats use the same prize display labels, so shared links and metadata do not lose the reward values.
- [x] #3 The public verification text below issued certificates is shortened while still communicating that the certificate is verifiable and showing the certificate ID.
- [x] #4 Preview certificates continue to work with their existing query parameters.
- [x] #5 Relevant tests cover the updated certificate prize labels and verification copy behavior.
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Populate completed hackathon certificate prize labels from awarded prize records as `name (formatted reward)`, using the same reward formatting behavior as prize and winner surfaces.
2. Keep preview certificate query behavior unchanged; previews continue to accept comma-separated free-form prize labels.
3. Use the updated prize labels wherever certificate prize text is consumed: page placement line, summary/metadata, PNG/PDF export text when applicable.
4. Replace the two issued/verification sentences below public certificates with one concise sentence that states the issuer and certificate ID.
5. Update certificate API and shared certificate helper tests, then run focused tests plus required project validation.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Updated the certificate page placement and verification icon rows from centered flex alignment to top alignment so icons line up with wrapped multi-line text.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Implemented public certificate prize labels with reward values by moving prize reward formatting into shared event prize helpers and using those labels for completed hackathon certificate payloads. The Vienna first-place certificate now receives prize strings such as `1st Place API Credits ($15,000)` and `Top 5 Teams Member Benefit (1 year ChatGPT Pro)`, while preview certificates keep their existing free-form comma-separated prize query behavior.

Merged the issued/verification footer copy into one concise sentence and aligned the trophy/lock icons to the top of wrapped text. Updated shared helper tests and the public certificate route integration coverage. Canonical docs were checked and did not need changes because the existing docs already define prize reward fields, completed outcome prize information, and certificate eligibility.

Validation passed: `git diff --check`, `bun run lint`, `bun run typecheck`, `bun run test:unit`, and `bun run test:integration`. No follow-up risks are known.
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
