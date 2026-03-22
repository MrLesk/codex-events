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
- `email`
- `display_name`
- `is_platform_admin`
- `x_profile_url`
- `linkedin_profile_url`
- `github_profile_url`
- `created_at`
- `updated_at`
- `deleted_at`

### Constraints

- `email` is unique among active users.

### Notes

- `deleted_at` supports GDPR-compliant account lifecycle handling.
- `is_platform_admin` replaces a separate platform role entity.

## Hackathon

### Key Fields

- `id`
- `name`
- `slug`
- `description`
- `background_image_url`
- `banner_image_url`
- `city`
- `address`
- `registration_opens_at`
- `registration_closes_at`
- `submission_opens_at`
- `submission_closes_at`
- `state`
- `max_team_members`
- `require_x_profile`
- `require_linkedin_profile`
- `require_github_profile`
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
  - `judge_review`
  - `shortlist`
  - `winners_announced`
  - `completed`

### Constraints

- `slug` is unique.
- `max_team_members` is greater than or equal to 1.
- `registration_opens_at < registration_closes_at <= submission_opens_at < submission_closes_at`

### Notes

- `registration_open` is system-driven by the configured registration window.
- `submission_open` is manually activated by an admin within the configured submission window.

## HackathonRoleAssignment

### Key Fields

- `id`
- `hackathon_id`
- `user_id`
- `role`
- `is_in_judge_pool`
- `created_at`

### Enums

- `role`
  - `hackathon_admin`
  - `judge`

### Constraints

- `unique (hackathon_id, user_id)`
- `role = judge` requires `is_in_judge_pool = true`

### Notes

- Every platform admin also has a `hackathon_admin` assignment row for each hackathon.
- `is_in_judge_pool` controls automatic judge distribution.

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
- `reviewed_at`
- `reviewed_by_user_id`
- `application_terms_document_id`
- `application_terms_accepted_at`
- `created_at`
- `updated_at`

### Enums

- `status`
  - `submitted`
  - `approved`
  - `rejected`

### Constraints

- `unique (hackathon_id, user_id)`

## Team

### Key Fields

- `id`
- `hackathon_id`
- `name`
- `slug`
- `is_open_to_join_requests`
- `created_by_user_id`
- `created_at`
- `updated_at`

### Constraints

- `unique (hackathon_id, slug)`

### Notes

- A solo participant is still represented by a `Team`.
- Team formation is allowed during `registration_open` and `submission_open`.

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
- Every active team must always have at least one active admin membership.

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

## JudgeAssignment

### Key Fields

- `id`
- `hackathon_id`
- `submission_id`
- `judge_user_id`
- `status`
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

- `status`
  - `assigned`
  - `judge_started`
  - `judge_completed`
  - `skipped`
- `ineligibility_status`
  - `eligible`
  - `ineligible`

### Constraints

- Exactly one active judge assignment per submission during normal judge review.

### Notes

- A skipped assignment remains part of the audit trail.
- When an assignment is skipped, a new active assignment is created for another judge.
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

### Notes

- Criterion scores live under `JudgeAssignment`, not on `Submission`.

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
- Member-scoped prize eligibility is determined from the frozen prize eligibility snapshot created at `judging_preparation`.

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
- `PlatformDocument` stands alone as a platform-wide document
- `UserPlatformDocumentAcceptance` belongs to `User` and `PlatformDocument`
- `HackathonTermsDocument` belongs to `Hackathon`
- `UserApplication` belongs to `Hackathon` and `User`
- `Team` belongs to `Hackathon`
- `TeamMember` belongs to `Team` and `User`
- `TeamJoinRequest` belongs to `Team` and `User`
- `Submission` belongs to `Team`
- `EvaluationCriterion` belongs to `Hackathon`
- `JudgeAssignment` belongs to `Hackathon`, `Submission`, and `User`
- `JudgeCriterionScore` belongs to `JudgeAssignment` and `EvaluationCriterion`
- `Prize` belongs to `Hackathon`
- `PrizeEligibilitySnapshot` belongs to `Hackathon`, `Team`, and `User`
- `PrizeRedemption` belongs to `Prize` and may reference `User` and `Team`
- `AuditLog` references the acting `User` and the affected entity

## Derived Views

These are computed from persisted data and do not require separate canonical entities:

- blind judging submission view
- shortlist ordering
- leaderboard
- no-submission team section
