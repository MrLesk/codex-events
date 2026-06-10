# Domain Model

This document defines the canonical domain language for the Codex event platform.

## Scope

The platform supports multiple typed events running in parallel. Users have a platform account and can participate in one or more events over time.

Supported event types are:

- `hackathon`: a competition event with team formation, submissions, judging, winner selection, prizes, and completed project showcases.
- `meetup`: a registration-only community event.
- `build`: a registration-only community build event.

Meetups and Builds use the same application, review, attendance, Luma sync, profile requirement, optional event-terms acceptance, participant-limit, and event-credit model as Hackathons. They do not expose team formation, submissions, judging, prizes, winners, or competition lifecycle actions.

## Core Entities

### User

A platform user with an account that exists independently from any specific event.

Key characteristics:

- Can authenticate into the platform without registering for an event.
- Can have one primary Auth0 subject plus additional linked Auth0 identities that all resolve to the same platform account.
- Can apply to events.
- Can join at most one team per Hackathon event.
- Can be marked with `is_platform_admin`.
- Can be marked with `is_event_organizer`.
- Stores canonical `first_name` and `family_name` values used for profile management.
- Can optionally store a company, a bio, X, LinkedIn, and GitHub profile links, a ChatGPT email, an OpenAI org ID, a Luma email, a legacy Luma username, and a profile icon uploaded from account settings.
- Can delete their account, subject to GDPR-compliant handling.

Rules:

- Platform account provisioning happens only after the authenticated user accepts the current platform `privacy_policy` and `platform_terms` in the app-owned account-registration flow.
- Platform account registration requires an authenticated identity with an email address and an `email_verified` claim of `true`.
- Platform account registration can create the user before canonical `first_name` and `family_name` are filled. Those fields are completed through later profile or application flows.
- A platform user stores one primary Auth0 subject on the user record and can have additional linked Auth0 identities recorded separately.
- When Auth0 links an authenticated social identity to an existing platform account, the pre-link identity does not record platform-document acceptance. After linking, Auth0 issues the session for the primary identity and the existing platform account either proceeds immediately if current acceptance already exists or completes current platform consent through `/account/register`.
- Regular platform-user actor resolution uses the linked Auth0 identity records rather than only the primary Auth0 subject stored on the user row.
- Regular platform-user access requires current accepted versions of the platform `privacy_policy` and `platform_terms` in platform data.
- The reusable platform profile fields are managed from account settings.
- A user with `is_platform_admin = true` is a platform admin.
- A user with `is_event_organizer = true` is an event organizer.
- Platform admins can create events.
- Event organizers can create events.
- Event-organizer status grants event creation access only. It does not grant admin visibility or admin operations for events the user does not manage.
- Platform admins can grant platform-admin access to other active users.
- Platform admins can remove platform-admin access from active users.
- Platform admins can grant event-organizer access to other active users.
- Platform admins can remove event-organizer access from active users.
- Granting platform-admin access also normalizes the user's explicit `event_admin` assignment coverage across every event.
- Removing platform-admin access clears only the user's platform-admin status and does not remove existing `EventRoleAssignment` rows.
- Event admins and platform admins can assign staff and event admins within their events.
- Event admins and platform admins can assign judges within Hackathon events.
- Platform admins implicitly have event-admin permissions in every event.

### UserAuthIdentity

A linked Auth0 identity that resolves to one platform user.

Rules:

- Every active platform user has at least one `UserAuthIdentity`.
- A `UserAuthIdentity` stores one Auth0 subject.
- An Auth0 subject can belong to at most one platform user.
- A user can have multiple `UserAuthIdentity` records after account linking.
- When account linking succeeds, the linked Auth0 identities are recorded in platform data so future sessions from any linked login method resolve to the same platform user.

### Event

A single program with its own schedule, application flow, documents, roles, and event-type-specific operational model.

Key characteristics:

- Multiple events can exist in parallel.
- Each event has an `eventType` of `hackathon`, `meetup`, or `build`.
- Each event can define an event-specific background image and a banner image.
- An event-specific background image overrides the platform default event background image.
- When an event has no event-specific background image, event detail backgrounds use the platform default event background image when one is configured, even if the event has a banner image.
- Event cards can present the event banner before the effective background image.
- Each event can define structured agenda items for public schedule display and admin editing.
- Each event can be marked as an in-person event.
- Each event can optionally reference a public Luma event URL.
- Each event can optionally store a Luma event API ID and event-specific Luma API key used for operational sync.
- Each event stores its Luma webhook ID, signing secret, status, registration time, and concise registration error when webhook setup has been attempted.
- A configured Luma event API ID maps to at most one event.
- Each event has a city, country, and address.
- An event street address is visible only in account-scoped event workspace views for approved participants, judges, staff, event admins, and platform admins.
- Each event has its own registration window.
- Each event has a registration flow that can be activated manually within its configured registration window.
- Each event can optionally define a participant approval limit used as an indicative planning target during admin review and as the capacity boundary for automatic approval.
- Each event can approve new participant applications automatically after required submission checks pass while approved participation is below the participant approval limit when one is configured.
- Each event can optionally reference a restricted Discord server URL.
- Each event has a fixed application field configuration. First name and family name are always visible and required. Event admins can mark X, LinkedIn, GitHub, ChatGPT email, OpenAI org ID, `why this event`, proof-of-execution links, participation mode, and AI Knowledge as visible or hidden.
- When Luma Sync is enabled for an event, Luma email is visible and required during registration so the platform can match Codex participants with Luma guests.
- Each visible application field can be optional or required. A field cannot be required while hidden.
- AI Knowledge is optional by default when visible. Event admins can require it when they need every applicant to self-assess AI agent experience as Beginner, Intermediate, or Advanced.
- The current application field configuration applies when a participant views or submits the form. Changing the configuration does not rewrite existing application records.
- Each event can optionally reference event-specific application terms.
- A configured Discord server URL is visible only in the account-scoped event workspace for approved participants, judges, staff, event admins, and platform admins.
- Each event can define credit offers with uploaded redeemable values for approved participants.
- Hackathon and Build events can define ordered tracks with a participant-facing name, description, and resource links.

Hackathon-only characteristics:

- A Hackathon has its own submission window and submission flow.
- A Hackathon uses tracks as submission categories.
- A Hackathon has a judging flow that is activated manually.
- A Hackathon must enable at least one judging stage.
- A Hackathon can require `0`, `1`, or `2` blind reviews per submitted project.
- A Hackathon can optionally enable a live pitch stage followed by a pitch review stage after blind review or as the only judging path.
- A Hackathon can configure blind-score and pitch-score weights. When both stages are enabled, the default weighting is `70%` blind score and `30%` pitch score.
- A Hackathon can configure how many top-ranked blind-review submissions appear in the default finalist boundary when `shortlist` begins. The default is `10`.
- A pitch-enabled Hackathon persists an ordered pitch presentation lineup and can expose one currently enabled live presentation at a time during the `pitch` stage.
- A Hackathon can define a maximum team member limit.
- A Hackathon can require submission summaries, repository URLs, and demo URLs in team project submissions.
- A Hackathon references winner terms for prize redemption.

Meetup and Build rules:

- Meetups and Builds use only `draft`, `registration_open`, and `completed`.
- Meetups and Builds can approve, reject, and withdraw applications through the shared `UserApplication` model.
- Approved applications represent participation directly.
- Build tracks organize participant-visible resource links and do not create submission, judging, or outcome workflows.
- Meetups and Builds do not create teams, submissions, judging assignments, prizes, winner records, or completed competition outcomes.
- Competition-only APIs and UI surfaces are unavailable for Meetups and Builds.

### EventTrack

An ordered participant-facing category belonging to one Hackathon or Build event.

Rules:

- Each track belongs to exactly one Hackathon or Build event.
- A track has a name and a description.
- A track can include zero or more resources.
- Each track resource has a title, an `http` or `https` link, and an optional description.
- Tracks are ordered for admin editing and public display.
- Tracks are visible on the public and account-scoped event detail pages when configured.
- Hackathon tracks are available as submission choices.
- Build tracks are resource groups for participants.
- Tracks do not change judging assignment, scoring criteria, or blind-review behavior in this version.
- A track cannot be deleted once one or more submissions reference it.

### EventPhoto

A protected gallery image belonging to one event.

Rules:

- Each photo belongs to exactly one event.
- Each photo records the uploading user.
- Each photo stores canonical original-image metadata including file name, content type, width, height, and creation time.
- Each photo records whether it is visible in the public event gallery.
- The account-scoped event workspace exposes the photo gallery only to approved participants, judges, staff, event admins, and platform admins.
- Approved participants have read-only access to the event photo gallery.
- Judges, staff, event admins, and platform admins can add, remove, and mark gallery photos for the public event page.
- The public event detail page exposes only the subset of gallery photos marked public for that event.
- Photo delivery uses protected account-scoped routes for the private gallery and separate public routes for the public gallery subset.
- Preview images are derived from the stored original object and do not create a separate canonical domain entity.

