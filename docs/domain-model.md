# Domain Model

This document defines the canonical domain language for the Codex hackathon platform.

## Scope

The platform supports multiple hackathons running in parallel. Users have a platform account and can participate in one or more hackathons over time. Hackathons have their own team formation, submission, judging, winner selection, and prize redemption workflows.

## Core Entities

### User

A platform user with an account that exists independently from any specific hackathon.

Key characteristics:

- Can authenticate into the platform without registering for a hackathon.
- Can have one primary Auth0 subject plus additional linked Auth0 identities that all resolve to the same platform account.
- Can apply to hackathons.
- Can join at most one team per hackathon.
- Can be marked with `is_platform_admin`.
- Stores canonical `first_name` and `family_name` values used for profile management.
- Can optionally store a company, a bio, X, LinkedIn, and GitHub profile links, a ChatGPT email, an OpenAI org ID, a Luma email, a legacy Luma username, and a profile icon uploaded from account settings.
- Can delete their account, subject to GDPR-compliant handling.

Rules:

- Platform account provisioning happens only after the authenticated user accepts the current platform `privacy_policy` and `platform_terms` in the app-owned account-registration flow.
- Platform account registration can create the user before canonical `first_name` and `family_name` are filled. Those fields are completed through later profile or application flows.
- A platform user stores one primary Auth0 subject on the user record and can have additional linked Auth0 identities recorded separately.
- When an authenticated social identity must be linked to an existing platform account, the pre-link identity does not record platform-document acceptance. After linking, the existing platform account either proceeds immediately if current acceptance already exists or completes current platform consent through `/account/register`.
- Regular platform-user actor resolution uses the linked Auth0 identity records rather than only the primary Auth0 subject stored on the user row.
- Regular platform-user access requires current accepted versions of the platform `privacy_policy` and `platform_terms` in platform data.
- The reusable platform profile fields are managed from account settings.
- A user with `is_platform_admin = true` is a platform admin.
- Platform admins can create hackathons.
- Platform admins can grant platform-admin access to other active users.
- Granting platform-admin access also normalizes the user's explicit `hackathon_admin` assignment coverage across every hackathon.
- Hackathon admins and platform admins can assign staff, judges, and hackathon admins within their hackathons.
- Platform admins implicitly have hackathon-admin permissions in every hackathon.

### UserAuthIdentity

A linked Auth0 identity that resolves to one platform user.

Rules:

- Every active platform user has at least one `UserAuthIdentity`.
- A `UserAuthIdentity` stores one Auth0 subject.
- An Auth0 subject can belong to at most one platform user.
- A user can have multiple `UserAuthIdentity` records after account linking.
- When account linking succeeds, the linked Auth0 identities are recorded in platform data so future sessions from any linked login method resolve to the same platform user.

### Hackathon

A single hackathon program with its own schedule, documents, roles, criteria, teams, submissions, and prizes.

Key characteristics:

- Multiple hackathons can exist in parallel.
- Each hackathon can define a background image and a banner image.
- Each hackathon can define structured agenda items for public schedule display and admin editing.
- Each hackathon can define ordered submission tracks with a name and description.
- Each hackathon can be marked as an in-person event.
- Each hackathon can optionally reference a public Luma event URL.
- Each hackathon can optionally store a Luma event API ID used for operational sync.
- A configured Luma event API ID maps to at most one hackathon.
- Each hackathon has a city, country, and address.
- A hackathon street address is visible only in account-scoped hackathon workspace views for approved participants, judges, staff, hackathon admins, and platform admins.
- Each hackathon has its own registration window.
- Each hackathon has a registration flow that can be activated manually within its configured registration window.
- Each hackathon has its own submission window.
- Each hackathon has a submission flow that can be activated manually within its configured submission window.
- Each hackathon has a judging flow that is activated manually.
- Each hackathon must enable at least one judging stage.
- Each hackathon can require `0`, `1`, or `2` blind reviews per submitted project.
- Each hackathon can optionally enable a live pitch stage followed by a pitch review stage after blind review or as the only judging path.
- Each hackathon can configure blind-score and pitch-score weights. When both stages are enabled, the default weighting is `70%` blind score and `30%` pitch score.
- Each hackathon can configure how many top-ranked blind-review submissions appear in the default finalist boundary when `shortlist` begins. The default is `10`.
- Each pitch-enabled hackathon persists an ordered pitch presentation lineup and can expose one currently enabled live presentation at a time during the `pitch` stage.
- Each hackathon can define a maximum team member limit.
- Each hackathon can optionally define a participant approval limit used as an indicative planning target during admin review.
- Each hackathon can optionally reference a restricted Discord server URL.
- Each hackathon can require X, LinkedIn, and GitHub profiles, a ChatGPT email, an OpenAI org ID, and a Luma email, for registration.
- Each hackathon can require a `why this hackathon` response and proof-of-execution links in applications.
- Each hackathon can require submission summaries, repository URLs, and demo URLs in team project submissions.
- Each hackathon references its own application terms and winner terms.
- A configured Discord server URL is visible only in the account-scoped hackathon workspace for approved participants, judges, staff, hackathon admins, and platform admins.

