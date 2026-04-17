# Schema Outline

This document defines the canonical schema outline for the Codex hackathon platform.

It describes the intended persistent model at the level of entities, key fields, enums, constraints, and important relationships. It does not define SQL syntax.

## Conventions

- Every primary entity uses a stable `id`.
- Foreign keys use `<entity>_id`.
- Lifecycle values use explicit enums rather than free-form strings.
- Derived leaderboard and dashboard views are computed from persisted data rather than stored as separate canonical entities unless explicitly stated.

## User

### Key Fields

- `id`
- `auth0_subject`
- `email`
- `display_name`
- `first_name`
- `family_name`
- `company`
- `bio`
- `is_platform_admin`
- `x_profile_url`
- `linkedin_profile_url`
- `github_profile_url`
- `chatgpt_email`
- `openai_org_id`
- `luma_email`
- `luma_username`
- `profile_icon_updated_at`
- `created_at`
- `updated_at`
- `deleted_at`

### Constraints

- `auth0_subject` is unique among active users.
- `email` is unique among active users.

### Notes

- `auth0_subject` stores the primary Auth0 subject for the platform user.
- `first_name` and `family_name` are the canonical user-name fields managed by account profile flows and can remain blank immediately after platform account registration.
- `company` stores an optional single-line company or affiliation value managed from account settings.
- `bio` stores an optional free-form profile summary managed from account settings.
- `display_name` stores the current presentation name. It is derived from canonical name fields after profile completion and can temporarily fall back to authenticated-identity presentation data before canonical names are filled.
- `luma_email` stores the canonical Luma email used for hackathon profile requirements and Luma approval-state synchronization.
- `deleted_at` supports GDPR-compliant account lifecycle handling.
- `is_platform_admin` replaces a separate platform role entity.
- `profile_icon_updated_at` records when the current profile icon object was last replaced.
- Platform actor resolution uses `UserAuthIdentity` records so multiple linked Auth0 subjects can resolve to the same user.
- `luma_username` is retained only as legacy migration data for users who registered before Luma email became the canonical profile field.

## UserAuthIdentity

### Key Fields

- `id`
- `user_id`
- `auth0_subject`
- `created_at`

### Constraints

- `auth0_subject` is unique.

### Notes

- Each row links one Auth0 subject to one platform user.
- Every active user has at least one `UserAuthIdentity`.
- Linked-login flows add additional `UserAuthIdentity` rows for the same `user_id`.
- Soft-deleting a user removes that user's `UserAuthIdentity` rows.

## Hackathon

### Key Fields

- `id`
- `name`
- `slug`
- `description`
- `agenda_items_json`
- `background_image_url`
- `banner_image_url`
- `discord_server_url`
- `luma_event_url`
- `luma_event_api_id`
- `city`
- `country`
- `address`
- `registration_opens_at`
- `registration_closes_at`
- `submission_opens_at`
- `submission_closes_at`
- `state`
- `blind_review_count`
- `pitch_review_enabled`
- `blind_score_weight_percent`
- `pitch_score_weight_percent`
- `shortlist_finalist_count`
- `pitch_finalist_submission_ids_json`
- `active_pitch_presentation_submission_id`
- `pitch_presentations_completed_at`
- `final_ranking_submission_ids_json`
- `max_team_members`
- `participants_limit`
- `in_person_event`
- `require_x_profile`
- `require_linkedin_profile`
- `require_github_profile`
- `require_chatgpt_email`
- `require_openai_org_id`
- `require_luma_profile`
- `require_why_this_hackathon`
- `require_proof_of_execution`
- `require_submission_summary`
- `require_submission_repository_url`
- `require_submission_demo_url`
- `current_application_terms_document_id`
- `current_winner_terms_document_id`
- `created_by_user_id`
- `created_at`
- `updated_at`

### Enums

- `state`
  - `draft`
  - `registration_open`
  - `submission_open`
  - `judging_preparation`
  - `blind_review`
  - `shortlist`
  - `pitch`
  - `pitch_review`
  - `final_deliberation`
  - `winners_announced`
  - `completed`

### Constraints