### EventFeedback

An anonymous post-event feedback submission belonging to one event.

Rules:

- Each feedback submission belongs to exactly one event.
- The public event feedback route is `/events/:slug/feedback`.
- The public feedback route is available only after the event reaches `completed`.
- Each feedback topic records either a participant-selected `1..5` rating or an explicit `Not applicable` response when the participant did not directly experience that area.
- Feedback questions are selected from platform-defined defaults by event type, not configured per individual event.
- Hackathon feedback covers communication, organization, venue, food, technical setup, platform experience, staff support, team formation and community, event rules, judging, schedule and pacing, safety/accessibility/inclusion, outcomes, and overall experience.
- Meetup feedback covers communication, organization, venue, food, room and AV setup, platform experience, staff support, networking and community, event expectations, talks and sessions, schedule and pacing, safety/accessibility/inclusion, value for the participant's goals, and overall experience.
- Build feedback covers communication, organization, venue, food, technical setup, platform experience, staff support, builder community, participation guidance, mentor or expert support, schedule and pacing, safety/accessibility/inclusion, progress toward the participant's goals, and overall experience.
- A feedback submission can include one optional free-text comment.
- Feedback submissions are anonymous in product data and do not reference a user, application, or team.
- Anonymous feedback submission is protected by per-IP rate limiting rather than by account identity.
- The account-scoped event workspace exposes feedback results to judges, staff, event admins, and platform admins.
- Feedback reporting excludes `Not applicable` responses from per-question averages and exposes skipped-answer counts separately from rated counts.

### PlatformDocument

A platform-wide document used during platform account registration.

Current platform document types:

- `privacy_policy`
- `platform_terms`

Rules:

- Platform registration and re-consent use platform-wide documents only.
- The public Privacy Policy and Terms pages render the current platform document version for their document type.
- The application-owned `/account/register` flow records exact accepted platform-document versions in product data.
- When Auth0 account linking resolves an existing platform account, platform-document acceptance is evaluated on the linked platform account.
- Current versions of both platform documents must exist before regular account registration and regular platform-user consent can complete.
- The configured first platform admin can create the initial platform account before current platform documents exist so they can publish legal settings, the Privacy Policy, and Platform Terms from platform settings.
- The initial setup account still requires current platform-document acceptance before regular account and event workflows are available.
- Current acceptance of both platform documents is required for regular platform-user access.
- Platform documents are versioned.
- Platform admins publish new platform document versions. Published versions are retained for exact-version acceptance history.

### PlatformLegalSettings

Deployment-owned legal notice and contact settings for the platform operator.

Key characteristics:

- Stores the support email, imprint content, and timestamps.
- Has one current settings record per deployment.
- Is separate from versioned platform documents.

Rules:

- Public imprint content and public legal-contact routing use `PlatformLegalSettings`.
- Operator details, legal notice text, privacy contact details, DSA contact points, platform purpose, editorial focus, and jurisdiction-specific disclosures belong in the imprint content.
- Privacy Policy and Platform Terms pages render their current `PlatformDocument` content and do not read legal settings metadata.
- Platform admins can update legal settings.
- Platform admins can update legal settings during first-run setup before current platform documents exist or have been accepted.
- Updating legal settings does not create a new platform-document version and does not require renewed user consent.
- If legal settings are not configured, public legal-contact behavior is explicitly unavailable rather than falling back to repository-owned operator details.

### PlatformSettings

Deployment-wide platform presentation defaults.

Key characteristics:

- Stores the default event background image URL and timestamps.
- Has one current settings record per deployment.
- Is separate from event-owned image fields.

Rules:

- Platform admins can upload or remove the default event background image.
- The default event background image is a managed JPEG or PNG upload stored in the existing event images bucket.
- Events keep their own `backgroundImageUrl` as the event-specific stored image value.
- Event read payloads expose `displayBackgroundImageUrl` as the effective background image for display. It equals the event-specific background image when present and otherwise equals the platform default event background image when configured.
- Public event background image routes serve only event-specific uploaded background images, not the platform default image.

### EventTermsDocument

A versioned terms document belonging to a specific event.

Document types:

- `application_terms`
- `winner_terms`

Rules:

- An event can optionally reference one current application terms document.
- Hackathon events reference one current winner terms document for prize redemption.
- Meetup and Build events do not use winner terms.
- Event applications require event-specific application terms acceptance only when the event references a current application terms document.
- Prize redemption uses the current winner terms document for that Hackathon event.
- User acceptance must reference the exact accepted document version.

### EventRoleAssignment

A user-to-event assignment that grants event-specific access.

Event roles:

- `event_admin`
- `judge`
- `staff`

Rules:

- A user has at most one explicit event role per event.
- Staff can see participant and team data for the event but cannot perform admin operations.
- Every platform admin also has a `EventRoleAssignment` row with role `event_admin` for every event.
- When an event organizer creates an event, the creator receives a `EventRoleAssignment` row with role `event_admin` for that event.
- A user can also be appointed as an `event_admin` for an event by an existing event admin or platform admin.
- Event-admin access is scoped to the event named by the assignment. Being an event admin for one event does not grant admin visibility or admin operations for other events.
- Event organizers and event admins can still apply to and participate in other events where they do not hold event-admin access.
- `EventRoleAssignment` includes `is_in_judge_pool` to control automatic blind-review distribution and pitch-panel membership and `is_staff` to record staff designation.
- Judge assignments and `is_in_judge_pool` are available only for Hackathon events.
- A user with role `judge` must be in the automatic judge distribution pool and must not be marked as staff.
- A user with role `staff` must be marked as staff and must not be in the automatic judge distribution pool.
- A user with role `event_admin` can be in or out of the automatic judge distribution pool and can be in or out of staff designation.
- Only a user with role `event_admin` can combine admin access with judging participation and/or staff designation.
- The account-scoped event workspace publishes a judge roster and a staff roster derived from `EventRoleAssignment`.
- The published judge roster includes explicit `judge` assignments plus `event_admin` assignments with `is_in_judge_pool = true`.
- The published staff roster includes explicit `staff` assignments plus `event_admin` assignments with `is_staff = true`.
- Published judge and staff rosters are visible to any platform user who can access that event in the account-scoped workspace.
- Published roster cards expose only profile icon, full name, company, bio, and optional X, LinkedIn, and GitHub profile links.
- Any actor performing a blind judge review sees the blind judging view rather than the admin view.
- The blind judging view includes anonymized application information and excludes team identity.
- Any actor performing a pitch review sees the open pitch judging view rather than the blind judging view.
- The open pitch judging view includes project name, team name, and full submission detail.

### UserApplication

A user-to-event application record.

This is the canonical record that a user applied to participate in a specific event.

Rules:

- A user can have at most one application per event.
- The public registration route is an application-entry flow only. Once a user has an application for an event, ongoing status and participation workflow continue in the account-scoped event workspace rather than in the public registration route.
- Application approval is handled by event admins.
- When an event auto-approves applications, new applications are approved immediately after all required submission checks pass while approved participation is below the participant approval limit when one is configured.
- When automatic approval reaches a configured participant approval limit, later applications remain submitted for admin review.
- A participant can withdraw their own application while they do not have an active Hackathon team membership in that event.
- An event admin or platform admin can manually withdraw a submitted or approved application on behalf of the participant.
- An event admin or platform admin can restore a withdrawn application while registration is open. The restored application follows the same post-registration outcome rules as a new registration: automatic approval applies when configured and capacity is available, otherwise the application returns to submitted review.
- Admin review uses a staged pre-approval decision (`approved` or `rejected`) that is persisted until explicitly applied.
- Applying staged decisions updates final application outcomes and enqueues participant-facing approval or rejection emails.
- Event admins and platform admins can apply staged approvals above the participant approval limit.
- Auto-approved applications enqueue the same participant-facing approval email as manually approved applications.
- If the event shows and requires a Luma email and has configured Luma sync, application submission verifies that the participant's saved Luma email is registered as a guest on that Luma event.
- If the event auto-approves applications and shows and requires a Luma email with configured Luma sync, application submission also enqueues a Luma approval sync.
- If the event shows and requires a Luma email and has configured Luma sync, applying staged decisions also enqueues a Luma guest-status sync for the final approval or rejection.
- If the event shows and requires a Luma email and has configured Luma sync, participant withdrawal and admin-managed withdrawal both enqueue the canonical Luma rejection sync so the user is removed from the event guest list.
- If a valid signed Luma guest update says the participant is no longer going, the matching submitted or approved application is withdrawn through the admin-managed withdrawal behavior.
- Platform admins can run an event-scoped operational backfill route to resolve stored legacy Luma usernames into canonical Luma emails for already-registered users.
- In Hackathon events, a user must be approved before creating or joining a team in that event.
- In Meetup and Build events, an approved application is the participant's event access record.
- Withdrawal ends participation eligibility for the event, including in-person attendance eligibility when applicable.
- Withdrawal retains the application record for auditability, event-terms acceptance when present, and operational history. It does not hard-delete the application.
- Admin-managed withdrawal removes the participant from any active team in that event when the team can remain valid.
- If admin-managed withdrawal targets the last active member of a team, or the last active admin of a team, the withdrawal dismantles that team.
- Admin-managed withdrawal is blocked if dismantling the participant's team would affect an active draft, submitted, or locked submission.
- Restoring a withdrawn application does not restore team membership, dissolved teams, or closed join requests created by the withdrawal.
- Blind judging uses application information without exposing team identity.
- When the event has current application terms, user application acceptance references the exact application terms version accepted for that event.
- A user can submit a `UserApplication` only if the user profile satisfies the event's currently visible required profile fields.
- If an event is marked as an in-person event, a user application requires explicit commitment to attend in person on the event date in that city and country after approval.
- A user application records a registration team-intent hint only when participation mode is visible. The hint is `solo`, `team`, or `unknown`.
- When participation mode is visible and the registration team-intent hint is `team`, the user application can include free-form teammate hints captured during application (name/family-name and/or email per hinted member).
- A user application can include a free-form `why this event` response only when that field is visible.
- A user application can include one or more proof-of-execution links only when that field is visible.
- A user application can include an AI Knowledge level only when that field is visible.
- If visible participation mode is required, the user must choose `solo` or `team`.
- If visible motivation is required, the `why this event` response must be non-empty.
- If visible proof of execution is required, at least one proof-of-execution link must be non-empty and every provided link must use `http` or `https`.
- If visible AI Knowledge is required, the user must choose Beginner, Intermediate, or Advanced.
- A `UserApplication` can persist a Luma sync outcome of `not_synced`, `approve_synced`, `reject_synced`, `approve_failed`, or `reject_failed`.
- `not_synced` is used only for events where Luma sync is enabled.
- A `UserApplication` can record `checkedInAt` when a valid signed Luma guest check-in update confirms the approved participant attended the event.
- Luma attendance sync is sticky in this version. Once `checkedInAt` is recorded, later Luma uncheck changes do not clear it.
- An event admin or platform admin can override attendance for an approved application by marking the participant joined or not joined. The override records the acting admin and time, wins over the Luma check-in in both directions, and repeating the active decision clears it back to the Luma default.
- Effective attendance is the admin override when present, otherwise the recorded Luma check-in.

### Participation Certificate

A public, shareable record that an approved participant attended an event.

Key characteristics:

- A participation certificate exists for every approved user application with effective attendance on a publicly visible event whose participant account is active.
- The certificate is derived state computed from the event, user, application, and Hackathon submission records. It is not stored as a separate entity.
- The certificate names the participant using the canonical first and family name, with the display name used while canonical name fields are empty.
- The certificate date is the earliest agenda item start when the event has agenda items, otherwise the submission window start, formatted in UTC.
- A Hackathon certificate names the track of the participant team's `submitted` or `locked` submission when that submission has a track. A Build certificate names the event track only when the Build has exactly one configured track. Meetup certificates do not name a track.
- A completed Hackathon's certificate also names the participant team, the submitted project, the team's final placement, and the prize names the team won, resolved from the competition outcome model. These outcome details never appear before the event is `completed`, matching public winner visibility.
- Certificates with a top-three placement present gold, silver, or bronze trophy treatments on the certificate card and the social-preview image.
- The certificate ID is derived from the event type, city, certificate date, and participant name, with the user application identifier as the fallback for names without usable characters.
- The certificate page at `/events/:slug/:userId`, its JSON read, and its social-preview image are public. PDF and image downloads are offered on the page only to authenticated sessions, and the PDF read requires one.
- The certificate page is the live verification record for the certificate. The PDF embeds a QR code that resolves back to that page, and the page exposes schema.org structured data describing the credential.
- A participant can hide their own certificate from their account event workspace and make it public again. Hidden certificates respond not found on every public certificate read, and the admin Certificates tab marks them as hidden by the participant.