### HackathonTrack

An ordered submission category belonging to one hackathon.

Rules:

- Each track belongs to exactly one hackathon.
- A track has a name and a description.
- Tracks are ordered for admin editing and public display.
- Tracks are visible on the public and account-scoped hackathon detail pages when configured.
- Tracks do not change judging assignment, scoring criteria, or blind-review behavior in this version.
- A track cannot be deleted once one or more submissions reference it.

### HackathonPhoto

A protected gallery image belonging to one hackathon.

Rules:

- Each photo belongs to exactly one hackathon.
- Each photo records the uploading user.
- Each photo stores canonical original-image metadata including file name, content type, width, height, and creation time.
- Each photo records whether it is visible in the public hackathon gallery.
- The account-scoped hackathon workspace exposes the photo gallery only to approved participants, judges, staff, hackathon admins, and platform admins.
- Approved participants have read-only access to the hackathon photo gallery.
- Judges, staff, hackathon admins, and platform admins can add, remove, and mark gallery photos for the public hackathon page.
- The public hackathon detail page exposes only the subset of gallery photos marked public for that hackathon.
- Photo delivery uses protected account-scoped routes for the private gallery and separate public routes for the public gallery subset.
- Preview images are derived from the stored original object and do not create a separate canonical domain entity.

### HackathonFeedback

An anonymous post-hackathon feedback submission belonging to one hackathon.

Rules:

- Each feedback submission belongs to exactly one hackathon.
- The public hackathon feedback route is `/hackathons/:slug/feedback`.
- The public feedback route is available only after the hackathon reaches `completed`.
- Each feedback topic records either a participant-selected `1..5` rating or an explicit `Not applicable` response when the participant did not directly experience that area.
- The canonical feedback topics are food, staff, organization, platform, judges, venue, participants and community, communication before the hackathon, communication during the hackathon, clarity and fairness of the rules, overall experience, schedule and pacing, technical setup, safety/accessibility/inclusion, and outcomes.
- A feedback submission can include one optional free-text comment.
- Feedback submissions are anonymous in product data and do not reference a user, application, or team.
- Anonymous feedback submission is protected by per-IP rate limiting rather than by account identity.
- The account-scoped hackathon workspace exposes feedback results to judges, staff, hackathon admins, and platform admins.
- Feedback reporting excludes `Not applicable` responses from per-question averages and exposes skipped-answer counts separately from rated counts.

### PlatformDocument

A platform-wide document used during platform account registration.

Current platform document types:

- `privacy_policy`
- `platform_terms`

Rules:

- Platform registration and re-consent use platform-wide documents only.
- The application-owned `/account/register` flow records exact accepted platform-document versions in product data.
- When `/account/register` is resolving an existing-account linking flow, platform-document acceptance is deferred until the linked platform account is known.
- Current acceptance of both platform documents is required for regular platform-user access.
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
- `staff`

Rules:

