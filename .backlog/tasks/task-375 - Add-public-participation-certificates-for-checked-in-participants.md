---
id: TASK-375
title: Add public participation certificates for checked-in participants
status: Done
assignee: []
created_date: '2026-06-10 00:05'
updated_date: '2026-06-10 00:05'
labels:
  - ui
  - api
  - events
dependencies: []
references:
  - >-
    /Users/alex/projects/codex-hackathons/shared/domains/events/certificates.ts
  - >-
    /Users/alex/projects/codex-hackathons/server/domains/events/certificates.ts
  - >-
    /Users/alex/projects/codex-hackathons/server/domains/events/certificate-image.ts
  - >-
    /Users/alex/projects/codex-hackathons/server/domains/events/certificate-pdf.ts
  - >-
    /Users/alex/projects/codex-hackathons/app/pages/events/[slug]/[userId].vue
  - >-
    /Users/alex/projects/codex-hackathons/app/components/public/events/EventCertificateCard.vue
priority: medium
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Give every approved, checked-in event participant a public participation certificate at /events/{slug}/{userId}. The page states that the participant has participated in the event on the event date, includes the Hackathon submission track when one applies, and presents an interactive holographic-card visual that tilts with pointer or touch movement, with event-type-specific color systems for hackathon, meetup, and build events, staged over the event background image. Each certificate carries a readable certificate ID such as BLD-VIE-2026-0620-SNOVAK. The link is shareable with full SEO and Open Graph metadata backed by a personalized social-preview image rendered on the worker, and signed-in visitors can download the certificate as an image or a print-oriented PDF.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria

<!-- AC:BEGIN -->
- [x] #1 A public certificate page exists at /events/{slug}/{userId} for approved applications with a recorded check-in on publicly visible events, and responds not found otherwise.
- [x] #2 The certificate states the participant name, event name, event date, and location, and names the Hackathon submission track when the participant team's submitted or locked submission has one.
- [x] #3 The page renders an interactive card that tilts with pointer or touch movement, with distinct metallic styles per event type and reduced-motion support.
- [x] #4 The page serves full Open Graph and Twitter metadata with a personalized 1200x630 certificate image rendered server-side per event type.
- [x] #5 Signed-in visitors can download the certificate as a PNG image or a vector PDF; the PDF read requires an authenticated session.
- [x] #6 Checked-in participants find a View certificate entry in their account event workspace overview.
- [x] #7 Canonical docs cover the certificate concept, API surface, and visibility rules, and automated coverage exercises the new routes.
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Certificates are derived state with no schema change: eligibility is approved status plus sticky Luma checkedInAt on an active account and a publicly visible event. The social-preview PNG is rendered on the worker with satori plus resvg through Nitro's experimental WASM support, with Inter font assets bundled as server assets (SIL OFL license included). The PDF is drawn natively with pdf-lib and fontkit so it stays vector and small, and embeds the public verification link. Names render with latin, latin-extended, cyrillic, and greek coverage; other scripts are a known limitation of the bundled fonts. The PNG endpoint is public so social crawlers can fetch it and carries cache headers; a rate limiter binding was considered and deferred.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Added a shared certificate domain (eligibility serialization, UTC date resolution, readable certificate ID derivation), public JSON/PNG/PDF certificate routes under /api/public/events/:slug/participants/:userId, the public certificate page with an interactive holographic tilting card in three event-type color systems staged over the event background image, SEO and Open Graph metadata with a personalized worker-rendered preview image in the same visual language, an account workspace View certificate entry driven by checkedInAt now exposed in own-participation reads, canonical doc updates, and unit plus integration coverage including the authenticated PDF gate. Validation: lint, typecheck, unit, integration, and a Cloudflare build whose worker bundle was exercised in local workerd, confirming the satori and resvg WASM modules render the certificate image on the production runtime, plus manual dev-server verification of all three certificate designs, light and dark modes, mobile layout, tilt interaction, and 404 behavior. Risks/follow-ups: PNG rendering cost is uncached per request beyond CDN headers, BDD coverage for the public page was not added in this pass, certificate IDs are readable rather than unique, and bundled fonts do not cover non-Latin/Cyrillic/Greek scripts.
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
