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
- Can delete their account, subject to GDPR-compliant handling.

Rules:

- A user with `is_platform_admin = true` is a platform admin.
- Platform admins can create hackathons.
- Platform admins can assign hackathon admins.
- Platform admins implicitly have hackathon-admin permissions in every hackathon.

### Hackathon

A single hackathon program with its own schedule, documents, roles, criteria, teams, submissions, and prizes.

Key characteristics:

- Multiple hackathons can exist in parallel.
- Each hackathon has its own registration window.
- Each hackathon has its own submission window.
- Each hackathon has a judging flow that is activated manually.
- Each hackathon can define a maximum team member limit.
- Each hackathon has hackathon-specific terms and conditions for applying and for winners.
- Shared platform documents such as the privacy policy are not hackathon-specific.

### HackathonRoleAssignment

A user-to-hackathon assignment that grants hackathon-specific access.

Hackathon roles:

- `participant`
- `judge`
- `hackathon_admin`

Rules:

- A user has at most one explicit hackathon role per hackathon.
- `hackathon_admin` includes judge permissions.
- A user with `is_platform_admin = true` includes hackathon-admin permissions and therefore judge permissions in every hackathon.
- Judges only see anonymized application information during judging.

### HackathonDocument

A document associated with a hackathon or with the platform globally.

Document categories:

- application terms and conditions
- winner terms and conditions
- shared platform documents such as privacy policy

Rules:

- Hackathon-specific terms must be versioned.
- User acceptance must reference the exact accepted version.

### UserApplication

A user-to-hackathon application record.

This is the canonical record that a user applied to participate in a specific hackathon.

Rules:

- A user can have at most one application per hackathon.
- Application approval is handled by hackathon admins.
- A user must be approved before creating or joining a team in that hackathon.
- Judges can see application information while team identity remains hidden.

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
- A team cannot exceed the maximum team member limit defined by its hackathon.
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

### Submission

A team-owned submission for a hackathon.

Key characteristics:

- Every submission belongs to a team.
- Solo participants still submit as a team.
- Teams can edit their submission only during the submission window.

Rules:

- Submission ownership is team-based, not user-based.
- When the judging preparation step begins, submissions are locked.
- Once locked, submissions can no longer be edited.
- Only a submission can receive an eligibility-related outcome.
- A submission can be marked with an evaluation outcome such as ineligible, disqualified, or withdrawn.
- A team with no submission is not eligible for judging, but this is represented by the absence of a submission rather than by a submission outcome.

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

- When judging preparation begins, submissions are distributed between judges as evenly as possible.
- Hackathon admins can reassign a submission only before its assigned judge has started review.
- Scoring data lives on `JudgeAssignment`.
- Judge-level ineligibility decisions also live on `JudgeAssignment`.
- A judge can mark a submission assignment as ineligible and provide a reason.
- A judge assignment records review progress such as `judge_started`, `judge_completed`, and `skipped`.
- A judge can skip an assignment if they do not want to review that submission.
- When an assignment is skipped, the submission is reassigned to another judge with the lowest number of assigned submissions.
- Hackathon admins and platform admins can revert a judge's ineligibility decision.
- Disqualification is an admin action.
- Withdrawal is a team-driven action before judging preparation begins.
- A hackathon admin or platform admin can mark a submission as withdrawn on behalf of the team when acting on a team request.
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

### PrizeRedemption

The record of how an awarded prize is redeemed.

Rules:

- Redemption can be digital or in person depending on the prize.
- Redemption requires the winner's legal name.
- Redemption requires acceptance of the winner terms and conditions.

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
- A `Team` can have zero or one active `Submission`.
- A `Submission` can have many `JudgeAssignment` records.
- A `Hackathon` can have many `EvaluationCriterion` records.
- A `Hackathon` can have many `Prize` records.
- A `Prize` can have many `PrizeRedemption` records.

## Operational Rules

### Application And Team Formation

- Users register on the platform independently of any hackathon.
- Users can apply to a hackathon as individuals.
- Team creation is separate from hackathon application approval.
- Users can create or join teams only after their hackathon application has been approved.
- Users can request to join open teams.
- Team admins approve or reject team join requests.

### Team Membership Constraints

- A user cannot belong to multiple teams in the same hackathon.
- After the submission window opens, users can still leave a team, join another existing team, or create a new team.
- After the submission window closes, no new teams can be created, including solo teams.
- After the submission window closes, a user can still leave their current team.

### Judging

- Judging is blind with respect to team identity.
- Judges see application information but not team identity.
- Judging does not begin automatically when the submission window closes.
- A manual admin action starts judging preparation and locks submissions.
- A later admin action starts active judge review.
- Shortlist mode presents the current leaderboard before final adjustments.
- Shortlist data is computed ordered data, not a separate persisted shortlist structure.
- Ties are resolved manually during shortlist mode by explicitly reordering submissions.
- Approved teams with no submission appear in a separate no-submission section in the hackathon dashboard.

## State Model

The hackathon lifecycle currently includes these business stages:

- registration
- submission
- judging preparation
- judge review
- shortlist
- winners announced
- completed

These labels define the business flow.

## Compliance

- The platform must support GDPR-compliant account deletion.
- The platform must retain the auditability needed for operational and legal review.
- Acceptance of hackathon-specific terms and winner terms must be recorded against the accepted document version.