- A user has at most one explicit hackathon role per hackathon.
- Staff can see participant and team data for the hackathon but cannot perform admin operations.
- Every platform admin also has a `HackathonRoleAssignment` row with role `hackathon_admin` for every hackathon.
- `HackathonRoleAssignment` includes `is_in_judge_pool` to control automatic blind-review distribution and pitch-panel membership and `is_staff` to record staff designation.
- A user with role `judge` must be in the automatic judge distribution pool and must not be marked as staff.
- A user with role `staff` must be marked as staff and must not be in the automatic judge distribution pool.
- A user with role `hackathon_admin` can be in or out of the automatic judge distribution pool and can be in or out of staff designation.
- Only a user with role `hackathon_admin` can combine admin access with judging participation and/or staff designation.
- The account-scoped hackathon workspace publishes a judge roster and a staff roster derived from `HackathonRoleAssignment`.
- The published judge roster includes explicit `judge` assignments plus `hackathon_admin` assignments with `is_in_judge_pool = true`.
- The published staff roster includes explicit `staff` assignments plus `hackathon_admin` assignments with `is_staff = true`.
- Published judge and staff rosters are visible to any platform user who can access that hackathon in the account-scoped workspace.
- Published roster cards expose only profile icon, full name, company, bio, and optional X, LinkedIn, and GitHub profile links.
- Any actor performing a blind judge review sees the blind judging view rather than the admin view.
- The blind judging view includes anonymized application information and excludes team identity.
- Any actor performing a pitch review sees the open pitch judging view rather than the blind judging view.
- The open pitch judging view includes project name, team name, and full submission detail.

### UserApplication

A user-to-hackathon application record.

This is the canonical record that a user applied to participate in a specific hackathon.

Rules:

- A user can have at most one application per hackathon.
- The public registration route is an application-entry flow only. Once a user has an application for a hackathon, ongoing status and participation workflow continue in the account-scoped hackathon workspace rather than in the public registration route.
- Application approval is handled by hackathon admins.
- A participant can withdraw their own application while they do not have an active team membership in that hackathon.
- A hackathon admin or platform admin can manually withdraw a submitted or approved application on behalf of the participant.
- Admin review uses a staged pre-approval decision (`approved` or `rejected`) that is persisted until explicitly applied.
- Applying staged decisions updates final application outcomes and enqueues participant-facing approval or rejection emails.
- If the hackathon requires a Luma email and has a Luma event API ID, application submission verifies that the participant's saved Luma email is registered as a guest on that Luma event.
- If the hackathon requires a Luma email and has a Luma event API ID, applying staged decisions also enqueues a Luma guest-status sync for the final approval or rejection.
- If the hackathon requires a Luma email and has a Luma event API ID, participant withdrawal and admin-managed withdrawal both enqueue the canonical Luma rejection sync so the user is removed from the event guest list.
- Platform admins can run a hackathon-scoped operational backfill route to resolve stored legacy Luma usernames into canonical Luma emails for already-registered users.
- A user must be approved before creating or joining a team in that hackathon.
- Withdrawal ends participation eligibility for the hackathon, including in-person attendance eligibility when applicable.
- Withdrawal retains the application record for auditability, exact-version terms acceptance, and operational history. It does not hard-delete the application.
- Admin-managed withdrawal removes the participant from any active team in that hackathon when the team can remain valid.
- If admin-managed withdrawal targets the last active member of a team, or the last active admin of a team, the withdrawal dismantles that team.
- Admin-managed withdrawal is blocked if dismantling the participant's team would affect an active draft, submitted, or locked submission.
- Blind judging uses application information without exposing team identity.
- User application acceptance references the exact application terms version accepted for that hackathon.
- A user can submit a `UserApplication` only if the user profile satisfies that hackathon's required profile rules.
- If a hackathon is marked as an in-person event, a user application requires explicit commitment to attend in person on the hackathon date in that city and country after approval.
- A user application records a registration team-intent hint: `solo`, `team`, or `unknown`.
- When the registration team-intent hint is `team`, the user application can include free-form teammate hints captured during application (name/family-name and/or email per hinted member).
- A user application can include a free-form `why this hackathon` response.
- A user application can include one or more proof-of-execution links.
- If the hackathon requires motivation, the `why this hackathon` response must be non-empty.
- If the hackathon requires proof of execution, at least one proof-of-execution link must be non-empty and every provided link must use `http` or `https`.
- A `UserApplication` can persist a Luma sync outcome of `not_synced`, `approve_synced`, `reject_synced`, `approve_failed`, or `reject_failed`.
- `not_synced` is used only for hackathons where Luma sync is enabled.
- A `UserApplication` can record `checkedInAt` when a valid signed Luma guest check-in update confirms the approved participant attended the hackathon.
- Luma attendance sync is sticky in this version. Once `checkedInAt` is recorded, later Luma uncheck changes do not clear it.

