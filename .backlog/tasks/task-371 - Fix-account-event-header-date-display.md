---
id: TASK-371
title: Fix account event header date display
status: Done
assignee:
  - Codex
created_date: '2026-06-04 18:25'
updated_date: '2026-06-04 18:30'
labels:
  - bug
  - frontend
dependencies: []
references:
  - 'https://codex-events.com/events/codex-build-vienna-2026-06-20'
documentation:
  - docs/domain-model.md
  - docs/schema-outline.md
modified_files:
  - app/domains/events/presentation.ts
  - 'app/pages/account/events/[slug]/index.vue'
  - tests/unit/app/domains/events/presentation.test.ts
priority: medium
ordinal: 67000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Account event pages currently show the registration window in the event header where users expect the event date. Public event pages already show the event date correctly. Update the account/admin event header so it displays the event schedule date consistently with the public event page while keeping registration-window details in registration-specific areas only.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Account event detail headers display the event date derived from the event schedule, not registrationOpensAt/registrationClosesAt.
- [x] #2 Public event detail date display remains unchanged.
- [x] #3 Relevant unit coverage or an existing focused test verifies the account event header date source.
- [x] #4 Required validation for the change passes.
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Add a small presentation helper for the account event header summary so the date source is unit-testable outside the Vue page.
2. Update the account event page header summary to use the event schedule date via getEventEarliestStartAt and weekday formatting, preserving location and existing hackathon team-size metadata.
3. Add focused unit coverage in tests/unit/app/domains/events/presentation.test.ts verifying the account header summary uses the event schedule date instead of registration dates.
4. Run required validation, then commit and push with message `TASK-371 - Fix account event header date display`.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Discovery: public event detail already uses formatEventDateWithWeekday(getEventEarliestStartAt(event)); account event detail used formatEventWindow(registrationOpensAt, submissionClosesAt/registrationClosesAt), which caused the account header to show the registration window. Canonical docs treat registration windows as separate from the event schedule.

Validation passed: bun x vitest run tests/unit/app/domains/events/presentation.test.ts, bun run lint, bun run typecheck, bun run test:unit, bun run test:integration, bun run test:bdd, and git diff --check. Docs/config/auth were reviewed and did not need changes because this only corrects presentation date sourcing.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Summary:
- Added a tested account event header summary helper that derives the displayed date from the event schedule via the earliest agenda item with submission-open fallback.
- Updated the account event detail page to use that helper instead of formatting the registration window in the header.
- Added unit coverage for a build event whose registration window ends before the scheduled event date, matching the reported Vienna mismatch.

Validation:
- bun x vitest run tests/unit/app/domains/events/presentation.test.ts
- bun run lint
- bun run typecheck
- bun run test:unit
- bun run test:integration
- bun run test:bdd
- git diff --check

Risks/follow-ups:
- No known follow-ups. Registration-window displays in timeline/operations surfaces remain unchanged.
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
