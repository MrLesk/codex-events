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

## Session

Purpose:
- Expose the authenticated actor context needed by the application.

Operations:

| Operation | Method And Path | Actor | Guards And Notes |
| --- | --- | --- | --- |
| Get current session actor | `GET /api/session` | authenticated user | Returns platform user identity, effective platform-admin status, hackathon roles, and any actor metadata needed for authorization-aware clients. |

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
| Record platform document acceptance | `POST /api/platform-document-acceptances` | authenticated user | Requires the exact `PlatformDocument` version being accepted. Rejects unknown or unpublished versions. |

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
| Create platform account | `POST /api/account/registration` | authenticated Auth0 user without a platform account | Creates the platform `User` record and records exact-version acceptance of the required current platform documents for registration. Rejects requests that omit required platform document versions or reference unpublished versions. |
| Delete own account | `DELETE /api/account` | authenticated user | Performs GDPR-compliant account deletion handling and writes the required audit trail. |

Testing:
- Unit: registration acceptance-version rules and deletion guard semantics.
- Integration: registration persistence, document-acceptance linkage, deletion effects, and audit creation.
- End-to-end: authenticated platform account registration and account deletion flows.

## Hackathons

Purpose:
- Expose public hackathon reads and admin lifecycle/configuration operations.

Operations:

| Operation | Method And Path | Actor | Guards And Notes |
| --- | --- | --- | --- |
| List hackathons | `GET /api/hackathons` | public or authenticated user | Returns hackathons visible to the caller with filter support by state and slug-oriented discovery. |
| Get hackathon detail | `GET /api/hackathons/:hackathonId` | public or authenticated user | Returns canonical hackathon fields and current terms references. |
| Create hackathon | `POST /api/hackathons` | platform admin | Creates a `draft` hackathon. |
| Update hackathon configuration | `PATCH /api/hackathons/:hackathonId` | hackathon admin or platform admin | Updates canonical configuration fields, including schedule, images, location, team size, and required profile flags. |
| Open submission manually | `POST /api/hackathons/:hackathonId/actions/open-submission` | hackathon admin or platform admin | Allowed only when registration is closed and the configured submission window is open. |
| Start judging preparation | `POST /api/hackathons/:hackathonId/actions/start-judging-preparation` | hackathon admin or platform admin | Locks submissions, freezes prize eligibility, and creates initial judge assignments. |
| Start judge review | `POST /api/hackathons/:hackathonId/actions/start-judge-review` | hackathon admin or platform admin | Allowed only after judging preparation is complete. |
| Announce winners | `POST /api/hackathons/:hackathonId/actions/announce-winners` | hackathon admin or platform admin | Allowed only from `shortlist`. |
| Complete hackathon | `POST /api/hackathons/:hackathonId/actions/complete` | hackathon admin or platform admin | Allowed only after winners are announced. |
| List evaluation criteria | `GET /api/hackathons/:hackathonId/evaluation-criteria` | public or authenticated user | Returns configured criteria and display order. |
| Create evaluation criterion | `POST /api/hackathons/:hackathonId/evaluation-criteria` | hackathon admin or platform admin | Adds a criterion for the hackathon. |
| Update evaluation criterion | `PATCH /api/hackathons/:hackathonId/evaluation-criteria/:criterionId` | hackathon admin or platform admin | Updates criterion fields and ordering. |
| List prizes | `GET /api/hackathons/:hackathonId/prizes` | public or authenticated user | Returns configured prize definitions. |
| Create prize | `POST /api/hackathons/:hackathonId/prizes` | hackathon admin or platform admin | Adds a prize definition for the hackathon. |
| Update prize | `PATCH /api/hackathons/:hackathonId/prizes/:prizeId` | hackathon admin or platform admin | Updates prize configuration. |

Notes:
- No manual API action opens `registration_open`. That transition remains system-driven from the configured registration window.

Testing:
- Unit: lifecycle transitions and guard rules.
- Integration: role enforcement and configuration persistence.
- End-to-end: admin lifecycle actions and public or authenticated reads.

## Hackathon Roles

Purpose:
- Manage hackathon-scoped admin and judge assignments.

Operations:

| Operation | Method And Path | Actor | Guards And Notes |
| --- | --- | --- | --- |
| List role assignments | `GET /api/hackathons/:hackathonId/roles` | hackathon admin or platform admin | Returns explicit assignments for the hackathon. |
| Create or replace role assignment | `PUT /api/hackathons/:hackathonId/roles/:userId` | platform admin | Supports `hackathon_admin` or `judge` roles and `is_in_judge_pool`. |
| Remove explicit role assignment | `DELETE /api/hackathons/:hackathonId/roles/:userId` | platform admin | Removes the explicit assignment. Platform-admin inheritance remains implicit. |
| Update judge-pool participation | `PATCH /api/hackathons/:hackathonId/roles/:userId` | platform admin | `judge` must remain in the automatic judge pool. |

Testing:
- Unit: role invariants and judge-pool rules.
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
- Support hackathon application submission and admin review.

Operations:

| Operation | Method And Path | Actor | Guards And Notes |
| --- | --- | --- | --- |
| Submit application | `POST /api/hackathons/:hackathonId/applications` | authenticated user | Allowed only in `registration_open`, only if no prior application exists, and only if the user profile satisfies the hackathon's required profile flags. Requires exact-version acceptance of the current application terms. |
| Get own application | `GET /api/hackathons/:hackathonId/applications/me` | authenticated user | Returns the caller's application for the hackathon, if present. |
| List hackathon applications | `GET /api/hackathons/:hackathonId/applications` | hackathon admin or platform admin | Returns application records for review workflows. |
| Approve application | `POST /api/hackathons/:hackathonId/applications/:applicationId/actions/approve` | hackathon admin or platform admin | Transitions `submitted` to `approved`. |
| Reject application | `POST /api/hackathons/:hackathonId/applications/:applicationId/actions/reject` | hackathon admin or platform admin | Transitions `submitted` to `rejected`. |

Testing:
- Unit: application guard and state-transition rules.
- Integration: exact-version acceptance persistence and review actions.
- End-to-end: applicant and admin review flows.

## Teams

Purpose:
- Support team creation, discovery, and team management.

Operations:

| Operation | Method And Path | Actor | Guards And Notes |
| --- | --- | --- | --- |
| List teams | `GET /api/hackathons/:hackathonId/teams` | approved user, team member, team admin, hackathon admin, or platform admin | Search and filter support applies only while team discovery is allowed to the actor. |
| Get team detail | `GET /api/hackathons/:hackathonId/teams/:teamId` | approved user, team member, team admin, hackathon admin, or platform admin | Returns team fields, active members, and join openness according to visibility rules. |
| Create team | `POST /api/hackathons/:hackathonId/teams` | approved user | Allowed only in `registration_open` or `submission_open`. Creator becomes an admin member automatically. |
| Rename team | `PATCH /api/hackathons/:hackathonId/teams/:teamId` | team admin | Updates team name and slug-oriented identity fields. |
| Update join openness | `PATCH /api/hackathons/:hackathonId/teams/:teamId/join-policy` | team admin | Controls `is_open_to_join_requests`. |
| Leave team | `POST /api/hackathons/:hackathonId/teams/:teamId/actions/leave` | team member or team admin | Allowed only if at least one active admin remains. After submission closes, at least one active team member must remain. |
| Remove member | `POST /api/hackathons/:hackathonId/teams/:teamId/members/:userId/actions/remove` | team admin | Allowed only if at least one active admin remains after removal. |

Testing:
- Unit: one-team-per-hackathon, active-admin, and active-member rules.
- Integration: team creation, rename, join openness, and membership updates.
- End-to-end: approved-user and team-admin management flows.

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
| Get own pending prize redemptions | `GET /api/prize-redemptions/me` | prize recipient | Returns the caller's redemption tasks across hackathons. |
| Submit prize redemption | `POST /api/prize-redemptions/:redemptionId/actions/redeem` | prize recipient | Requires legal name and exact-version acceptance of the current winner terms for the hackathon. |

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
- Team formation is available only during `registration_open` and `submission_open`.
- Submission creation and editing are available only during `submission_open`.
- A draft submission that is never submitted is treated as no submission for judging and dashboard purposes.
- Withdrawal ends when `judging_preparation` begins.
- Removal from competition during or after judge review uses `disqualified`.
- Prize-eligible team membership freezes when the hackathon enters `judging_preparation`.
- Blind judging excludes team identity even when the reviewing actor is also an admin.
- Shortlist ordering and leaderboard data remain computed views rather than separate canonical entities.

## Test Coverage Matrix

| Domain | Unit | Integration | Auth0-backed End-to-End |
| --- | --- | --- | --- |
| Session | Required | Required | Required |
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
