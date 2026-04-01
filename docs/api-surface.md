# API Surface

This document defines the canonical backend API surface for the Codex hackathon platform.

It translates the canonical product model into stable backend domains, operations, shared API conventions, visibility rules, lifecycle guards, and testing expectations.

## Scope

- The backend API is the system-of-record interface for platform and hackathon workflows.
- The API surface is organized by stable backend domains rather than by UI screens.
- Auth0 provides identity.
- Platform authorization is resolved from application data.
- Derived views such as the leaderboard, shortlist ordering, and the no-submission team section remain computed from persisted data.

## Shared Conventions

### Base Path

- The canonical API surface is exposed under `/api`.

### Authentication And Actor Resolution

- Authenticated API requests use the real Auth0-backed application session.
- The backend resolves the current platform actor from the authenticated Auth0 subject stored on the platform `User` record.
- Auth0 is not a source of product authorization.
- Product authorization comes from platform data such as `is_platform_admin`, `HackathonRoleAssignment`, `UserApplication`, `TeamMember`, and `PrizeRedemption`.
- A request without an authenticated session is rejected as unauthenticated unless the operation is explicitly public.

### Success Responses

- JSON responses return an object.
- Single-resource and action responses use a top-level `data` object.
- List responses use top-level `data` and `meta` objects.
- `meta` contains only pagination or filtering metadata required by the operation.
- Derived operational views are returned as computed data and are not treated as persisted canonical entities.

### Error Responses

- JSON error responses use:

```json
{
  "error": {
    "code": "string",
    "message": "string",
    "details": {}
  }
}
```

- `code` is stable and machine-readable.
- `message` is human-readable.
- `details` is optional and carries field-level or guard-specific information when needed.

### Filtering And Pagination

- Collection endpoints support explicit query parameters rather than hidden server defaults.
- Pagination uses `page` and `page_size`.
- Filter parameters use descriptive names tied to canonical fields or states.
- Ordering parameters are limited to documented sort keys for each collection.

### Exact-Version Document Acceptance

- Platform document acceptance references the exact accepted `PlatformDocument` version.
- Hackathon application submission references the exact accepted `HackathonTermsDocument` version for `application_terms`.
- Prize redemption references the exact accepted `HackathonTermsDocument` version for `winner_terms`.
- Acceptance write operations reject outdated or mismatched document references.

### Lifecycle And Guard Enforcement

- State-changing operations must reject requests that violate documented lifecycle guards.
- The API does not silently coerce invalid transitions.
- System-driven transitions remain system behavior, even when the resulting state is visible through admin APIs.

### Testing Expectations

- Shared backend behavior requires unit and integration coverage.
- Actor-facing workflows require Auth0-backed end-to-end coverage in addition to unit and integration coverage.
- End-to-end coverage uses the documented stable personas and real Auth0 login flows.
- API end-to-end tests do not use fake JWTs, bypass headers, or Auth0-role shortcuts.

## Domain Map

The canonical backend domains are:

- `session`
- `legal`
- `platform-documents`
- `account`
- `hackathons`
- `hackathon-roles`
- `hackathon-terms`
- `applications`
- `teams`
- `team-join-requests`
- `submissions`
- `judging`
- `shortlist`
- `winners`
- `prize-redemption`
- `audit`

## Legal

Purpose:
- Support public legal-notice contact from the platform imprint page.

Operations:

| Operation | Method And Path | Actor | Guards And Notes |
| --- | --- | --- | --- |
| Submit imprint contact request | `POST /api/public/imprint-contact` | public or authenticated user | Accepts a public support or legal-contact message with name, email, and message text. Sends the message to the platform support inbox through the configured transactional email provider. This route is for legal or support contact only and is not a substitute for authenticated account workflows. |

Testing:
- Unit: contact-form validation and delivery-result handling.
- Integration: public request handling and provider-configuration failure behavior.

## Session

Purpose:
- Expose the authenticated actor context needed by the application.

