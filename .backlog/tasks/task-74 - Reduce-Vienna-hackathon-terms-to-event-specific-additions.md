---
id: TASK-74
title: Reduce Vienna hackathon terms to event-specific additions
status: Done
assignee:
  - '@codex'
created_date: '2026-03-29 13:43'
updated_date: '2026-03-29 14:09'
labels: []
dependencies: []
references:
  - wrangler.jsonc
documentation:
  - docs/README.md
  - docs/domain-model.md
  - docs/schema-outline.md
  - shared/platform-legal.ts
  - /Users/alex/Downloads/All - Terms and Conditions (EN).docx
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Review the current platform Imprint, Privacy Policy, and Terms and Conditions together with the Vienna hackathon draft terms document. Produce Vienna-specific hackathon terms content that removes provisions already covered at platform level and keeps only the additions, restrictions, and event rules that are specific to the Vienna hackathon. Align the result with the current product model, including the distinction between application-stage terms and winner/prize-redemption terms where needed.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 A reviewed Vienna-specific terms draft exists in markdown form and is aligned with the current platform legal copy
- [x] #2 Provisions already covered by the platform Imprint, Privacy Policy, or platform Terms and Conditions are removed from the Vienna draft unless a Vienna-specific override is required
- [x] #3 Hackathon-specific application-stage rules and winner/prize-specific rules are separated according to the current product model or any deviation is explicitly documented
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Review the platform Imprint, Privacy Policy, and platform Terms in shared/platform-legal.ts together with the Vienna draft and the live Vienna hackathon configuration in dev D1.
2. Remove platform-level material from the Vienna draft, keeping only Vienna-specific additions, overrides, and event rules that are not already covered by the platform legal pages.
3. Split the cleaned content into separate markdown drafts for application-stage terms and winner/prize-recipient terms so the output matches the canonical hackathon terms model.
4. Store the draft markdown in a new repo-side legal draft location outside docs/ so canonical product documentation remains separate from event-instance legal content.
5. Validate the resulting drafts against the current Vienna configuration and record any unresolved items or mismatches in the task notes and handoff summary.

6. Publish the reviewed Vienna markdown drafts into dev D1 as new versioned hackathon terms documents and update the Vienna hackathon's current application and winner terms references.

7. Verify the live dev D1 state after publication, then commit the repo draft files together with the Backlog task file using the required task-linked commit message format and push main.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Reviewed the public platform Imprint, Privacy Policy, and platform Terms in shared/platform-legal.ts plus the supplied Vienna .docx draft and the live Vienna hackathon configuration in dev D1.

Created repo-side markdown drafts at legal/hackathons/codex-vienna-2026-04-18/application-terms.md and legal/hackathons/codex-vienna-2026-04-18/winner-terms.md so the Vienna terms set now follows the product model split between application_terms and winner_terms.

Removed overlap with platform legal pages, including organizer/contact boilerplate, general privacy notice language, general age/account/platform conduct and moderation language, broad platform IP/license terms, generic liability and jurisdiction clauses, and platform-level publicity wording.

Dropped draft clauses that do not cleanly match the current product model, including minor-participation fallback language, blanket judge/admin competition exclusions, organizer approval for post-approval team changes, and prize substitution mechanics.

Recorded one remaining operational gap: the Vienna hackathon currently has no evaluation criteria configured in dev D1, so the cleaned application draft refers to criteria and tie-breaks only as published event materials rather than embedding a hard-coded rubric.

Follow-up review added the separate winner-only draft from /Users/alex/Downloads/Winners - Terms and Conditions (EN).docx to check for missing Vienna-specific post-selection rules before finalizing the repo draft.

Compared the separate winner-only draft against the repo winner draft and added the winner-specific points that fit the current product model: continued applicability of Vienna participation rules to winners, frozen member eligibility for member-scoped benefits, provider-account/setup conditions for digital prizes, and personal-use/renewal wording for the ChatGPT Pro benefit.

Intentionally left out winner-draft items that would introduce unsupported workflow or legal machinery not reflected in the current product model, including fixed claim deadlines, signature blocks, separate designation forms, substitute-prize/next-winner mechanisms, and broader organizer/co-host liability boilerplate.

Follow-up action approved: patch only the safe application-term additions from the review feedback. Scope is limited to event photography/video notice, cancellation or format-change language, and a narrow in-person risk/belongings clause. Winner-term deadline and post-selection revocation are intentionally excluded because they would introduce rules beyond the current product model.

Applied the approved safe follow-up edits to the Vienna application terms draft: added schedule/venue/format-change language, a narrow in-person risk and belongings clause, and a photography/video notice with separate handling where additional consent or notice is required.

Published the reviewed Vienna markdown drafts into remote dev D1 as version 2 hackathon terms documents and updated the Vienna hackathon's current terms references to those new rows.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Reviewed the Vienna draft against the current platform Imprint, Privacy Policy, platform Terms and Conditions, the canonical hackathon document model, and the live Vienna hackathon configuration in dev D1. Produced two cleaned markdown drafts under legal/hackathons/codex-vienna-2026-04-18/: an application-terms draft for Vienna-specific participation rules and a winner-terms draft for Vienna-specific prize and redemption rules. Removed platform-level legal material that is already covered elsewhere and omitted draft clauses that would conflict with the current product model or rely on unpublished placeholders. Validation: bun run test:unit passed locally (41 files, 195 tests).

Follow-up review of the separate winner-only .docx resulted in a targeted update to the repo winner-terms draft. Added winner-specific conditions that were missing but consistent with the current product model: continued eligibility under Vienna participation rules, frozen member eligibility for member-scoped benefits, provider-driven account/setup conditions for digital prizes, and personal-use/renewal wording for the ChatGPT Pro prize. Validation after the update: bun run test:unit passed locally (41 files, 195 tests).

Applied the approved safe follow-up edits from the later review to the Vienna application-terms draft only. The draft now covers event photography/video, cancellation or format change, and a narrow in-person risk/belongings clause, while still leaving winner-term redemption deadlines and post-selection revocation out because those would require an explicit product-model decision. Validation after this edit: bun run test:unit passed locally (41 files, 195 tests).

Published the reviewed Vienna markdown drafts into the remote dev D1 database as `application_terms` version 2 and `winner_terms` version 2 for `hackathon_codex_vienna_2026_04_18`, and updated the hackathon's current terms pointers to those new versions. Verified the current references now resolve to `terms_app_codex_vienna_2026_04_18_v2` and `terms_win_codex_vienna_2026_04_18_v2`.
<!-- SECTION:FINAL_SUMMARY:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [x] #1 Canonical docs were updated or confirmed unchanged
- [x] #2 Code behavior matches canonical docs
- [x] #3 Relevant validation commands pass
- [ ] #4 Tests were added or updated when behavior changed
- [x] #5 Test gaps are documented when automation is not practical
- [ ] #6 Config and developer workflow docs were updated when setup changed
- [x] #7 Auth and permissions changes follow the documented platform model
- [x] #8 Risks and follow ups are recorded in the task summary
<!-- DOD:END -->