- `slug` is unique.
- `luma_event_api_id` is unique when present.
- `blind_review_count` is `0`, `1`, or `2`.
- `blind_score_weight_percent` is null or between `0` and `100`.
- `pitch_score_weight_percent` is null or between `0` and `100`.
- At least one judging stage is enabled: `blind_review_count > 0` or `pitch_review_enabled = true`.
- When blind review and pitch review are both enabled, `blind_score_weight_percent + pitch_score_weight_percent = 100`.
- `max_team_members` is greater than or equal to 1.
- `participants_limit` is null or greater than or equal to 1.
- `registration_opens_at < registration_closes_at <= submission_opens_at < submission_closes_at`

### Notes

- `registration_open` is manually activated by an admin while the configured registration window is open.
- `submission_open` is manually activated by an admin within the configured submission window.
- `blind_review_count` controls how many blind review assignments each locked submission receives.
- `pitch_review_enabled` controls whether the hackathon uses the optional live pitch stage plus the post-pitch review stage.
- `blind_score_weight_percent` and `pitch_score_weight_percent` default to `70` and `30` when both blind review and pitch review are enabled.
- `shortlist_finalist_count` defaults to `10` and controls how many top-ranked blind-review submissions appear in the default finalist boundary when `shortlist` begins.
- When only one judging stage is enabled, final score is derived entirely from that stage.
- `pitch_finalist_submission_ids_json` stores the ordered pitch presentation lineup for pitch-enabled hackathons. In blind-plus-pitch hackathons it is selected during `shortlist`. In pitch-only hackathons it is populated from all eligible locked submissions when `pitch` starts.
- `active_pitch_presentation_submission_id` stores the submission currently enabled to present during the live `pitch` stage, or null when the lineup has not started or is already complete.
- `pitch_presentations_completed_at` records when the full live pitch lineup was completed and gates the transition into `pitch_review`.
- `final_ranking_submission_ids_json` stores the full saved shortlist order when `shortlist` is used and is later updated by any explicit final-ranking reorder recorded during `final_deliberation`.
- `participants_limit` is an indicative planning target surfaced in admin approval workflows and does not enforce approval writes by itself.
- `in_person_event` controls whether applications must include explicit in-person attendance commitment.
- `require_why_this_hackathon` controls whether applications must include a non-empty `whyThisHackathon` response.
- `require_proof_of_execution` controls whether applications must include at least one proof link in `proofOfExecutionUrl`.
- `require_submission_summary` controls whether team submissions must include a non-empty `summary`.
- `require_submission_repository_url` controls whether team submissions must include a valid `repository_url`.
- `require_submission_demo_url` controls whether team submissions must include a valid `demo_url`.
- `address` is always stored for the hackathon, but public serializers suppress it and account-scoped detail reads return it only to approved participants plus judges, staff, hackathon admins, and platform admins.
- `discord_server_url` is optional because not every hackathon has a dedicated Discord server, and when present it is returned only in account-scoped detail reads for approved participants plus judges, staff, hackathon admins, and platform admins.
- `luma_event_url` is optional because not every hackathon has a public Luma event page to link.
- `luma_event_api_id` is optional because not every hackathon has a Luma event configured for approval and rejection sync.
- `agenda_items_json` stores a validated ordered JSON array of agenda items (`id`, `startsAt`, optional `endsAt`, `title`, optional `details`, `displayOrder`).

## HackathonTrack

### Key Fields

- `id`
- `hackathon_id`
- `name`
- `description`
- `display_order`
- `created_at`

### Constraints

- `unique (hackathon_id, display_order)`

### Notes

- Each track belongs to one hackathon.
- Tracks are ordered for admin editing and public display.
- A track stores a participant-facing name and description.
- Tracks do not control judge assignment in this version.
- Track deletion is blocked once submissions reference it.

## HackathonRoleAssignment

### Key Fields

- `id`
- `hackathon_id`
- `user_id`
- `role`
- `is_in_judge_pool`
- `is_staff`
- `created_at`

### Enums

- `role`
  - `hackathon_admin`
  - `judge`
  - `staff`

### Constraints

- `unique (hackathon_id, user_id)`
- `role = judge` requires `is_in_judge_pool = true and is_staff = false`
- `role = staff` requires `is_staff = true and is_in_judge_pool = false`

### Notes

- Every platform admin also has a `hackathon_admin` assignment row for each hackathon.
- `is_in_judge_pool` controls automatic blind-review distribution and pitch-panel membership.
- `is_staff` records staff designation for the assignment.
- `hackathon_admin` can set `is_in_judge_pool` and `is_staff` independently.
- Non-admin `staff` and `judge` assignments remain distinct.

