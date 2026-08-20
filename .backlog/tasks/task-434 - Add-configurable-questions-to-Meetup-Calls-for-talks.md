---
id: TASK-434
title: Add configurable questions to Meetup Calls for talks
status: In Progress
assignee:
  - '@Codex'
created_date: '2026-08-20 17:43'
updated_date: '2026-08-20 18:18'
labels: []
dependencies:
  - TASK-426
references:
  - >-
    https://docs.google.com/forms/d/e/1FAIpQLSfFmKu0wNveXKyCmzuMBRooZyWyEMJKQ2L0GCZXdp5UG4AT4w/viewform
documentation:
  - docs/domain-model.md
  - docs/api-surface.md
  - docs/schema-outline.md
priority: high
type: feature
ordinal: 142000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Meetup organizers can add ordered custom questions to a Call for talks. Participants answer them as part of their registration-bound talk proposal, and every speaker continues to count as an event participant through that registration.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Only Meetup Calls for talks support custom questions; a talk remains bound to the speaker registration and the speaker is counted as an event participant without a separate speaker-count record.
- [x] #2 Event organizers can configure and order up to 20 short text, long text, single-choice, or required acknowledgement questions before any proposal exists.
- [x] #3 Question definitions and proposal answers are validated; drafts may retain incomplete required answers, while submission requires every required answer and the current question revision.
- [x] #4 Admin and account contracts expose question configuration where authorized, proposal contracts expose ordered answers, and public event responses expose neither private questions nor answers.
- [x] #5 Organizer, participant, and reviewer CFP interfaces use the existing App component system in an atomic component structure without nested card surfaces.
- [x] #6 Canonical documentation, D1 schema migration, account-deletion behavior, and unit, integration, and browser workflow coverage describe and verify the feature.
<!-- AC:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [x] #1 Canonical docs were updated or confirmed unchanged
- [x] #2 Code behavior matches canonical docs
- [ ] #3 Relevant validation commands pass
- [x] #4 Tests were added or updated when behavior changed
- [x] #5 Test gaps are documented when automation is not practical
- [x] #6 Config and developer workflow docs were updated when setup changed
- [x] #7 Auth and permissions changes follow the documented platform model
- [x] #8 Risks and follow ups are recorded in the task summary
<!-- DOD:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Update canonical CFP domain, schema, lifecycle, permission, API, and testing rules. 2. Add question contracts, D1 fields, server validation, serialization boundaries, and revision-based race protection. 3. Compose organizer, participant, and reviewer interfaces from App wrappers and focused CFP molecules/organisms. 4. Verify domain, API, and browser behavior and complete visual comparison against the supplied reference.

5. Reuse the new event builder AppDateTimePicker for the Call for talks opening and closing fields, then verify the CFP control and event schemas.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Implementation has been restored after concurrent worktree interference. Focused typecheck, lint, unit, integration, BDD generation, and manual browser behavior checks pass. Final side-by-side visual comparison remains blocked because the temporary reference image expired; repository-wide suites also contain unrelated performance-task baseline failures.

Fresh verification on 2026-08-20: Nuxt typecheck passed; repository lint passed with unrelated .worktrees artifacts excluded; focused CFP and event unit coverage passed 91 tests across 8 files; focused API integration coverage passed 12 tests across 2 files; bddgen and git diff --check passed. The local Nuxt/Cloudflare server started cleanly on port 3100. Browser re-verification could not proceed because the in-app browser URL policy blocked localhost navigation; the earlier successful browser pass remains recorded in design-qa.md. The strict source comparison is still blocked because the temporary reference attachment expired.

The test environment is still serving the previous successful deployment because both workflows for commit 33a74c81 stopped at the unrelated useTeamFormationWorkspace unit failure before deploy-test. The question editor is present locally under the enabled window but has therefore not reached test.

Replaced the legacy CFP datetime-local controls with the new event builder AppDateTimePicker and added source coverage proving the picker and question editor remain composed in EventTalkProposalControl. Validation: Nuxt typecheck passed, focused ESLint passed, 34 targeted tests passed, and git diff --check passed. Full lint remains blocked by another task untracked .worktrees Nuxt artifact; full unit remains blocked by the existing useTeamFormationWorkspace page-state regression.
<!-- SECTION:NOTES:END -->