Operations:

| Operation | Method And Path | Actor | Guards And Notes |
| --- | --- | --- | --- |
| Get current session actor | `GET /api/session` | authenticated user | Returns platform user identity, effective platform-admin status, and hackathon roles needed for authorization-aware clients and routing. |

Testing:
- Unit: actor resolution and permission derivation rules.
- Integration: session-required behavior and response shape.
- End-to-end: authenticated persona session reads.

## Platform Documents

Purpose:
- Expose platform-wide registration documents and exact-version acceptance records.

Operations:

| Operation | Method And Path | Actor | Guards And Notes |
| --- | --- | --- | --- |
| List current platform documents | `GET /api/platform-documents/current` | public or authenticated user | Returns the current `privacy_policy` and `platform_terms` versions used for platform registration and account flows. |
| List platform document versions for a type | `GET /api/platform-documents/:documentType/versions` | authenticated user | Returns available published versions for the document type. |
| Record platform document acceptance | `POST /api/platform-document-acceptances` | authenticated user with a platform account | Requires the exact `PlatformDocument` version being accepted. Rejects unknown or unpublished versions. Used when an existing platform account must accept the current platform documents before normal workspace access resumes. |

Testing:
- Unit: exact-version acceptance rules.
- Integration: document lookup and acceptance persistence.
- End-to-end: persona acceptance flows that use the real authenticated session.

## Account

Purpose:
- Support platform-account lifecycle operations that are not hackathon-specific.

Operations:

| Operation | Method And Path | Actor | Guards And Notes |
| --- | --- | --- | --- |
| Create platform account after terms acceptance | `POST /api/account/registration` | authenticated Auth0 user without a platform account | Creates the platform `User` record, allows canonical `firstName` and `familyName` to remain blank until later profile completion, and records acceptance of the current required platform documents. The frontend-owned completion route is `/account/register`. When the authenticated identity must be linked to an existing platform account instead, the route returns the link-required outcome before any platform-document acceptance is recorded for the pre-link identity. |
| Update own platform account profile | `PATCH /api/account` | authenticated user with a platform account and current platform-document acceptance | Updates canonical `firstName` and `familyName` plus optional profile fields such as `company`, `bio`, X, LinkedIn, and GitHub profile links, an optional ChatGPT email, an optional OpenAI org ID, and an optional Luma username. |
| Get own profile icon | `GET /api/account/profile-icon` | authenticated user with a platform account and current platform-document acceptance | Returns the uploaded profile icon object for the caller. |
| Upload or replace own profile icon | `POST /api/account/profile-icon` | authenticated user with a platform account and current platform-document acceptance | Accepts multipart upload for a single profile icon image and replaces any prior icon object. |
| Remove own profile icon | `DELETE /api/account/profile-icon` | authenticated user with a platform account and current platform-document acceptance | Deletes the caller's uploaded profile icon and clears profile-icon metadata on the platform user record. |
| Delete own account | `DELETE /api/account` | authenticated user | Performs GDPR-compliant account deletion handling and writes the required audit trail. |

Testing:
- Unit: registration acceptance-version rules, profile normalization, profile-icon upload guards, and deletion guard semantics.
- Integration: registration persistence, current-consent gating, profile updates, profile-icon object flows, document-acceptance linkage, deletion effects, and audit creation.
- End-to-end: authenticated account-registration completion, profile management including profile icon updates, and account deletion flows.

Operational notes:
- `/api/session` can expose a link-required hint for an authenticated identity whose verified social login matches an existing password-backed platform account.
- When `/account/register` is in a link-required state, the UI can bypass the platform-document review UI and send the user directly into existing-account reauthentication. After linking, current platform-document acceptance is evaluated on the linked platform account.

## Hackathons

Purpose:
- Expose public hackathon discovery reads, caller-visible hackathon reads, and admin lifecycle/configuration operations.

Operations:

| Operation | Method And Path | Actor | Guards And Notes |
| --- | --- | --- | --- |
| List public hackathons | `GET /api/public/hackathons` | public or authenticated user | Returns the canonical public-visible hackathon set regardless of caller privileges, with pagination and discovery filters. |
| Get public hackathon detail | `GET /api/public/hackathons/:slug` | public or authenticated user | Resolves by exact hackathon slug and returns canonical public-safe hackathon fields, including structured `agendaItems`, plus current terms references. |
| List public evaluation criteria | `GET /api/public/hackathons/:slug/evaluation-criteria` | public or authenticated user | Returns the public evaluation criteria for the exact public hackathon slug. |
| List public prizes | `GET /api/public/hackathons/:slug/prizes` | public or authenticated user | Returns the public prize definitions for the exact public hackathon slug. |
| Get public background image | `GET /api/public/hackathons/:slug/images/background` | public or authenticated user | Returns the uploaded hackathon background image bytes for the exact public hackathon slug when configured. |
| Get public banner image | `GET /api/public/hackathons/:slug/images/banner` | public or authenticated user | Returns the uploaded hackathon banner image bytes for the exact public hackathon slug when configured. |
| List caller-visible hackathons | `GET /api/hackathons` | public or authenticated user | Returns hackathons visible to the caller. Authenticated admins can see draft hackathons they are allowed to manage here, and staff-visible internal hackathons are included when the caller has staff access to them. |
| Get caller-visible hackathon detail | `GET /api/hackathons/:hackathonId` | public or authenticated user | Returns canonical hackathon fields, including structured `agendaItems`, and current terms references for a hackathon visible to the caller. Staff-visible internal hackathons are included when the caller has staff access to that hackathon. |
| Create hackathon | `POST /api/hackathons` | platform admin | Creates a `draft` hackathon with canonical configuration, including structured `agendaItems`, location fields (`city`, `country`, and `address`), team size and participant limits, `inPersonEvent`, and application-requirement toggles such as `requireWhyThisHackathon` and `requireProofOfExecution`. |
| Update hackathon configuration | `PATCH /api/hackathons/:hackathonId` | hackathon admin or platform admin | Updates canonical configuration fields, including schedule, structured `agendaItems`, images, location fields (`city`, `country`, and `address`), team size and participant limits, required profile flags, `inPersonEvent`, and application-requirement toggles such as `requireWhyThisHackathon` and `requireProofOfExecution`. |
| Upload hackathon background image | `POST /api/hackathons/:hackathonId/images/background` | hackathon admin or platform admin | Accepts multipart upload for the background image and updates `backgroundImageUrl` to the platform-managed public image endpoint. |
| Remove hackathon background image | `DELETE /api/hackathons/:hackathonId/images/background` | hackathon admin or platform admin | Deletes the uploaded background image object and clears `backgroundImageUrl`. |
| Upload hackathon banner image | `POST /api/hackathons/:hackathonId/images/banner` | hackathon admin or platform admin | Accepts multipart upload for the banner image and updates `bannerImageUrl` to the platform-managed public image endpoint. |
| Remove hackathon banner image | `DELETE /api/hackathons/:hackathonId/images/banner` | hackathon admin or platform admin | Deletes the uploaded banner image object and clears `bannerImageUrl`. |
| Open submission manually | `POST /api/hackathons/:hackathonId/actions/open-submission` | hackathon admin or platform admin | Allowed only when registration is closed and the configured submission window is open. |
| Start judging preparation | `POST /api/hackathons/:hackathonId/actions/start-judging-preparation` | hackathon admin or platform admin | Locks submissions, freezes prize eligibility, and creates initial judge assignments. |
| Start judge review | `POST /api/hackathons/:hackathonId/actions/start-judge-review` | hackathon admin or platform admin | Allowed only after judging preparation is complete. |
| Start shortlist | `POST /api/hackathons/:hackathonId/actions/start-shortlist` | hackathon admin or platform admin | Allowed only from `judge_review` after every locked submission has a completed review outcome or has been removed from competition. |
| Announce winners | `POST /api/hackathons/:hackathonId/actions/announce-winners` | hackathon admin or platform admin | Allowed only from `shortlist`. |
| Complete hackathon | `POST /api/hackathons/:hackathonId/actions/complete` | hackathon admin or platform admin | Allowed only after winners are announced. |
| List caller-visible evaluation criteria | `GET /api/hackathons/:hackathonId/evaluation-criteria` | public or authenticated user | Returns configured criteria and display order for a hackathon visible to the caller. |
| Create evaluation criterion | `POST /api/hackathons/:hackathonId/evaluation-criteria` | hackathon admin or platform admin | Adds a criterion for the hackathon. |
| Update evaluation criterion | `PATCH /api/hackathons/:hackathonId/evaluation-criteria/:criterionId` | hackathon admin or platform admin | Updates criterion fields and ordering. |
| List caller-visible prizes | `GET /api/hackathons/:hackathonId/prizes` | public or authenticated user | Returns configured prize definitions for a hackathon visible to the caller. |
| Create prize | `POST /api/hackathons/:hackathonId/prizes` | hackathon admin or platform admin | Adds a prize definition for the hackathon. |
| Update prize | `PATCH /api/hackathons/:hackathonId/prizes/:prizeId` | hackathon admin or platform admin | Updates prize configuration. |