## PlatformDocument

### Key Fields

- `id`
- `document_type`
- `version`
- `title`
- `content`
- `published_at`
- `created_at`

### Enums

- `document_type`
  - `privacy_policy`
  - `platform_terms`

### Constraints

- `unique (document_type, version)`

## UserPlatformDocumentAcceptance

### Key Fields

- `id`
- `user_id`
- `platform_document_id`
- `accepted_at`

### Constraints

- `unique (user_id, platform_document_id)`

### Notes

- This stores which exact platform document version the user accepted during registration-related flows.

## HackathonTermsDocument

### Key Fields

- `id`
- `hackathon_id`
- `document_type`
- `version`
- `title`
- `content`
- `published_at`
- `created_at`

### Enums

- `document_type`
  - `application_terms`
  - `winner_terms`

### Constraints

- `unique (hackathon_id, document_type, version)`

## UserApplication

### Key Fields

- `id`
- `hackathon_id`
- `user_id`
- `status`
- `submitted_at`
- `withdrawn_at`
- `checked_in_at`
- `reviewed_at`
- `reviewed_by_user_id`
- `pre_approval_status`
- `luma_sync_status`
- `application_terms_document_id`
- `application_terms_accepted_at`
- `registration_details_json`
- `created_at`
- `updated_at`

### Enums

- `status`
  - `submitted`
  - `approved`
  - `rejected`
  - `withdrawn`
- `pre_approval_status`
  - `approved`
  - `rejected`
- `luma_sync_status`
  - `not_synced`
  - `approve_synced`
  - `reject_synced`
  - `approve_failed`
  - `reject_failed`

### Constraints

- `unique (hackathon_id, user_id)`

### Notes

- `registration_details_json` stores registration-intent hints as a JSON string payload:
  - `teamIntent`: `solo`, `team`, or `unknown`
  - `teamMembers`: free-form teammate hints captured during application (name/family-name and/or email)
  - `inPersonAttendanceCommitment`: boolean commitment required when the hackathon has `in_person_event = true`
  - `whyThisHackathon`: trimmed free-form motivation text
  - `proofOfExecutionUrl`: optional string carrying one or more comma-separated `http` or `https` links to prior execution evidence
- `withdrawn_at` records when the participant withdrew from the hackathon.
- `checked_in_at` records when a valid signed Luma guest check-in update first marked the approved participant as attended.
- `pre_approval_status` stores a staged admin review decision that is applied later to transition the canonical `status`.
- `luma_sync_status` tracks the queued Luma approval or rejection sync outcome for hackathons that require a Luma email and define a `luma_event_api_id`.
- `checked_in_at` is sticky in this version and is not cleared by later Luma uncheck updates.
- Withdrawal retains the application record rather than deleting it so participation history, terms acceptance, and audit context remain available.

## Team

### Key Fields

- `id`
- `hackathon_id`
- `name`
- `bio`
- `slug`
- `workspace_mode`
- `is_open_to_join_requests`
- `created_by_user_id`
- `created_at`
- `updated_at`

### Enums

- `workspace_mode`
  - `solo`
  - `team`

### Constraints

- `unique (hackathon_id, slug)`

### Notes

- A solo participant is still represented by a `Team`.
- `workspace_mode` controls whether a one-member team renders as a compact solo workspace or a regular team workspace.
- A team in `solo` workspace mode still uses the normal team, membership, join-request, and submission model.
- A team in `solo` workspace mode becomes a regular team workspace when it gains another active member.
- `bio` stores an optional multiline introduction for the team.
- Team formation is allowed during `registration_open` and `submission_open`.
- Team slug is generated from the current team name plus a random 4-digit suffix. Renaming a team regenerates the slug.

## TeamMember

### Key Fields

- `id`
- `team_id`
- `user_id`
- `role`
- `joined_at`
- `left_at`
- `created_at`

### Enums

- `role`
  - `member`
  - `admin`

### Constraints

- Only one active team membership per user in the same hackathon.
- Only one active membership per `(team_id, user_id)`.
- Every team that still has active members must have at least one active admin membership.
- A team can have zero active members only when it is dissolved during `registration_open` or `submission_open` after its last active member leaves without an active draft, submitted, or locked submission.

