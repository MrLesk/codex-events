---
id: TASK-76
title: Align Auth0 Universal Login branding with Codex Hackathons
status: Done
assignee:
  - '@codex'
created_date: '2026-03-29 14:29'
updated_date: '2026-03-29 14:42'
labels: []
dependencies: []
priority: high
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Extend the Auth0 bootstrap so the default Universal Login experience uses Codex Hackathons branding instead of generic Auth0 defaults. Keep the implementation on the supported branding and prompt surfaces rather than introducing a separate custom login page.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 The repository includes a hosted text-based Codex Hackathons wordmark asset suitable for Auth0 Universal Login branding
- [x] #2 The Auth0 bootstrap can enforce the branded Auth0 application display name and the existing logo/color settings needed for Universal Login
- [x] #3 Repository docs and env examples describe the branding-related Auth0 bootstrap inputs using the canonical Codex Hackathons defaults
- [x] #4 Local validation passes and, when credentials are available, the bootstrap can be applied to the shared dev Auth0 tenant
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Added a hosted wordmark asset at `public/auth0/codex-hackathons-wordmark.svg` for Auth0 Universal Login branding.

Extended `tools/auth0/auth0-bootstrap.ts` so the Auth0 bootstrap now enforces the Auth0 client display name, defaults the Universal Login branding colors to the canonical Codex Hackathons palette, and infers the wordmark/favicons from the HTTPS `AUTH0_APP_BASE_URL` when explicit branding URLs are not provided.

Updated `.env.example`, `README.md`, and `DEVELOPMENT.md` so the operator-facing configuration docs match the new branding defaults and the new `AUTH0_APP_DISPLAY_NAME` input.

Added unit coverage for the inferred Auth0 branding defaults and override behavior in `tests/unit/tools/auth0/auth0-bootstrap.test.ts`.

Rolled the change out to the shared dev environment by deploying commit `a8965aa` from a clean temporary worktree to avoid unrelated local worktree changes, verified `https://dev.codex-hackathons.com/auth0/codex-hackathons-wordmark.svg` returns `200`, and then ran the Auth0 bootstrap in `apply` mode against `auth.dev.codex-hackathons.com` with the shared dev branding overrides.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Aligned Auth0 Universal Login branding with the Codex Hackathons website.

What changed:
- Added a text-only Codex Hackathons wordmark asset for Auth0 at `public/auth0/codex-hackathons-wordmark.svg`.
- Extended `tools/auth0/auth0-bootstrap.ts` so the bootstrap now enforces the Auth0 application display name, canonical branding colors, and inferred wordmark/favicon URLs from the HTTPS app base URL.
- Updated `.env.example`, `README.md`, and `DEVELOPMENT.md` so the Auth0 bootstrap inputs document the branded defaults and the new `AUTH0_APP_DISPLAY_NAME` setting.
- Added unit coverage for the new inferred Auth0 branding defaults and explicit override behavior.

Validation:
- `bun run lint`
- `bun run test:unit`
- `curl -I https://dev.codex-hackathons.com/auth0/codex-hackathons-wordmark.svg`
- Auth0 bootstrap apply against the shared dev tenant completed successfully.

Rollout:
- Deployed the pushed branding commit to the shared dev app from a clean temporary worktree so unrelated local edits were not published.
- Applied the Auth0 bootstrap with the shared dev app base URL, custom domain, branded display name, canonical colors, and the hosted wordmark URL.

Risks and follow-ups:
- This keeps the implementation on Auth0’s supported branding surfaces. If the team later wants the login page to match the main site more deeply, the next step would be richer Universal Login theme/template customization rather than more bootstrap-side workarounds.
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