Notes:
- No manual API action opens `registration_open`. That transition remains system-driven from the configured registration window.
- `participantsLimit` is an indicative planning target surfaced in admin approval workflows and does not reject staged or applied approval decisions by itself.
- Public hackathon discovery and detail responses expose only public-safe fields. They do not expose internal record identifiers, creator identifiers, or audit timestamps.
- Public current-terms references expose document type, version, title, and published time only.

Testing:
- Unit: lifecycle transitions and guard rules.
- Integration: role enforcement and configuration persistence.
- End-to-end: admin lifecycle actions, staff-visible internal reads, and public or authenticated reads.

## Hackathon Roles

Purpose:
- Manage hackathon-scoped admin, staff, and judge assignments.

Operations:

| Operation | Method And Path | Actor | Guards And Notes |
| --- | --- | --- | --- |
| List role assignments | `GET /api/hackathons/:hackathonId/roles` | hackathon admin or platform admin | Returns explicit assignments for the hackathon. |
| Create or replace role assignment | `PUT /api/hackathons/:hackathonId/roles/:userId` | hackathon admin or platform admin | Supports `hackathon_admin`, `judge`, or `staff` roles plus the `is_in_judge_pool` and `is_staff` capability flags. |
| Remove explicit role assignment | `DELETE /api/hackathons/:hackathonId/roles/:userId` | hackathon admin or platform admin | Removes the explicit assignment. Platform-admin inheritance remains implicit. |
| Update role-assignment capability flags | `PATCH /api/hackathons/:hackathonId/roles/:userId` | hackathon admin or platform admin | Updates admin-only `is_in_judge_pool` and `is_staff` flags without replacing the explicit role. `judge` must remain in the automatic judge pool, `staff` must remain marked as staff, and non-admin staff and judges remain distinct. |

Testing:
- Unit: role invariants plus judge-pool and staff-flag rules.
- Integration: assignment uniqueness and permission enforcement.
- End-to-end: admin role-management flows.

## Hackathon Terms

Purpose:
- Expose current hackathon-specific terms and manage versioned terms documents.

Operations:

| Operation | Method And Path | Actor | Guards And Notes |
| --- | --- | --- | --- |
| Get current hackathon terms | `GET /api/hackathons/:hackathonId/terms/current` | authenticated user | Returns the current `application_terms` and `winner_terms` references. |
| List terms versions for a type | `GET /api/hackathons/:hackathonId/terms/:documentType/versions` | hackathon admin or platform admin | Returns version history for the terms type. |
| Create terms version | `POST /api/hackathons/:hackathonId/terms/:documentType/versions` | hackathon admin or platform admin | Creates a new versioned terms document. |
| Set current terms reference | `POST /api/hackathons/:hackathonId/terms/:documentType/actions/set-current` | hackathon admin or platform admin | Updates the hackathon's current terms reference for the given document type. |