### Team

A team within a single Hackathon event. Solo participation is modeled as a one-member team.

Key characteristics:

- A team belongs to exactly one Hackathon event.
- A team can be created after approval.
- A team can optionally publish a short bio about the team.
- A team can be open to join requests.
- A team can have one or more admins.
- The participant workspace distinguishes solo participation from a regular team workspace even though both use the same team and team-membership model.

Rules:

- Team membership is event-scoped.
- A user can belong to at most one team per event.
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
- A team cannot exceed the maximum team member limit defined by its event.
- A team with pending join requests can approve them only while the team remains open to join requests.
- Team admins can update the team profile, review join requests, approve members, promote other active members to team admin, and remove members.
- Workspace users can browse active teams throughout the event workspace.
- Users can request to join open teams only while the event allows team formation.
- Team rename updates the team slug to a new unique slug derived from the current team name.

### TeamMember

The membership record connecting a user to a team.

Rules:

- This is a many-to-many relationship between users and teams over the lifetime of the platform.
- Within a single event, a user can have at most one active team membership.
- Team-level permissions are modeled on this record.

Team member roles:

- `member`
- `admin`

### TeamJoinRequest

A request from an approved user to join an open team in a Hackathon event.

Rules:

- A team join request belongs to one user and one team.
- A team join request can be created only while the event allows team formation.
- Team admins can approve or reject a join request.
- Approval requires an approved `UserApplication`.
- Approval requires that the user is not already a member of another team in the same event.
- Approval requires that the team has available capacity.
- Approval requires that the team is still open to join requests.

### Submission

A team-owned submission for a Hackathon event.

Key characteristics:

- Every submission belongs to a team.
- Solo participants still submit as a team.
- A submission can reference one track from its event.
- Team admins create and manage the submission on behalf of the team.
- Team admins can create the first submission draft during the submission window and can continue editing an existing draft or submitted submission until that submission is locked for judging.
- After a Hackathon is completed, team admins of non-winning locked submissions can opt into public project publishing for that submission.

Rules:

- Submission ownership is team-based, not user-based.
- When a Hackathon has one or more configured tracks, every submission must select exactly one track from that event.
- A submission must include a non-empty summary only when its event requires submission summaries.
- A submission must include a valid repository URL only when its event requires repository URLs.
- A submission must include a valid demo URL only when its event requires demo URLs.
- When blind review begins, or when the live pitch stage begins in a pitch-only event, submitted submissions are locked.
- Once locked, submissions can no longer be edited.
- A submission can be marked with workflow outcomes such as withdrawn or disqualified.
- Public project publishing is submission-scoped, not team-scoped.
- Public project publishing is available only after `completed`, only for locked non-winning submissions, and only when a team admin opts in.
- A team with no submission is not eligible for judging, but this is represented by the absence of a submission rather than by a submission outcome.
- A draft submission that is never submitted is treated as no submission for judging and dashboard purposes.
- Blind judging includes the selected track because track membership is part of the submission itself and does not reveal team identity.
- Pitch judging exposes the project and team identity because finalists present live.

### EvaluationCriterion

A scoring dimension configured per event.

Rules:

- Each criterion belongs to one event.
- Criteria are used for blind review only.
- Each criterion can have a weight.
- Each criterion score uses the shared `1..5` score scale.
- Blind assignment scores are derived from criterion scores and criterion weights and are normalized to the shared `1..5` score scale.

### JudgeAssignment

A review assignment connecting one submission to one judge within a Hackathon event.

Relationship rules:

- A submission can have `0`, `1`, or `2` blind review assignments depending on its event configuration.
- A submission that advances to pitch review in a pitch-enabled event can have one pitch review assignment for every judge in the frozen pitch panel.
- Each judge assignment belongs to exactly one submission.
- Each judge assignment belongs to exactly one user acting as judge.
- Each judge assignment belongs to one review stage: `blind_review` or `pitch_review`.

Operational rules:

- When blind review begins, submitted submissions are locked, prize eligibility is frozen, and submissions are distributed between users in the automatic judge distribution pool as evenly as possible until every locked submission has the configured number of blind review assignments.
- Blind review assignments for the same submission must belong to different judges.
- During the live `pitch` stage, admins advance the ordered pitch presentation lineup one team at a time.
- During the live `pitch` stage, a Hackathon can expose at most one currently enabled finalist presentation.
- When pitch review begins, one pitch review assignment is created for every submission that advanced through the pitch stage and every judge in the frozen pitch panel.
- The pitch panel is frozen from the active judge roster when pitch review begins.
- Event admins can reassign a blind review assignment only before its assigned judge has started review.
- Blind scoring data lives on `JudgeAssignment` through criterion scores.
- A started blind review can persist partial criterion scores before completion.
- Pitch scoring data lives on `JudgeAssignment` as a pitch score and optional pitch comment.
- Judge-level ineligibility decisions also live on `JudgeAssignment`.
- A judge can mark a submission assignment as ineligible and provide a reason.
- A judge assignment records review progress such as `judge_started`, `judge_completed`, and `skipped`.
- A judge can skip an assignment if they do not want to review that submission.
- An event admin or platform admin can force an in-progress assignment to `skipped` if the assigned judge cannot complete the review.
- When a blind review assignment is skipped, the submission is reassigned to another judge with the lowest number of blind review assignments.
- When a pitch review assignment is skipped or left incomplete at pitch-review close, that assignment is excluded from pitch-score averaging.
- Pitch review cannot close until at least one pitch review assignment reaches `judge_completed`.
- Event admins and platform admins can revert a judge's ineligibility decision.
- Disqualification is an admin action.
- Withdrawal is a team-driven action until submitted work is locked for judging.
- An event admin or platform admin can mark a submission as withdrawn on behalf of the team when acting on a team request.
- The admin-withdraw request identifies the requesting user through `requestedByUserId`, and that user must be an active team admin of the submission's team.
- Teams can continue to revise or withdraw submitted work during `judging_preparation` until blind review starts, or until `pitch` starts in a pitch-only event.
- Once blind review, pitch, or pitch review begins, removal from competition is handled as disqualification rather than withdrawal.

### EventCreditOffer

An event-scoped credit offer that approved participants can claim.

Examples:

- OpenAI credits
- Sentry credits
- A second or third uploaded batch of the same provider under a distinct offer name

Rules:

- Event credits are separate from prizes and are not part of winner selection.
- Each credit offer belongs to exactly one event.
- A credit offer has a participant-facing name and markdown description.
- An event can define multiple credit offers.
- Event admins and platform admins can append inventory to an existing credit offer over time.
- A credit offer can remain available as long as it has unclaimed inventory.

### EventCreditCode

An uploaded redeemable value belonging to one event credit offer.

Rules:

- Each credit code belongs to exactly one credit offer.
- A credit code stores one redeemable value, which can be a code or a URL.
- A credit code is either unclaimed or permanently assigned to one participant.
- Only approved participants can claim event credits.
- A participant can claim at most one credit code from a given credit offer.
- Claiming a credit code permanently reveals that assigned value to the participant on later visits.

### Prize

A prize configuration defined per event.

Examples:

- Team-ranked API credit prizes
- Benefits granted to all members of the top N teams
- Digital-only prizes with no physical fulfillment

Rules:

- Prize structures are event-specific.
- A Hackathon can define multiple prize rules.
- Prize eligibility can be team-based or member-based depending on the prize configuration.
- Prize-eligible team membership is frozen when the event enters `judging_preparation`.

### PrizeEligibilitySnapshot

A frozen record of the team members eligible for member-scoped prizes.

Rules:

- Prize eligibility snapshots are created when the event enters `judging_preparation`.
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
- A `Event` can have many `UserApplication` records.
- A `Event` can have many `EventTrack` records.
- A `Event` can have many `Team` records.
- A `Team` can have many `TeamMember` records.
- A `Team` can have many `TeamJoinRequest` records.
- A `Team` can have zero or one active `Submission`.
- A `Submission` can have many `JudgeAssignment` records.
- A `Submission` can reference zero or one `EventTrack`.
- A `Event` can have many `EvaluationCriterion` records.
- A `Event` can have many `EventCreditOffer` records.
- A `EventCreditOffer` can have many `EventCreditCode` records.
- A `Event` can have many `Prize` records.
- A `Event` can have many `PrizeEligibilitySnapshot` records.
- A `Prize` can have many `PrizeRedemption` records.

## Operational Rules

### Application And Team Formation

- Users register on the platform independently of any event.
- Users can apply to an event as individuals.
- Team creation is separate from event application approval.
- In Hackathon events, approved users can create teams and request to join open teams as soon as their event application has been approved.
- In Meetup and Build events, approval grants event participation without team formation.
- Users can request to join open teams.
- Team admins approve or reject team join requests.