### Team

A team within a single hackathon. Solo participation is modeled as a one-member team.

Key characteristics:

- A team belongs to exactly one hackathon.
- A team can be created after approval.
- A team can optionally publish a short bio about the team.
- A team can be open to join requests.
- A team can have one or more admins.
- The participant workspace distinguishes solo participation from a regular team workspace even though both use the same team and team-membership model.

Rules:

- Team membership is hackathon-scoped.
- A user can belong to at most one team per hackathon.
- The user who creates a team becomes a team admin automatically.
- An approved participant without an active team uses a no-team workspace that offers explicit actions to participate as solo or create a team.
- Participating as solo creates a persisted one-member team in solo workspace mode using the default solo team name for that participant.
- A participant in a solo workspace must leave that solo team before creating or joining another team.
- A team in solo workspace mode remains a normal team for invariants, submissions, and join requests.
- A solo workspace becomes a regular team workspace once the team gains another active member.
- Every active team must always have at least one active team admin.
- A team with no active members is dissolved. Dissolved teams are retained for auditability and historical references but are no longer available in team-formation workflows.
- A team is also dissolved when an admin-managed application withdrawal removes the last active member, or removes the last active admin and therefore leaves no valid active-admin configuration.
- Admin-managed application withdrawal cannot dissolve a team while the team still has an active draft, submitted, or locked submission.
- A team cannot exceed the maximum team member limit defined by its hackathon.
- A team with pending join requests can approve them only while the team remains open to join requests.
- Team admins can update the team profile, review join requests, approve members, promote other active members to team admin, and remove members.
- Workspace users can browse active teams throughout the hackathon workspace.
- Users can request to join open teams only while the hackathon allows team formation.
- Team rename updates the team slug to a new unique slug derived from the current team name.

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
- A submission can reference one track from its hackathon.
- Team admins create and manage the submission on behalf of the team.
- Team admins can create the first submission draft during the submission window and can continue editing an existing draft or submitted submission until that submission is locked for judging.
- After a hackathon is completed, team admins of non-winning locked submissions can opt into public project publishing for that submission.

Rules:

- Submission ownership is team-based, not user-based.
- When a hackathon has one or more configured tracks, every submission must select exactly one track from that hackathon.
- A submission must include a non-empty summary only when its hackathon requires submission summaries.
- A submission must include a valid repository URL only when its hackathon requires repository URLs.
- A submission must include a valid demo URL only when its hackathon requires demo URLs.
- When blind review begins, or when the live pitch stage begins in a pitch-only hackathon, submitted submissions are locked.
- Once locked, submissions can no longer be edited.
- A submission can be marked with workflow outcomes such as withdrawn or disqualified.
- Public project publishing is submission-scoped, not team-scoped.
- Public project publishing is available only after `completed`, only for locked non-winning submissions, and only when a team admin opts in.
- A team with no submission is not eligible for judging, but this is represented by the absence of a submission rather than by a submission outcome.
- A draft submission that is never submitted is treated as no submission for judging and dashboard purposes.
- Blind judging includes the selected track because track membership is part of the submission itself and does not reveal team identity.
- Pitch judging exposes the project and team identity because finalists present live.

### EvaluationCriterion

A scoring dimension configured per hackathon.

Rules:

- Each criterion belongs to one hackathon.
- Criteria are used for blind review only.
- Each criterion can have a weight.
- Each criterion score uses the shared `1..5` score scale.
- Blind assignment scores are derived from criterion scores and criterion weights and are normalized to the shared `1..5` score scale.

### JudgeAssignment

A review assignment connecting one submission to one judge within a hackathon.

