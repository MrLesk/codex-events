---
id: TASK-437
title: Port participant registration to the builder interaction system
status: Done
assignee:
  - '@codex'
created_date: '2026-08-22 12:14'
updated_date: '2026-08-22 12:53'
labels: []
dependencies: []
references:
  - 'app/pages/events/[slug]/register.vue'
  - app/components/applications/ParticipantApplicationRegistrationPanel.vue
  - app/components/talk-proposals/organisms/TalkProposalRegistrationSection.vue
modified_files:
  - app/components/applications/ParticipantApplicationRegistrationPanel.vue
  - >-
    app/components/applications/participant-registration/molecules/ParticipantRegistrationChoiceGroup.vue
  - >-
    app/components/applications/participant-registration/molecules/ParticipantRegistrationField.vue
  - >-
    app/components/applications/participant-registration/molecules/ParticipantRegistrationProgressItem.vue
  - >-
    app/components/applications/participant-registration/organisms/ParticipantRegistrationApplicationSection.vue
  - >-
    app/components/applications/participant-registration/organisms/ParticipantRegistrationCommitmentsSection.vue
  - >-
    app/components/applications/participant-registration/organisms/ParticipantRegistrationParticipationSection.vue
  - >-
    app/components/applications/participant-registration/organisms/ParticipantRegistrationProfileSection.vue
  - >-
    app/components/applications/participant-registration/organisms/ParticipantRegistrationProgressRail.vue
  - >-
    app/components/applications/participant-registration/templates/ParticipantRegistrationFormTemplate.vue
  - app/components/talk-proposals/molecules/TalkProposalQuestionInput.vue
  - app/components/talk-proposals/organisms/TalkProposalRegistrationSection.vue
  - app/composables/useParticipantRegistrationForm.ts
  - app/domains/applications/participant-application-form.ts
  - app/domains/applications/participant-registration-experience.ts
  - 'app/pages/events/[slug]/register.vue'
  - tests/bdd/features/authenticated/talk-proposals.feature
  - tests/bdd/steps/talk-proposals.steps.ts
  - tests/unit/app/components/participant-registration-atomic-contract.test.ts
  - >-
    tests/unit/app/domains/applications/participant-registration-experience.test.ts
priority: high
type: enhancement
ordinal: 155000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Rebuild public participant event registration as an atomic, configuration-driven Vue interface using the approved builder-derived progress, choice, and feedback patterns. Preserve current registration contracts and submission behavior across Hackathon, Build, Meetup, and Meetup CFP variants.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 The registration page uses an atomic molecules, organisms, and template composition instead of the monolithic participant registration panel.
- [x] #2 Every desktop registration variant shows a progress rail derived from the rendered required fields, while mobile shows equivalent progress and submission controls without horizontal overflow.
- [x] #3 All currently configurable profile, application, track, participation, teammate, in-person, terms, and CFP fields preserve their visibility, requiredness, Markdown rendering, validation, payload, and submission behavior.
- [x] #4 Failed submission uses participant-friendly validation copy, updates section error state, and moves focus to the first invalid field or section.
- [x] #5 The experience uses plain participant language and builder-style momentum without points, scores, ranks, acceptance odds, or game jargon.
- [x] #6 Relevant unit, component, integration, BDD, and browser visual checks cover Hackathon, Build track, Build AI Knowledge, minimal Meetup, and Meetup CFP variants.
<!-- AC:END -->

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

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Add an authoritative participant-registration experience model in the applications domain. It will calculate visible sections, required-field completion, optional-field errors, section state, progress totals, and first-invalid targets from the same configuration and form values used for submission, including CFP additions.
2. Add useParticipantRegistrationForm as the authoritative registration controller for reactive form state, validation errors, live readiness, submit attempts, rail navigation, reduced-motion scrolling, and first-invalid focus. The route keeps request/submission ownership, while the form template remains a composition surface over the controller.
3. Replace the monolithic panel with an atomic feature tree under app/components/applications/participant-registration/: field and progress molecules; profile, application, participation, commitments, and progress organisms; and one form template that composes those units. Update the route caller directly and remove the legacy panel.
4. Adapt the existing TalkProposalRegistrationSection and TalkProposalQuestionInput organism/molecule to the shared field targeting and feedback contracts, without changing CFP payloads or its single combined action.
5. Add focused unit coverage for all five approved variants and malformed optional values, plus source-contract and BDD checks for atomic ownership, desktop/mobile progress, rail navigation, first-invalid focus, live feedback, and the combined CFP action.
6. Verify with targeted tests, then the required lint/typecheck/unit/integration/BDD suites. Run Browser/IAB QA for the five variants at desktop and mobile sizes and light/dark themes where supported, compare current screenshots to all accepted concept images with view_image, fix material drift, finalize TASK-437, then commit only scoped files and push main.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Closest analogs: the existing participant registration panel supplied the complete participant contract, and the admin builder atomic tree supplied the composition vocabulary. Extending the panel was insufficient because it owned rendering, validation, and form derivation together; the route now calls the atomic template directly, with one registration composable owning form state, validation, section derivation, readiness, progress, and first-invalid navigation. Existing App wrappers and the CFP organism/molecule are reused.

Canonical docs were reviewed and remain accurate. Setup, configuration, server, schema, authorization, lifecycle, payload, redirect, and submission contracts did not change.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Replaced the participant registration monolith with an atomic Vue/Nuxt experience covering dense Hackathon, Build with tracks, Build with AI Knowledge, minimal Meetup, and Meetup with CFP. The registration composable is the single authority for form state, validation, required completion, section status, readiness, rail navigation, and first-invalid focus; the route retains request and submission ownership. Desktop always renders the progress rail, mobile provides compact live progress and fixed submit access, and reduced motion is respected. Existing payloads, configuration behavior, Markdown, CFP composition, redirects, and exact actions remain unchanged.

Validation: lint passed; typecheck passed; unit passed (172 files, 1,141 tests); integration passed (44 files, 495 tests); BDD passed (92 standard/authenticated plus 2 destructive scenarios). Browser/IAB QA covered all five variants at 1600x1000 and 390x844 in light/dark themes, including empty, validation-error, conditional, progress, rail focus, first-invalid focus, optional-malformed, and successful CFP submission states. No horizontal overflow was observed. Material icon and readiness-copy mismatches were fixed. The IAB host exported desktop PNGs at 1251px despite a verified logical 1600px viewport; mobile PNGs were native 390px. A pre-existing VueUse toRefs warning remains reproducible outside this change and did not affect the clean BDD browser assertions.
<!-- SECTION:FINAL_SUMMARY:END -->