### Team Membership Constraints

- A user cannot belong to multiple teams in the same event.
- Team formation is allowed while the event is in `registration_open` or `submission_open`.
- After the submission window opens, users can still leave a team, join another existing team, or create a new team.
- After the submission window closes, no new teams can be created, including solo teams.
- A team creator becomes a team admin when the team is created.
- During `registration_open` or `submission_open`, a team member can leave a team if another active team admin remains or if that member is the last active member of a team with no active draft, submitted, or locked submission.
- Leaving the last active member dissolves the team and closes any outstanding join requests for that team.
- A team member cannot leave or be removed if that action would leave remaining active members without an active team admin.
- After the submission window closes, a user can still leave their current team only if at least one active team member remains on the team.

### Judging

Judging applies only to Hackathon events.

- Blind review is blind with respect to team identity.
- Any actor reviewing through a blind judge assignment sees anonymized application information and the selected submission track, but not team identity.
- Any actor reviewing through a pitch judge assignment sees project name, team name, full submission detail, and any other finalist-visible context exposed for the pitch stage.
- Event admins and platform admins retain their normal admin visibility outside the judge review flow.
- Judging does not begin automatically when the submission window closes.
- A manual admin action stops submissions and starts judging preparation without locking submitted work yet.
- A later manual admin action starts blind review when blind review is enabled. That transition locks the submitted projects, freezes prize eligibility, and creates blind assignments.
- `shortlist` exists only when blind review and pitch review are both enabled.
- `shortlist` presents the blind-review ordering by default and later uses the persisted full shortlist order after admins save it.
- Entering `shortlist` shows the top-ranked blind-review submissions as the default finalist boundary up to the event's configured shortlist finalist count until admins save the shortlist.
- The leading submissions in the saved shortlist order are the persisted finalists for the live pitch stage.
- Final deliberation starts from combined-score order until admins explicitly save a final ranking or announce winners.
- Pitch-only events skip `shortlist`. Starting `pitch` locks the submitted projects, freezes prize eligibility, and sends those newly locked submissions directly into the persisted pitch presentation lineup.
- Finalist identity remains hidden during `shortlist`.
- A later manual admin action starts `pitch`, which is the live finalist presentation stage, freezes the ordered pitch lineup, and does not create judge assignments.
- Starting `pitch` from `shortlist` notifies every active member of each finalist team that the team has been shortlisted.
- From `pitch` onward, a participant can see shortlist status for that participant's own team in the account overview and workspace when the team advanced.
- During `pitch`, admins explicitly enable each presentation in lineup order.
- A later manual admin action starts `pitch_review`, which is allowed only after the full live pitch lineup has been completed and then creates the post-pitch judge assignments for finalists.
- `final_deliberation` is the universal ranking-review stage after all enabled scoring stages are complete.
- Event admins can manually reorder the final ranking during `final_deliberation` without changing the underlying judge scores.
- Final score is computed from the enabled judging stages only.
- Blind score is the average of completed blind review assignments after criterion-weight normalization to `1..5`.
- Pitch score is the average of submitted pitch-review votes on the same `1..5` scale.
- When blind review and pitch review are both enabled, final score uses configurable blind and pitch weights that default to `70%` blind and `30%` pitch.
- When only one judging stage is enabled, final score comes entirely from that stage.
- Pitch review can be closed by admins with missing votes, and the pitch average uses only submitted pitch-review votes.
- Announcing winners notifies the frozen prize-eligible members of every winning team.
- Completing the event reveals the public and account-scoped winners showcase, which groups each winning project with its prizes, project links, and the published winning-team roster.
- Approved teams with no submission appear in a separate no-submission section in the event dashboard.
- Prize-eligible team membership is frozen when submitted projects are locked for judging.

### Event Credits

- Event credits are participant benefits, not winner prizes.
- Event credits do not depend on winner announcement or prize-redemption workflow.
- Event admins and platform admins can manage event credits for any event type.
- Only approved participants can claim event credits.
- Approved participants see event credits in the account event workspace only when uploaded credit inventory exists for the event.
- A participant can claim at most one uploaded value from each credit offer.

## Compliance

- The platform must support GDPR-compliant account deletion.
- The platform must retain the auditability needed for operational and legal review.
- Acceptance of platform registration documents, event application terms when present, and winner terms must be recorded against the accepted document version.