## TeamJoinRequest

### Key Fields

- `id`
- `team_id`
- `user_id`
- `status`
- `requested_at`
- `reviewed_at`
- `reviewed_by_user_id`
- `created_at`

### Enums

- `status`
  - `pending`
  - `approved`
  - `rejected`
  - `canceled`

### Constraints

- Only one active pending join request per `(team_id, user_id)`.

### Notes

- Approval requires the team to remain open to join requests.
- Approval requires the user to have an approved `UserApplication`.

## Submission

### Key Fields

- `id`
- `team_id`
- `status`
- `project_name`
- `summary`
- `repository_url`
- `demo_url`
- `track_id`
- `submitted_at`
- `locked_at`
- `withdrawn_at`
- `disqualified_at`
- `created_at`
- `updated_at`

### Enums

- `status`
  - `draft`
  - `submitted`
  - `withdrawn`
  - `locked`
  - `disqualified`

### Constraints

- At most one active submission per team.

### Notes

- A team can also have no submission.
- `track_id` references a `HackathonTrack` belonging to the same hackathon as the submission's team when a track is selected.
- When a hackathon has one or more configured tracks, submissions must store exactly one valid `track_id`.
- `summary`, `repository_url`, and `demo_url` are optional at rest and are enforced according to the owning hackathon's submission requirement flags.
- Existing draft and submitted submissions remain mutable during `judging_preparation` until the submission is locked for judging.
- `locked_at` records when blind review starts, or when `pitch` starts in a pitch-only hackathon.
- A draft that is never submitted is treated as no submission for judging and dashboard purposes.
- Submission content is managed by team admins.

## EvaluationCriterion

### Key Fields

- `id`
- `hackathon_id`
- `name`
- `description`
- `weight`
- `display_order`
- `created_at`

### Constraints

- `weight` is non-negative.
- `display_order` is unique within a hackathon.

### Notes

- Criteria apply to blind review only.
- Blind assignment totals are normalized to the shared `1..5` score scale by dividing the weighted score sum by the total criterion weight.

## JudgeAssignment

### Key Fields

- `id`
- `hackathon_id`
- `submission_id`
- `judge_user_id`
- `review_stage`
- `blind_review_slot`
- `status`
- `pitch_score`
- `pitch_comment`
- `assigned_at`
- `started_at`
- `completed_at`
- `skipped_at`
- `skipped_by_user_id`
- `skip_reason`
- `ineligibility_status`
- `ineligibility_reason`
- `ineligibility_marked_at`
- `ineligibility_marked_by_user_id`
- `created_at`

### Enums

- `review_stage`
  - `blind_review`
  - `pitch_review`
- `status`
  - `assigned`
  - `judge_started`
  - `judge_completed`
  - `skipped`
- `ineligibility_status`
  - `eligible`
  - `ineligible`

### Constraints

- `blind_review_slot` is `1` or `2` for `blind_review` assignments and null for `pitch_review` assignments.
- At most one active blind-review assignment exists for a given `(submission_id, blind_review_slot)`.
- At most one pitch-review assignment exists for a given `(submission_id, judge_user_id)`.

### Notes

- A skipped assignment remains part of the audit trail.
- Blind-review assignments store criterion scores through `JudgeCriterionScore`.
- Started blind-review assignments can store a partial set of criterion scores before completion.
- Pitch-review assignments store `pitch_score` and `pitch_comment` directly on the assignment.
- A completed pitch-review assignment uses the shared `1..5` score scale.
- A submission's blind score is the average of its completed blind-review assignments after score normalization.
- A submission's pitch score is the average of submitted completed pitch-review assignments.
- When a blind-review assignment is skipped, a new active assignment is created for another judge.
- Admins can force an in-progress assignment to `skipped`.

## JudgeCriterionScore

### Key Fields

- `id`
- `judge_assignment_id`
- `evaluation_criterion_id`
- `score`
- `comment`
- `created_at`
- `updated_at`

### Constraints

- `unique (judge_assignment_id, evaluation_criterion_id)`
- `score` is an integer between `0` and `10`

### Notes

- Criterion scores live under `JudgeAssignment`, not on `Submission`.
- Criterion scores are recorded only for `blind_review` assignments.
- Partial blind-review criterion scores can exist while the assignment remains `judge_started`.

