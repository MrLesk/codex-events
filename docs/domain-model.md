# Domain Model

This document defines the canonical domain language for the Codex hackathon platform.

## Scope

The platform supports multiple hackathons running in parallel. Users have a platform account and can participate in one or more hackathons over time. Hackathons have their own team formation, submission, judging, winner selection, and prize redemption workflows.

## Core Entities

### User

A platform user with an account that exists independently from any specific hackathon.

Key characteristics:

- Can authenticate into the platform without registering for a hackathon.
- Can apply to hackathons.
- Can join at most one team per hackathon.
- Can be marked with `is_platform_admin`.
- Can optionally store X, LinkedIn, and GitHub profile links, a ChatGPT email, an OpenAI org ID, a Luma username, and a profile icon uploaded from account settings.
- Can delete their account, subject to GDPR-compliant handling.

Rules:

- Platform account provisioning depends on Auth0 signup consent for the platform `privacy_policy` and `platform_terms`.
- After the authenticated callback, the platform provisions the account and records platform-document acceptance.
- The reusable platform profile fields are managed from account settings.
- A user with `is_platform_admin = true` is a platform admin.
- Platform admins can create hackathons.
- Platform admins can assign hackathon admins.
- Platform admins implicitly have hackathon-admin permissions in every hackathon.

### Hackathon

A single hackathon program with its own schedule, documents, roles, criteria, teams, submissions, and prizes.

Key characteristics:

- Multiple hackathons can exist in parallel.
- Each hackathon can define a background image and a banner image.
- Each hackathon has a city and address.
- Each hackathon has its own registration window.
- Each hackathon has its own submission window.
- Each hackathon has a submission flow that can be activated manually within its configured submission window.
- Each hackathon has a judging flow that is activated manually.
- Each hackathon can define a maximum team member limit.
- Each hackathon can require X, LinkedIn, and GitHub profiles, a ChatGPT email, an OpenAI org ID, and a Luma username, for registration.
- Each hackathon references its own application terms and winner terms.

### PlatformDocument

A platform-wide document used during platform account registration.

Current platform document types:

- `privacy_policy`
- `platform_terms`

Rules:

- Platform registration uses platform-wide documents only.
- The Auth0 signup experience references platform policy and terms links for account creation.
- After callback, platform provisioning requires a consent signal from Auth0 and records platform-document acceptance in product data.
- Platform documents are versioned.

### HackathonTermsDocument

A versioned terms document belonging to a specific hackathon.

Document types:

- `application_terms`
- `winner_terms`

Rules:

- Each hackathon references one current application terms document.
- Each hackathon references one current winner terms document.
- Hackathon application uses the current application terms document for that hackathon.
- Prize redemption uses the current winner terms document for that hackathon.
- User acceptance must reference the exact accepted document version.

### HackathonRoleAssignment

A user-to-hackathon assignment that grants hackathon-specific access.

Hackathon roles:

- `hackathon_admin`
- `judge`

Rules:

- A user has at most one explicit hackathon role per hackathon.
- `hackathon_admin` includes judge permissions.
- Every platform admin also has a `HackathonRoleAssignment` row with role `hackathon_admin` for every hackathon.
- `HackathonRoleAssignment` includes `is_in_judge_pool` to control automatic judge distribution.
- A user with role `judge` must be in the automatic judge distribution pool.
- A user with role `hackathon_admin` can be in or out of the automatic judge distribution pool.
- Any actor performing a judge review sees the blind judging view rather than the admin view.
- The blind judging view includes anonymized application information and excludes team identity.

### UserApplication

A user-to-hackathon application record.

This is the canonical record that a user applied to participate in a specific hackathon.

Rules:

- A user can have at most one application per hackathon.
- Application approval is handled by hackathon admins.
- A user must be approved before creating or joining a team in that hackathon.
- Blind judging uses application information without exposing team identity.
- User application acceptance references the exact application terms version accepted for that hackathon.
- A user can submit a `UserApplication` only if the user profile satisfies that hackathon's required profile rules.

### Team

A team within a single hackathon. Solo participation is modeled as a one-member team.

Key characteristics:

- A team belongs to exactly one hackathon.
- A team can be created after approval.
- A team can be open to join requests.
- A team can have one or more admins.

Rules:

- Team membership is hackathon-scoped.
- A user can belong to at most one team per hackathon.
- The user who creates a team becomes a team admin automatically.
- Every active team must always have at least one active team admin.
- A team cannot exceed the maximum team member limit defined by its hackathon.
- A team with pending join requests can approve them only while the team remains open to join requests.
- Team admins can rename the team, review join requests, approve members, and remove members.
- Users can search for teams and request to join open teams.

### TeamMember

The membership record connecting a user to a team.

Rules:

- This is a many-to-many relationship between users and teams over the lifetime of the platform.
- Within a single hackathon, a user can have at most one active team membership.
- Team-level permissions are modeled on this record.

Team member roles:

- `member`
- `admin`

### TeamJoinRequest

A request from an approved user to join an open team in a hackathon.

Rules:

- A team join request belongs to one user and one team.
- A team join request can be created only while the hackathon allows team formation.
- Team admins can approve or reject a join request.
- Approval requires an approved `UserApplication`.
- Approval requires that the user is not already a member of another team in the same hackathon.
- Approval requires that the team has available capacity.
- Approval requires that the team is still open to join requests.

### Submission

A team-owned submission for a hackathon.

Key characteristics:

- Every submission belongs to a team.
- Solo participants still submit as a team.
- Team admins create and manage the submission on behalf of the team.
- Team admins can edit their submission only during the submission window.

Rules:

- Submission ownership is team-based, not user-based.
- When the judging preparation step begins, submissions are locked.
- Once locked, submissions can no longer be edited.
- A submission can be marked with workflow outcomes such as withdrawn or disqualified.
- A team with no submission is not eligible for judging, but this is represented by the absence of a submission rather than by a submission outcome.
- A draft submission that is never submitted is treated as no submission for judging and dashboard purposes.

### EvaluationCriterion

A scoring dimension configured per hackathon.

Rules:

- Each criterion belongs to one hackathon.
- Each criterion can have a weight.
- Final scores are derived from criterion scores and criterion weights.

### JudgeAssignment

An assignment of one submission to one judge within a hackathon.

Relationship rules:

- A submission has one active judge assignment during the normal judging flow.
- Each judge assignment belongs to exactly one submission.
- Each judge assignment belongs to exactly one user acting as judge.

Operational rules:

- When judging preparation begins, submissions are distributed between users in the automatic judge distribution pool as evenly as possible.
- Hackathon admins can reassign a submission only before its assigned judge has started review.
- Scoring data lives on `JudgeAssignment`.
- Judge-level ineligibility decisions also live on `JudgeAssignment`.
- A judge can mark a submission assignment as ineligible and provide a reason.
- A judge assignment records review progress such as `judge_started`, `judge_completed`, and `skipped`.
- A judge can skip an assignment if they do not want to review that submission.
- A hackathon admin or platform admin can force an in-progress assignment to `skipped` if the assigned judge cannot complete the review.
- When an assignment is skipped, the submission is reassigned to another judge with the lowest number of assigned submissions.
- Hackathon admins and platform admins can revert a judge's ineligibility decision.
- Disqualification is an admin action.
- Withdrawal is a team-driven action before judging preparation begins.
- A hackathon admin or platform admin can mark a submission as withdrawn on behalf of the team when acting on a team request.
- The admin-withdraw request identifies the requesting user through `requestedByUserId`, and that user must be an active team admin of the submission's team.
- Once judging preparation begins, teams can no longer withdraw a submission.
- Once judge review begins, removal from competition is handled as disqualification rather than withdrawal.

### Prize

A prize configuration defined per hackathon.

Examples:

- Team-ranked API credit prizes
- Benefits granted to all members of the top N teams
- Digital-only prizes with no physical fulfillment

Rules:

- Prize structures are hackathon-specific.
- A hackathon can define multiple prize rules.
- Prize eligibility can be team-based or member-based depending on the prize configuration.
- Prize-eligible team membership is frozen when the hackathon enters `judging_preparation`.

### PrizeEligibilitySnapshot

A frozen record of the team members eligible for member-scoped prizes.

Rules:

- Prize eligibility snapshots are created when the hackathon enters `judging_preparation`.
- A snapshot records the active members of each team with a submitted submission at the moment prize eligibility is frozen.

### PrizeRedemption

The record of how an awarded prize is redeemed.

Rules:

- Redemption can be digital or in person depending on the prize.
- Redemption requires the winner's legal name.
- Redemption requires acceptance of the winner terms and conditions.
- Prize redemption references the exact winner terms version accepted for that redemption.
- Member-scoped prize redemption is completed by the eligible user recorded on the redemption.
- Team-scoped prize redemption is completed by an active team admin for the winning team.

### AuditLog

An immutable record of sensitive or important actions.

Scope:

- admin actions
- judging-state transitions
- ineligibility or disqualification decisions
- winner and prize actions
- account deletion and privacy-sensitive actions

## Core Relationships

- A `User` can have many `UserApplication` records over time.
- A `Hackathon` can have many `UserApplication` records.
- A `Hackathon` can have many `Team` records.
- A `Team` can have many `TeamMember` records.
- A `Team` can have many `TeamJoinRequest` records.
- A `Team` can have zero or one active `Submission`.
- A `Submission` can have many `JudgeAssignment` records.
- A `Hackathon` can have many `EvaluationCriterion` records.
- A `Hackathon` can have many `Prize` records.
- A `Hackathon` can have many `PrizeEligibilitySnapshot` records.
- A `Prize` can have many `PrizeRedemption` records.

## Operational Rules

### Application And Team Formation

- Users register on the platform independently of any hackathon.
- Users can apply to a hackathon as individuals.
- Team creation is separate from hackathon application approval.
- Approved users can create teams and request to join open teams as soon as their hackathon application has been approved.
- Users can request to join open teams.
- Team admins approve or reject team join requests.

### Team Membership Constraints

- A user cannot belong to multiple teams in the same hackathon.
- Team formation is allowed while the hackathon is in `registration_open` or `submission_open`.
- After the submission window opens, users can still leave a team, join another existing team, or create a new team.
- After the submission window closes, no new teams can be created, including solo teams.
- A team creator becomes a team admin when the team is created.
- A team member cannot leave or be removed if that action would leave the team without an active team admin.
- After the submission window closes, a user can still leave their current team only if at least one active team member remains on the team.

### Judging

- Judging is blind with respect to team identity.
- Any actor reviewing through a judge assignment sees anonymized application information but not team identity.
- Hackathon admins and platform admins retain their normal admin visibility outside the judge review flow.
- Judging does not begin automatically when the submission window closes.
- A manual admin action starts judging preparation and locks submissions.
- A later manual admin action starts active judge review.
- Shortlist mode presents the current leaderboard before final adjustments.
- Shortlist data is computed ordered data, not a separate persisted shortlist structure.
- Hackathon admins can manually reorder the final ranking during shortlist mode without changing the underlying judge scores.
- Approved teams with no submission appear in a separate no-submission section in the hackathon dashboard.
- Prize-eligible team membership is frozen when judging preparation begins.

## Compliance

- The platform must support GDPR-compliant account deletion.
- The platform must retain the auditability needed for operational and legal review.
- Acceptance of platform registration documents, hackathon application terms, and winner terms must be recorded against the accepted document version.