Testing:
- Unit: versioning and current-reference rules.
- Integration: terms creation and reference updates.
- End-to-end: admin configuration flows that expose current terms to users later in the workflow.

## Applications

Purpose:
- Support hackathon application submission, participant visibility, and admin review.

Operations:

| Operation | Method And Path | Actor | Guards And Notes |
| --- | --- | --- | --- |
| Submit application | `POST /api/hackathons/:hackathonId/applications` | authenticated user | Allowed only in `registration_open`, only if no prior application exists, and only if the user profile satisfies the hackathon's required profile flags. Requires exact-version acceptance of the current application terms. Carries registration hint payload with `registrationTeamIntent` (`solo`, `team`, `unknown`) and optional teammate hints, plus optional `whyThisHackathon` and `proofOfExecutionUrl`, where `proofOfExecutionUrl` accepts one or more comma-separated `http` or `https` links. For in-person hackathons, also requires `inPersonAttendanceCommitment = true`. If configured, also requires non-empty `whyThisHackathon` and/or at least one proof link in `proofOfExecutionUrl`. |
| Get own application | `GET /api/hackathons/:hackathonId/applications/me` | authenticated user | Returns the caller's application for the hackathon, if present. |
| List hackathon applications | `GET /api/hackathons/:hackathonId/applications` | staff, hackathon admin, or platform admin | Returns application records for participant-visibility and review workflows. Staff access is read-only. |
| Stage application approval | `POST /api/hackathons/:hackathonId/applications/:applicationId/actions/approve` | hackathon admin or platform admin | Persists `pre_approval_status = approved` for a `submitted` application without changing canonical status. |
| Stage application rejection | `POST /api/hackathons/:hackathonId/applications/:applicationId/actions/reject` | hackathon admin or platform admin | Persists `pre_approval_status = rejected` for a `submitted` application without changing canonical status. |
| Apply staged application decisions | `POST /api/hackathons/:hackathonId/applications/actions/apply-staged-decisions` | hackathon admin or platform admin | Applies all staged decisions for `submitted` applications, transitions canonical status, records reviewer metadata, enqueues participant-facing decision emails, and enqueues Luma guest-status sync when the hackathon requires a Luma profile and defines a Luma event URL. |

Testing:
- Unit: application guard and state-transition rules.
- Integration: exact-version acceptance persistence and review actions.
- End-to-end: applicant, staff visibility, and admin review flows.

Operational notes:
- Application review API actions remain successful even when queue enqueue fails.
- Queue-consumer delivery outcomes are retried under queue retry policy and provider-aware retry guards.
- Queue enqueue outcomes are recorded in audit metadata for operational visibility.
- Luma-enabled hackathons persist per-application Luma sync state so admins can identify manual Luma follow-up after asynchronous sync failures.
- Public registration entry is available only while the hackathon is in `registration_open`.
- The public registration route `/hackathons/:slug/register` is a narrow application-entry flow rather than a participant workspace. Anonymous visitors are sent to Auth0 login, authenticated users without a platform account are sent to account completion, existing applicants are sent to `/account/hackathons/:slug`, and users without an application are sent back to the public hackathon detail page when registration is no longer open.
- Public registration copy should stay focused on completing and submitting an application. Application status, approval outcome, team formation follow-up, and other ongoing participant workflow belong in the account-scoped hackathon workspace.

## Teams

Purpose:
- Support team creation, discovery, internal visibility, and team management.

Operations:

| Operation | Method And Path | Actor | Guards And Notes |
| --- | --- | --- | --- |
| List teams | `GET /api/hackathons/:hackathonId/teams` | approved user, team member, team admin, staff, hackathon admin, or platform admin | Search and filter support applies only while team discovery is allowed to the actor. Staff access is read-only and is not limited to the participant team-formation window. |
| Get team detail | `GET /api/hackathons/:hackathonId/teams/:teamId` | approved user, team member, team admin, staff, hackathon admin, or platform admin | Returns team fields, active members, and join openness according to visibility rules. Staff access is read-only. |
| Create team | `POST /api/hackathons/:hackathonId/teams` | approved user | Allowed only in `registration_open` or `submission_open`. Creator becomes an admin member automatically. |
| Rename team | `PATCH /api/hackathons/:hackathonId/teams/:teamId` | team admin | Updates team name and slug-oriented identity fields. |
| Update join openness | `PATCH /api/hackathons/:hackathonId/teams/:teamId/join-policy` | team admin | Controls `is_open_to_join_requests`. |
| Leave team | `POST /api/hackathons/:hackathonId/teams/:teamId/actions/leave` | team member or team admin | Allowed only if at least one active admin remains. After submission closes, at least one active team member must remain. |
| Remove member | `POST /api/hackathons/:hackathonId/teams/:teamId/members/:userId/actions/remove` | team admin | Allowed only if at least one active admin remains after removal. |

Testing:
- Unit: one-team-per-hackathon, active-admin, and active-member rules.
- Integration: team creation, rename, join openness, and membership updates.
- End-to-end: approved-user, staff visibility, and team-admin management flows.

## Team Join Requests

Purpose:
- Support requests to join open teams and team-admin review.

Operations:

| Operation | Method And Path | Actor | Guards And Notes |
| --- | --- | --- | --- |
| Create join request | `POST /api/hackathons/:hackathonId/team-join-requests` | approved user | Allowed only during team-formation states and only for open teams with available capacity. |
| List team join requests | `GET /api/hackathons/:hackathonId/teams/:teamId/join-requests` | team admin | Returns pending and decided requests for the team. |
| Cancel own pending join request | `POST /api/hackathons/:hackathonId/team-join-requests/:requestId/actions/cancel` | requesting user | Allowed only while the request remains `pending`. |
| Approve join request | `POST /api/hackathons/:hackathonId/team-join-requests/:requestId/actions/approve` | team admin | Requires approved application, capacity, openness, and no active team membership elsewhere in the hackathon. |
| Reject join request | `POST /api/hackathons/:hackathonId/team-join-requests/:requestId/actions/reject` | team admin | Transitions `pending` to `rejected`. |

Testing:
- Unit: join-request state guards and membership constraints.
- Integration: request creation and review effects on memberships.
- End-to-end: approved-user request flows and team-admin review flows.

## Submissions

Purpose:
- Support team-owned submission creation, editing, submission, withdrawal, and admin disqualification.

Operations:

| Operation | Method And Path | Actor | Guards And Notes |
| --- | --- | --- | --- |
| Get team submission | `GET /api/hackathons/:hackathonId/teams/:teamId/submission` | team member, team admin, hackathon admin, or platform admin | Returns the current submission if present. |
| Create submission draft | `POST /api/hackathons/:hackathonId/teams/:teamId/submission` | team admin | Allowed only in `submission_open`. |
| Update submission | `PATCH /api/hackathons/:hackathonId/teams/:teamId/submission` | team admin | Allowed only in `submission_open`. |
| Submit project | `POST /api/hackathons/:hackathonId/teams/:teamId/submission/actions/submit` | team admin | Allowed only in `submission_open`. |
| Withdraw submission | `POST /api/hackathons/:hackathonId/teams/:teamId/submission/actions/withdraw` | team admin | Allowed only before `judging_preparation`. |
| Withdraw submission on team request | `POST /api/hackathons/:hackathonId/teams/:teamId/submission/actions/admin-withdraw` | hackathon admin or platform admin | Allowed only before `judging_preparation`. The body must include `requestedByUserId`, and that user must be an active team admin of the submission's team. |
| Disqualify submission | `POST /api/hackathons/:hackathonId/teams/:teamId/submission/actions/disqualify` | hackathon admin or platform admin | Used instead of withdrawal once review-phase removal rules apply. |
| List no-submission teams | `GET /api/hackathons/:hackathonId/no-submission-teams` | hackathon admin or platform admin | Returns the computed operational section for approved teams with no active submitted submission. |

