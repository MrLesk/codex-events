---
id: TASK-62
title: Review and align public legal pages with Austrian law
status: Done
assignee:
  - codex
created_date: '2026-03-28 16:36'
updated_date: '2026-03-28 16:40'
labels:
  - legal
  - compliance
  - public-pages
dependencies: []
documentation:
  - /Users/alex/projects/codex-hackathons/docs/README.md
  - /Users/alex/projects/codex-hackathons/docs/domain-model.md
  - >-
    https://www.oesterreich.gv.at/de/themen/onlinesicherheit_internet_und_neue_medien/internet_und_handy___sicher_durch_die_digitale_welt/Seite.1720902
  - 'https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:32016R0679'
  - 'https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:32022R2065'
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Review the public Imprint, Terms and Conditions, and Privacy Policy pages against Austrian and directly applicable EU requirements, then update the shared legal copy used by those pages so the published content is materially compliant with the current repo-backed operating model. The platform is currently presented as being operated from Vienna, Austria by a natural person using Auth0, Cloudflare, and Resend. Do not invent business-registration facts that are not supported by repository evidence; where a disclosure depends on operator facts that the repo does not establish, keep the runtime copy accurate and capture the residual blocker in task notes/final summary.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 The shared legal copy for imprint, terms, and privacy is updated to cover the Austrian/EU disclosures supported by current repository facts.
- [x] #2 The privacy notice reflects the current processing model in the repository and includes the key GDPR transparency items relevant to the platform and imprint contact flow.
- [x] #3 The terms and imprint include the key Austrian/EU operator and service disclosures appropriate for the current platform model, without adding unsupported factual claims.
- [x] #4 Relevant tests and validation run locally, with at minimum `bun run test:unit` passing, and any remaining operator-fact compliance blockers are documented in the task summary.
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Review the current legal content in shared/platform-legal.ts against repository-backed product facts, the imprint contact flow, and Austrian/EU legal disclosure requirements.
2. Update the shared imprint, privacy, and terms markdown so the public pages cover supported Austrian imprint disclosures, GDPR transparency items, and DSA-facing service/terms disclosures that match the current platform model.
3. Avoid unsupported factual claims about registrations, VAT, or regulated-status data that are not proven by the repository; capture any remaining operator-fact blockers in task notes and final summary.
4. Run targeted validation and at minimum bun run test:unit, then record outcomes, risks, and any residual compliance limits.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Reviewed the current legal copy against official Austrian/EU sources: oesterreich.gv.at guidance on website imprint/offenlegung, GDPR transparency duties (Regulation (EU) 2016/679), and DSA contact-point / terms duties (Regulation (EU) 2022/2065).

Implemented the legal review as a shared-copy change in shared/platform-legal.ts so the three public pages inherit the updated text without touching unrelated UI structure.

Validation: `bun run test:unit` passed locally (39 files, 185 tests). No dedicated automated tests were added because the change is static legal copy rather than executable workflow logic.

Residual blocker for strict legal certainty: the repository does not establish whether the operator has any Firmenbuch entry, VAT ID, chamber membership, regulated-trade data, or other registration-specific disclosures that would need to appear on an Austrian commercial imprint.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Updated the shared legal source used by the public Imprint, Terms and Conditions, and Privacy Policy pages to better align with Austrian and directly applicable EU requirements for the platform's current repo-backed operating model. The privacy notice now gives a cleaner GDPR Article 13/14 style disclosure set, including controller details, purposes and legal bases, legitimate interests, data sources, recipients, international transfers, retention, required-vs-optional data, and complaints wording. The terms now add DSA-facing contact-point and moderation disclosures, narrow the user-content license, add an email-based notice/redress path, and replace the broader liability/change wording with more conservative language. The imprint now adds business purpose, editorial line, and DSA contact-point details.

Tests run: `bun run test:unit`.

Follow-up risk: I cannot certify absolute Austrian compliance from repository evidence alone because the repo does not prove whether the operator has any commercial-register, VAT, chamber, supervisory-authority, or regulated-trade disclosures that would also need to be published.
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