## Prize

### Key Fields

- `id`
- `hackathon_id`
- `name`
- `description`
- `reward_type`
- `reward_value`
- `reward_currency`
- `award_scope`
- `rank_start`
- `rank_end`
- `created_at`

### Enums

- `reward_type`
  - `api_credits`
  - `subscription`
  - `physical`
  - `other`
- `award_scope`
  - `team`
  - `member`

### Notes

- A prize can target one rank or a rank range.
- Different hackathons can configure different prize structures.
- Member-scoped prize eligibility is determined from the frozen prize eligibility snapshot created when submitted work is locked for judging.

## HackathonCreditOffer

### Key Fields

- `id`
- `hackathon_id`
- `name`
- `description`
- `display_order`
- `created_at`
- `updated_at`

### Notes

- A credit offer belongs to one hackathon.
- A credit offer is separate from winner prizes.
- A hackathon can define multiple credit offers.
- A credit offer stores participant-facing markdown copy and ordering only. Uploaded redeemable values live on `HackathonCreditCode`.

## HackathonCreditCode

### Key Fields

- `id`
- `credit_offer_id`
- `value`
- `claimed_by_user_id`
- `claimed_at`
- `created_at`

### Constraints

- `claimed_by_user_id` is null or references one `User`.
- At most one row per `(credit_offer_id, claimed_by_user_id)` when `claimed_by_user_id` is not null.

### Notes

- Each row stores one uploaded redeemable value, which can be a code or a URL.
- Unclaimed rows are available inventory for the credit offer.
- Claiming permanently assigns one uploaded value to one participant.
- Only approved participants can claim from a credit offer.

## PrizeEligibilitySnapshot

### Key Fields

- `id`
- `hackathon_id`
- `team_id`
- `user_id`
- `snapshot_at`
- `created_at`

### Notes

- This captures the active team members eligible for member-scoped prizes when prize eligibility is frozen.

## PrizeRedemption

### Key Fields

- `id`
- `prize_id`
- `user_id`
- `team_id`
- `status`
- `legal_name`
- `winner_terms_document_id`
- `winner_terms_accepted_at`
- `redeemed_at`
- `created_at`
- `updated_at`

### Enums

- `status`
  - `pending`
  - `redeemed`
  - `failed`

### Notes

- Some prizes may redeem per team and some per user.
- Redemption requires legal name and acceptance of winner terms.

## AuditLog

### Key Fields

- `id`
- `actor_user_id`
- `entity_type`
- `entity_id`
- `action`
- `metadata`
- `created_at`

### Notes

- The audit log captures sensitive or operationally important actions.

## Important Relationship Summary

- `Hackathon` belongs to `User` through `created_by_user_id`
- `HackathonRoleAssignment` belongs to `Hackathon` and `User`
- `HackathonTrack` belongs to `Hackathon`
- `PlatformDocument` stands alone as a platform-wide document
- `UserPlatformDocumentAcceptance` belongs to `User` and `PlatformDocument`
- `HackathonTermsDocument` belongs to `Hackathon`
- `UserApplication` belongs to `Hackathon` and `User`
- `Team` belongs to `Hackathon`
- `TeamMember` belongs to `Team` and `User`
- `TeamJoinRequest` belongs to `Team` and `User`
- `Submission` belongs to `Team`
- `Submission` may reference `HackathonTrack`
- `EvaluationCriterion` belongs to `Hackathon`
- `JudgeAssignment` belongs to `Hackathon`, `Submission`, and `User`
- `JudgeCriterionScore` belongs to `JudgeAssignment` and `EvaluationCriterion`
- `HackathonCreditOffer` belongs to `Hackathon`
- `HackathonCreditCode` belongs to `HackathonCreditOffer` and may reference the claiming `User`
- `Prize` belongs to `Hackathon`
- `PrizeEligibilitySnapshot` belongs to `Hackathon`, `Team`, and `User`
- `PrizeRedemption` belongs to `Prize` and may reference `User` and `Team`
- `AuditLog` references the acting `User` and the affected entity

## Derived Views

These are computed from persisted data and do not require separate canonical entities:

- blind judging submission view
- pitch judging submission view
- leaderboard
- final score breakdown
- no-submission team section
- published judge roster
- published staff roster