Testing:
- Unit: submission-state and withdrawal or disqualification rules.
- Integration: create, update, submit, withdraw, disqualify, and no-submission derived reads.
- End-to-end: team-admin submission flows and admin removal flows.

## Judging

Purpose:
- Support blind judging, assignment operations, and review outcomes.

Operations:

| Operation | Method And Path | Actor | Guards And Notes |
| --- | --- | --- | --- |
| List active judge assignments | `GET /api/hackathons/:hackathonId/judging/assignments` | assigned judge, hackathon admin, or platform admin | Judges see only their assignments in blind view. Admins can access operational assignment views. |
| Get blind assignment detail | `GET /api/hackathons/:hackathonId/judging/assignments/:assignmentId` | assigned judge, hackathon admin, or platform admin acting through assignment review | The response excludes team identity and includes anonymized application information. |
| Start assigned review | `POST /api/hackathons/:hackathonId/judging/assignments/:assignmentId/actions/start` | assigned judge, hackathon admin, or platform admin acting through assignment review | Transitions `assigned` to `judge_started`. |
| Complete assigned review | `POST /api/hackathons/:hackathonId/judging/assignments/:assignmentId/actions/complete` | assigned judge, hackathon admin, or platform admin acting through assignment review | Records criterion scores, comments, and final assignment outcome. |
| Skip assigned review | `POST /api/hackathons/:hackathonId/judging/assignments/:assignmentId/actions/skip` | assigned judge, hackathon admin, or platform admin acting through assignment review | Creates a new active assignment for another eligible judge with the lowest assigned load. |
| Mark assignment ineligible | `POST /api/hackathons/:hackathonId/judging/assignments/:assignmentId/actions/mark-ineligible` | assigned judge, hackathon admin, or platform admin acting through assignment review | Records ineligibility at the assignment level. |
| Reassign unstarted assignment | `POST /api/hackathons/:hackathonId/judging/assignments/:assignmentId/actions/reassign` | hackathon admin or platform admin | Allowed only before review has started. |
| Force assignment to skipped | `POST /api/hackathons/:hackathonId/judging/assignments/:assignmentId/actions/force-skip` | hackathon admin or platform admin | Used when the assigned judge cannot complete review. |
| Revert ineligibility decision | `POST /api/hackathons/:hackathonId/judging/assignments/:assignmentId/actions/revert-ineligibility` | hackathon admin or platform admin | Reopens the assignment's eligibility status without changing blind-view rules. |

Testing:
- Unit: blind-view, reassignment, and review-state rules.
- Integration: assignment state transitions and low-load reassignment behavior.
- End-to-end: judge persona review flows and admin intervention flows.

## Shortlist

Purpose:
- Expose the computed shortlist and final ranking review process.

Operations:

| Operation | Method And Path | Actor | Guards And Notes |
| --- | --- | --- | --- |
| Get leaderboard | `GET /api/hackathons/:hackathonId/leaderboard` | judge, hackathon admin, or platform admin | Returns the computed scored ordering. |
| Get shortlist view | `GET /api/hackathons/:hackathonId/shortlist` | judge, hackathon admin, or platform admin | Returns the computed shortlist ordering visible during `shortlist`. |
| Reorder shortlist ranking | `POST /api/hackathons/:hackathonId/shortlist/actions/reorder` | hackathon admin or platform admin | Adjusts final ranking order without mutating underlying judge scores. |

Testing:
- Unit: shortlist guard and computed-order rules.
- Integration: leaderboard and shortlist response behavior.
- End-to-end: judge review visibility and admin reorder flows.