Relationship rules:

- A submission can have `0`, `1`, or `2` blind review assignments depending on its hackathon configuration.
- A submission that advances to pitch review in a pitch-enabled hackathon can have one pitch review assignment for every judge in the frozen pitch panel.
- Each judge assignment belongs to exactly one submission.
- Each judge assignment belongs to exactly one user acting as judge.
- Each judge assignment belongs to one review stage: `blind_review` or `pitch_review`.

Operational rules:

- When blind review begins, submitted submissions are locked, prize eligibility is frozen, and submissions are distributed between users in the automatic judge distribution pool as evenly as possible until every locked submission has the configured number of blind review assignments.
- Blind review assignments for the same submission must belong to different judges.
- During the live `pitch` stage, admins advance the ordered pitch presentation lineup one team at a time.
- During the live `pitch` stage, a hackathon can expose at most one currently enabled finalist presentation.
- When pitch review begins, one pitch review assignment is created for every submission that advanced through the pitch stage and every judge in the frozen pitch panel.
- The pitch panel is frozen from the active judge roster when pitch review begins.
- Hackathon admins can reassign a blind review assignment only before its assigned judge has started review.
- Blind scoring data lives on `JudgeAssignment` through criterion scores.
- A started blind review can persist partial criterion scores before completion.
- Pitch scoring data lives on `JudgeAssignment` as a pitch score and optional pitch comment.
- Judge-level ineligibility decisions also live on `JudgeAssignment`.
- A judge can mark a submission assignment as ineligible and provide a reason.
- A judge assignment records review progress such as `judge_started`, `judge_completed`, and `skipped`.
- A judge can skip an assignment if they do not want to review that submission.
- A hackathon admin or platform admin can force an in-progress assignment to `skipped` if the assigned judge cannot complete the review.
- When a blind review assignment is skipped, the submission is reassigned to another judge with the lowest number of blind review assignments.
- When a pitch review assignment is skipped or left incomplete at pitch-review close, that assignment is excluded from pitch-score averaging.
- Pitch review cannot close until at least one pitch review assignment reaches `judge_completed`.
- Hackathon admins and platform admins can revert a judge's ineligibility decision.
- Disqualification is an admin action.
- Withdrawal is a team-driven action until submitted work is locked for judging.
- A hackathon admin or platform admin can mark a submission as withdrawn on behalf of the team when acting on a team request.
- The admin-withdraw request identifies the requesting user through `requestedByUserId`, and that user must be an active team admin of the submission's team.
- Teams can continue to revise or withdraw submitted work during `judging_preparation` until blind review starts, or until `pitch` starts in a pitch-only hackathon.
- Once blind review, pitch, or pitch review begins, removal from competition is handled as disqualification rather than withdrawal.

### HackathonCreditOffer

A hackathon-scoped credit offer that approved participants can claim.

Examples:

- OpenAI credits
- Sentry credits
- A second or third uploaded batch of the same provider under a distinct offer name

Rules:

- Hackathon credits are separate from prizes and are not part of winner selection.
- Each credit offer belongs to exactly one hackathon.
- A credit offer has a participant-facing name and markdown description.
- A hackathon can define multiple credit offers.
- Hackathon admins and platform admins can append inventory to an existing credit offer over time.
- A credit offer can remain available as long as it has unclaimed inventory.

### HackathonCreditCode

An uploaded redeemable value belonging to one hackathon credit offer.

Rules:

- Each credit code belongs to exactly one credit offer.
- A credit code stores one redeemable value, which can be a code or a URL.
- A credit code is either unclaimed or permanently assigned to one participant.
- Only approved participants can claim hackathon credits.
- A participant can claim at most one credit code from a given credit offer.
- Claiming a credit code permanently reveals that assigned value to the participant on later visits.

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
- A `Hackathon` can have many `HackathonTrack` records.
- A `Hackathon` can have many `Team` records.
- A `Team` can have many `TeamMember` records.
- A `Team` can have many `TeamJoinRequest` records.
- A `Team` can have zero or one active `Submission`.
- A `Submission` can have many `JudgeAssignment` records.
- A `Submission` can reference zero or one `HackathonTrack`.
- A `Hackathon` can have many `EvaluationCriterion` records.
- A `Hackathon` can have many `HackathonCreditOffer` records.
- A `HackathonCreditOffer` can have many `HackathonCreditCode` records.
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
- During `registration_open` or `submission_open`, a team member can leave a team if another active team admin remains or if that member is the last active member of a team with no active draft, submitted, or locked submission.
- Leaving the last active member dissolves the team and closes any outstanding join requests for that team.
- A team member cannot leave or be removed if that action would leave remaining active members without an active team admin.
- After the submission window closes, a user can still leave their current team only if at least one active team member remains on the team.

