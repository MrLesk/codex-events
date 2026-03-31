---
id: TASK-136
title: Isolate Auth0 account-link verification from the primary app session
status: Done
assignee: []
created_date: '2026-03-31 19:03'
updated_date: '2026-03-31 19:11'
labels:
  - auth0
  - account-linking
  - bug
  - production
dependencies: []
documentation:
  - docs/api-surface.md
  - docs/domain-model.md
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Existing platform accounts still cannot complete same-email Google linking in production because the current linking flow reuses the main Auth0 app session and the SDK keeps the already-authenticated Google user claims during the secondary password reauthentication flow. Rework the linking flow to use an isolated Auth0 session/transaction namespace for the link verification step so the password-backed account can be verified independently and linking can complete for real existing accounts.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 The same-email existing-account linking flow succeeds when a user signs in with Google and then reauthenticates with the matching password-backed Auth0 account.
- [x] #2 The account-link verification step does not depend on the already-authenticated primary app session claims.
- [x] #3 The linking flow continues to reject expired, invalid, and wrong-account verification attempts.
- [x] #4 Automated tests cover the isolated link-session flow and the successful real-world existing-account path.
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Confirm the remaining production failure mode using a live Worker tail during the real Google-to-password link flow.
2. Isolate the Auth0 account-link verification step from the primary app session by using a dedicated link-session and transaction namespace.
3. Update route-level and utility-level tests to cover the isolated link-session flow, then run repo validation.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Production tail showed the flow consistently reached `/auth/link/complete` and then redirected to `/account/register?...linkingError=mismatch`, so the worker was taking the explicit mismatch branch rather than failing the Management API link or route config.

The root cause is in the Auth0 server SDK session update behavior during secondary reauthentication: when an app session already exists, the generic interactive login flow keeps the existing primary app session claims, which leaves the request looking like the original Google identity even after the password account login succeeds.

Implemented an isolated Auth0 session/transaction namespace for the existing-account verification step inside `platform-account-linking.ts`, then updated the link routes to use that isolated helper instead of the primary app session.

Canonical docs and runtime config stayed unchanged; this fix only corrects the transport used to verify the password-backed account during linking.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Fixed the remaining production account-linking failure for existing accounts by isolating the password-account verification step from the primary Auth0 app session. The link flow now uses a dedicated Auth0 session/transaction namespace in `server/utils/platform-account-linking.ts`, so `/auth/link/login`, `/auth/link/callback`, and `/auth/link/complete` no longer depend on the already-authenticated Google session claims when validating the existing password-backed account.

Updated route tests to assert the isolated helper contract and added utility tests to verify the dedicated Auth0 state/transaction identifiers and the isolated verification lifecycle. Production investigation included a live `wrangler tail` session on the `codex-hackathons` worker, which confirmed the previous flow consistently hit the `mismatch` branch after `/auth/link/complete`.

Validation passed with `bun run lint` (existing repo warnings only), `bun run typecheck`, and `bun run test:unit`. Risk is localized to the account-link route flow; no schema, docs, or deployment config changes were required.
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