## Winners

Purpose:
- Expose final winner state after shortlist review.

Operations:

| Operation | Method And Path | Actor | Guards And Notes |
| --- | --- | --- | --- |
| Get winners | `GET /api/hackathons/:hackathonId/winners` | public or authenticated user after announcement | Returns the final announced winners. |

Testing:
- Unit: winner visibility guards.
- Integration: state-dependent winner reads.
- End-to-end: post-announcement winner visibility.

## Prize Redemption

Purpose:
- Support prize-eligibility reads and winner redemption flows.

Operations:

| Operation | Method And Path | Actor | Guards And Notes |
| --- | --- | --- | --- |
| List prize eligibility and redemptions for a hackathon | `GET /api/hackathons/:hackathonId/prize-redemptions` | hackathon admin or platform admin | Returns operational redemption records and eligibility context. |
| Get own pending prize redemptions | `GET /api/prize-redemptions/me` | prize recipient | Returns the caller's redemption tasks across hackathons. Member-scoped redemptions appear for the eligible user. Team-scoped redemptions appear for active team admins of the winning team. |
| Submit prize redemption | `POST /api/prize-redemptions/:redemptionId/actions/redeem` | prize recipient | Requires legal name and exact-version acceptance of the current winner terms for the hackathon. Team-scoped redemption requires active team-admin access to the winning team. |

Testing:
- Unit: prize-eligibility freeze and winner-terms acceptance rules.
- Integration: redemption writes and restricted operational reads.
- End-to-end: prize-recipient redemption flows and admin visibility.

## Audit

Purpose:
- Expose restricted audit reads for sensitive or operationally important actions.

Operations:

| Operation | Method And Path | Actor | Guards And Notes |
| --- | --- | --- | --- |
| List audit records for a hackathon | `GET /api/hackathons/:hackathonId/audit` | hackathon admin or platform admin | Returns audit records relevant to the hackathon scope. |
| List platform audit records | `GET /api/audit` | platform admin | Returns platform-wide audit records for sensitive actions such as account deletion and admin operations. |

Testing:
- Unit: visibility rules for audit access.
- Integration: audit persistence and restricted reads.
- End-to-end: admin-only audit visibility.

## Cross-Domain Rules

- A user can have at most one `UserApplication` per hackathon.
- A user can have at most one active team membership per hackathon.
- Non-admin `staff` and `judge` assignments remain distinct.
- Team formation is available only during `registration_open` and `submission_open`.
- Submission creation and editing are available only during `submission_open`.
- A draft submission that is never submitted is treated as no submission for judging and dashboard purposes.
- In-person application commitment is required only when the hackathon is configured with `inPersonEvent = true`.
- Withdrawal ends when `judging_preparation` begins.
- Removal from competition during or after judge review uses `disqualified`.
- Prize-eligible team membership freezes when the hackathon enters `judging_preparation`.
- Blind judging excludes team identity even when the reviewing actor is also an admin.
- Shortlist ordering and leaderboard data remain computed views rather than separate canonical entities.

## Test Coverage Matrix

| Domain | Unit | Integration | Auth0-backed End-to-End |
| --- | --- | --- | --- |
| Session | Required | Required | Required |
| Legal | Required | Required | Not required |
| Platform documents | Required | Required | Required |
| Account | Required | Required | Required |
| Hackathons | Required | Required | Required for actor-facing admin and public flows |
| Hackathon roles | Required | Required | Required |
| Hackathon terms | Required | Required | Required where the flow is actor-facing |
| Applications | Required | Required | Required |
| Teams | Required | Required | Required |
| Team join requests | Required | Required | Required |
| Submissions | Required | Required | Required |
| Judging | Required | Required | Required |
| Shortlist | Required | Required | Required |
| Winners | Required | Required | Required for visibility transitions |
| Prize redemption | Required | Required | Required |
| Audit | Required | Required | Required for restricted admin access |