### Judging

- Blind review is blind with respect to team identity.
- Any actor reviewing through a blind judge assignment sees anonymized application information and the selected submission track, but not team identity.
- Any actor reviewing through a pitch judge assignment sees project name, team name, full submission detail, and any other finalist-visible context exposed for the pitch stage.
- Hackathon admins and platform admins retain their normal admin visibility outside the judge review flow.
- Judging does not begin automatically when the submission window closes.
- A manual admin action stops submissions and starts judging preparation without locking submitted work yet.
- A later manual admin action starts blind review when blind review is enabled. That transition locks the submitted projects, freezes prize eligibility, and creates blind assignments.
- `shortlist` exists only when blind review and pitch review are both enabled.
- `shortlist` presents the blind-review ordering by default and later uses the persisted full shortlist order after admins save it.
- Entering `shortlist` shows the top-ranked blind-review submissions as the default finalist boundary up to the hackathon's configured shortlist finalist count until admins save the shortlist.
- The leading submissions in the saved shortlist order are the persisted finalists for the live pitch stage.
- Final deliberation starts from combined-score order until admins explicitly save a final ranking or announce winners.
- Pitch-only hackathons skip `shortlist`. Starting `pitch` locks the submitted projects, freezes prize eligibility, and sends those newly locked submissions directly into the persisted pitch presentation lineup.
- Finalist identity remains hidden during `shortlist`.
- A later manual admin action starts `pitch`, which is the live finalist presentation stage, freezes the ordered pitch lineup, and does not create judge assignments.
- Starting `pitch` from `shortlist` notifies every active member of each finalist team that the team has been shortlisted.
- From `pitch` onward, a participant can see shortlist status for that participant's own team in the account overview and workspace when the team advanced.
- During `pitch`, admins explicitly enable each presentation in lineup order.
- A later manual admin action starts `pitch_review`, which is allowed only after the full live pitch lineup has been completed and then creates the post-pitch judge assignments for finalists.
- `final_deliberation` is the universal ranking-review stage after all enabled scoring stages are complete.
- Hackathon admins can manually reorder the final ranking during `final_deliberation` without changing the underlying judge scores.
- Final score is computed from the enabled judging stages only.
- Blind score is the average of completed blind review assignments after criterion-weight normalization to `1..5`.
- Pitch score is the average of submitted pitch-review votes on the same `1..5` scale.
- When blind review and pitch review are both enabled, final score uses configurable blind and pitch weights that default to `70%` blind and `30%` pitch.
- When only one judging stage is enabled, final score comes entirely from that stage.
- Pitch review can be closed by admins with missing votes, and the pitch average uses only submitted pitch-review votes.
- Announcing winners notifies the frozen prize-eligible members of every winning team.
- Completing the hackathon reveals the public and account-scoped winners showcase, which groups each winning project with its prizes, project links, and the published winning-team roster.
- Approved teams with no submission appear in a separate no-submission section in the hackathon dashboard.
- Prize-eligible team membership is frozen when submitted projects are locked for judging.

### Hackathon Credits

- Hackathon credits are participant benefits, not winner prizes.
- Hackathon credits do not depend on winner announcement or prize-redemption workflow.
- Only approved participants can claim hackathon credits.
- A participant can claim at most one uploaded value from each credit offer.

## Compliance

- The platform must support GDPR-compliant account deletion.
- The platform must retain the auditability needed for operational and legal review.
- Acceptance of platform registration documents, hackathon application terms, and winner terms must be recorded against the accepted document version.
