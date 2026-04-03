---
id: TASK-170
title: Add Intl prize formatting on public and account hackathon pages
status: Done
assignee: []
created_date: '2026-04-03 18:35'
updated_date: '2026-04-03 18:37'
labels: []
dependencies: []
documentation:
  - /Users/alex/projects/codex-hackathons/docs/domain-model.md
  - /Users/alex/projects/codex-hackathons/docs/api-surface.md
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Public hackathon detail and account hackathon prize tabs should render prize reward values with proper Intl-based formatting instead of showing raw numeric strings. Both surfaces currently flow through the shared public prize presentation helper and prize list component, so the change should preserve existing non-numeric reward labels while formatting numeric reward values and currency-backed rewards in a user-facing way that reads correctly on first view.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Public hackathon prize listings format currency-backed numeric rewards with Intl currency formatting instead of raw value plus currency code text.
- [x] #2 Account hackathon prize listings show the same Intl-formatted reward text as the public prize surface.
- [x] #3 Non-numeric prize reward values remain readable and unchanged rather than being coerced into broken numeric output.
- [x] #4 Unit coverage verifies the prize formatting helper for currency-backed and non-numeric rewards.
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Update the shared prize presentation helper used by the public and account prize tabs.
2. Format numeric reward values with Intl number formatting and use Intl currency formatting when a valid currency code is present.
3. Preserve free-form reward labels and add unit coverage for currency, numeric, and non-numeric cases.
4. Run the required local validation commands before handoff.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Implemented the change in the shared `useHackathonPresentation` formatter so both `/hackathons/:slug` and `/account/hackathons/:slug` prize tabs pick up the same output through `HackathonPrizeList`.

Used Intl currency formatting for numeric values with a valid currency code, grouped numeric formatting for plain numeric values, and preserved free-form labels like `Mentorship` unchanged.

Validation passed locally: `bun run vitest tests/unit/app/composables/useHackathonPresentation.test.ts`, `bun run lint`, `bun run typecheck`, and `bun run test:unit`.

Canonical docs were confirmed unchanged because this task only adjusts presentation of existing prize fields and does not change product behavior or API contracts.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Updated the shared public hackathon presentation helper so prize rewards render with Intl formatting on both the public hackathon detail page and the account hackathon prize tab. Numeric rewards without a currency code now use locale-aware grouped number formatting, numeric rewards with a valid currency code use Intl currency formatting, and free-form reward labels remain unchanged. Added unit coverage for currency-backed, plain numeric, free-form, and invalid-currency fallback cases. Validation passed with `bun run lint`, `bun run typecheck`, `bun run test:unit`, plus a focused run of `bun run vitest tests/unit/app/composables/useHackathonPresentation.test.ts`. Risks are low because the change stays inside the existing shared formatter used by both surfaces and preserves non-numeric rewards verbatim.
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
