PRAGMA foreign_keys=OFF;

DROP TRIGGER IF EXISTS `hackathons_current_application_terms_insert_guard`;
DROP TRIGGER IF EXISTS `hackathons_current_application_terms_update_guard`;
DROP TRIGGER IF EXISTS `hackathons_current_winner_terms_insert_guard`;
DROP TRIGGER IF EXISTS `hackathons_current_winner_terms_update_guard`;
DROP TRIGGER IF EXISTS `hackathon_terms_documents_current_application_reference_update_guard`;
DROP TRIGGER IF EXISTS `hackathon_terms_documents_current_application_reference_delete_guard`;
DROP TRIGGER IF EXISTS `hackathon_terms_documents_current_winner_reference_update_guard`;
DROP TRIGGER IF EXISTS `hackathon_terms_documents_current_winner_reference_delete_guard`;
DROP TRIGGER IF EXISTS `team_members_single_hackathon_membership_insert`;
DROP TRIGGER IF EXISTS `team_members_single_hackathon_membership_update`;
DROP TRIGGER IF EXISTS `team_members_post_submission_close_member_guard`;
DROP TRIGGER IF EXISTS `team_members_active_admin_guard`;
DROP TRIGGER IF EXISTS `team_members_active_admin_delete_guard`;

DROP INDEX IF EXISTS `hackathons_slug_idx`;
DROP INDEX IF EXISTS `hackathons_luma_event_api_id_idx`;
DROP INDEX IF EXISTS `hackathon_tracks_hackathon_display_order_idx`;
DROP INDEX IF EXISTS `hackathon_tracks_hackathon_idx`;
DROP INDEX IF EXISTS `hackathon_photos_hackathon_created_idx`;
DROP INDEX IF EXISTS `hackathon_photos_uploaded_by_idx`;
DROP INDEX IF EXISTS `hackathon_feedback_hackathon_created_idx`;
DROP INDEX IF EXISTS `hackathon_role_assignments_hackathon_user_idx`;
DROP INDEX IF EXISTS `hackathon_role_assignments_user_created_idx`;
DROP INDEX IF EXISTS `hackathon_role_assignments_hackathon_judge_pool_created_idx`;
DROP INDEX IF EXISTS `hackathon_terms_documents_hackathon_type_version_idx`;
DROP INDEX IF EXISTS `user_applications_hackathon_user_idx`;
DROP INDEX IF EXISTS `user_applications_hackathon_submitted_idx`;
DROP INDEX IF EXISTS `user_applications_hackathon_status_submitted_idx`;
DROP INDEX IF EXISTS `teams_hackathon_slug_idx`;
DROP INDEX IF EXISTS `teams_hackathon_idx`;
DROP INDEX IF EXISTS `teams_hackathon_name_created_idx`;
DROP INDEX IF EXISTS `evaluation_criteria_hackathon_display_order_idx`;
DROP INDEX IF EXISTS `judge_assignments_hackathon_stage_status_judge_idx`;
DROP INDEX IF EXISTS `judge_assignments_hackathon_submission_stage_status_idx`;
DROP INDEX IF EXISTS `prizes_hackathon_display_order_idx`;
DROP INDEX IF EXISTS `hackathon_credit_offers_hackathon_display_order_idx`;
DROP INDEX IF EXISTS `hackathon_credit_codes_offer_claim_state_idx`;
DROP INDEX IF EXISTS `hackathon_credit_codes_offer_claimed_user_idx`;
DROP INDEX IF EXISTS `prize_eligibility_snapshots_hackathon_user_team_idx`;
DROP INDEX IF EXISTS `prize_eligibility_snapshots_hackathon_team_created_idx`;
DROP INDEX IF EXISTS `prize_eligibility_snapshots_hackathon_team_user_idx`;
DROP INDEX IF EXISTS `hackathon_outcome_caches_updated_idx`;
DROP INDEX IF EXISTS `hackathon_outcome_cache_entries_generation_order_idx`;
DROP INDEX IF EXISTS `hackathon_outcome_cache_entries_hackathon_generation_idx`;
DROP INDEX IF EXISTS `audit_logs_metadata_hackathon_created_idx`;

ALTER TABLE `hackathons` RENAME TO `events`;
ALTER TABLE `events` RENAME COLUMN `require_why_this_hackathon` TO `require_why_this_event`;
ALTER TABLE `events` ADD COLUMN `event_type` text DEFAULT 'hackathon' NOT NULL;

CREATE TABLE `__new_events` (
  `id` text PRIMARY KEY NOT NULL,
  `event_type` text NOT NULL,
  `name` text NOT NULL,
  `slug` text NOT NULL,
  `description` text NOT NULL,
  `agenda_items_json` text DEFAULT '[]' NOT NULL,
  `background_image_url` text,
  `banner_image_url` text,
  `discord_server_url` text,
  `luma_event_url` text,
  `luma_event_api_id` text,
  `city` text NOT NULL,
  `country` text NOT NULL,
  `address` text NOT NULL,
  `registration_opens_at` text NOT NULL,
  `registration_closes_at` text NOT NULL,
  `submission_opens_at` text NOT NULL,
  `submission_closes_at` text NOT NULL,
  `state` text DEFAULT 'draft' NOT NULL,
  `blind_review_count` integer DEFAULT 1 NOT NULL,
  `pitch_review_enabled` integer DEFAULT false NOT NULL,
  `blind_score_weight_percent` integer DEFAULT 70 NOT NULL,
  `pitch_score_weight_percent` integer DEFAULT 30 NOT NULL,
  `shortlist_finalist_count` integer DEFAULT 10 NOT NULL,
  `pitch_finalist_submission_ids_json` text DEFAULT '[]' NOT NULL,
  `active_pitch_presentation_submission_id` text,
  `pitch_presentations_completed_at` text,
  `final_ranking_submission_ids_json` text DEFAULT '[]' NOT NULL,
  `max_team_members` integer NOT NULL,
  `participants_limit` integer,
  `auto_approve_applications` integer DEFAULT false NOT NULL,
  `in_person_event` integer DEFAULT false NOT NULL,
  `require_x_profile` integer DEFAULT false NOT NULL,
  `require_linkedin_profile` integer DEFAULT false NOT NULL,
  `require_github_profile` integer DEFAULT false NOT NULL,
  `require_chatgpt_email` integer DEFAULT false NOT NULL,
  `require_openai_org_id` integer DEFAULT false NOT NULL,
  `require_luma_profile` integer DEFAULT false NOT NULL,
  `require_why_this_event` integer DEFAULT false NOT NULL,
  `require_proof_of_execution` integer DEFAULT false NOT NULL,
  `require_submission_summary` integer DEFAULT false NOT NULL,
  `require_submission_repository_url` integer DEFAULT false NOT NULL,
  `require_submission_demo_url` integer DEFAULT false NOT NULL,
  `current_application_terms_document_id` text,
  `current_winner_terms_document_id` text,
  `created_by_user_id` text NOT NULL,
  `created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
  `updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
  FOREIGN KEY (`created_by_user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
  CONSTRAINT "events_type_check" CHECK(`event_type` in ('hackathon', 'meetup', 'build')),
  CONSTRAINT "events_blind_review_count_check" CHECK(`blind_review_count` >= 0 and `blind_review_count` <= 2),
  CONSTRAINT "events_blind_score_weight_percent_check" CHECK(`blind_score_weight_percent` >= 0 and `blind_score_weight_percent` <= 100),
  CONSTRAINT "events_pitch_score_weight_percent_check" CHECK(`pitch_score_weight_percent` >= 0 and `pitch_score_weight_percent` <= 100),
  CONSTRAINT "events_judging_stage_enabled_check" CHECK(`event_type` != 'hackathon' or `blind_review_count` > 0 or `pitch_review_enabled` = 1),
  CONSTRAINT "events_combined_score_weight_percent_check" CHECK(`event_type` != 'hackathon' or `blind_review_count` = 0 or `pitch_review_enabled` = 0 or `blind_score_weight_percent` + `pitch_score_weight_percent` = 100),
  CONSTRAINT "events_max_team_members_check" CHECK(`max_team_members` >= 1),
  CONSTRAINT "events_participants_limit_check" CHECK(`participants_limit` is null or `participants_limit` >= 1),
  CONSTRAINT "events_schedule_order_check" CHECK(`registration_opens_at` < `registration_closes_at` and `registration_closes_at` <= `submission_opens_at` and `submission_opens_at` < `submission_closes_at`)
);
INSERT INTO `__new_events` (
  `id`, `event_type`, `name`, `slug`, `description`, `agenda_items_json`, `background_image_url`, `banner_image_url`,
  `discord_server_url`, `luma_event_url`, `luma_event_api_id`, `city`, `country`, `address`, `registration_opens_at`,
  `registration_closes_at`, `submission_opens_at`, `submission_closes_at`, `state`, `blind_review_count`,
  `pitch_review_enabled`, `blind_score_weight_percent`, `pitch_score_weight_percent`, `shortlist_finalist_count`,
  `pitch_finalist_submission_ids_json`, `active_pitch_presentation_submission_id`, `pitch_presentations_completed_at`,
  `final_ranking_submission_ids_json`, `max_team_members`, `participants_limit`, `auto_approve_applications`,
  `in_person_event`, `require_x_profile`, `require_linkedin_profile`, `require_github_profile`, `require_chatgpt_email`,
  `require_openai_org_id`, `require_luma_profile`, `require_why_this_event`, `require_proof_of_execution`,
  `require_submission_summary`, `require_submission_repository_url`, `require_submission_demo_url`,
  `current_application_terms_document_id`, `current_winner_terms_document_id`, `created_by_user_id`, `created_at`, `updated_at`
)
SELECT
  `id`, 'hackathon', `name`, `slug`, `description`, `agenda_items_json`, `background_image_url`, `banner_image_url`,
  `discord_server_url`, `luma_event_url`, `luma_event_api_id`, `city`, `country`, `address`, `registration_opens_at`,
  `registration_closes_at`, `submission_opens_at`, `submission_closes_at`, `state`, `blind_review_count`,
  `pitch_review_enabled`, `blind_score_weight_percent`, `pitch_score_weight_percent`, `shortlist_finalist_count`,
  `pitch_finalist_submission_ids_json`, `active_pitch_presentation_submission_id`, `pitch_presentations_completed_at`,
  `final_ranking_submission_ids_json`, `max_team_members`, `participants_limit`, `auto_approve_applications`,
  `in_person_event`, `require_x_profile`, `require_linkedin_profile`, `require_github_profile`, `require_chatgpt_email`,
  `require_openai_org_id`, `require_luma_profile`, `require_why_this_event`, `require_proof_of_execution`,
  `require_submission_summary`, `require_submission_repository_url`, `require_submission_demo_url`,
  `current_application_terms_document_id`, `current_winner_terms_document_id`, `created_by_user_id`, `created_at`, `updated_at`
FROM `events`;
DROP TABLE `events`;
ALTER TABLE `__new_events` RENAME TO `events`;
CREATE UNIQUE INDEX `events_slug_idx` ON `events` (`slug`);
CREATE UNIQUE INDEX `events_luma_event_api_id_idx` ON `events` (`luma_event_api_id`);

ALTER TABLE `hackathon_tracks` RENAME TO `event_tracks`;
ALTER TABLE `event_tracks` RENAME COLUMN `hackathon_id` TO `event_id`;
CREATE UNIQUE INDEX `event_tracks_event_display_order_idx` ON `event_tracks` (`event_id`, `display_order`);
CREATE INDEX `event_tracks_event_idx` ON `event_tracks` (`event_id`);

ALTER TABLE `hackathon_photos` RENAME TO `event_photos`;
ALTER TABLE `event_photos` RENAME COLUMN `hackathon_id` TO `event_id`;
CREATE INDEX `event_photos_event_created_idx` ON `event_photos` (`event_id`, `created_at`);
CREATE INDEX `event_photos_uploaded_by_idx` ON `event_photos` (`uploaded_by_user_id`);

ALTER TABLE `hackathon_feedback` RENAME TO `event_feedback`;
ALTER TABLE `event_feedback` RENAME COLUMN `hackathon_id` TO `event_id`;
CREATE INDEX `event_feedback_event_created_idx` ON `event_feedback` (`event_id`, `created_at`);

ALTER TABLE `hackathon_role_assignments` RENAME TO `event_role_assignments`;
ALTER TABLE `event_role_assignments` RENAME COLUMN `hackathon_id` TO `event_id`;
UPDATE `event_role_assignments` SET `role` = 'event_admin' WHERE `role` = 'hackathon_admin';
CREATE TABLE `__new_event_role_assignments` (
  `id` text PRIMARY KEY NOT NULL,
  `event_id` text NOT NULL,
  `user_id` text NOT NULL,
  `role` text NOT NULL,
  `is_in_judge_pool` integer DEFAULT false NOT NULL,
  `is_staff` integer DEFAULT false NOT NULL,
  `created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
  FOREIGN KEY (`event_id`) REFERENCES `events`(`id`) ON UPDATE no action ON DELETE no action,
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
  CONSTRAINT "event_role_assignments_judge_pool_check" CHECK((`role` != 'judge') or ((`is_in_judge_pool` = 1) and (`is_staff` = 0))),
  CONSTRAINT "event_role_assignments_staff_flag_check" CHECK((`role` != 'staff') or ((`is_staff` = 1) and (`is_in_judge_pool` = 0)))
);
INSERT INTO `__new_event_role_assignments` (`id`, `event_id`, `user_id`, `role`, `is_in_judge_pool`, `is_staff`, `created_at`)
SELECT `id`, `event_id`, `user_id`, `role`, `is_in_judge_pool`, `is_staff`, `created_at`
FROM `event_role_assignments`;
DROP TABLE `event_role_assignments`;
ALTER TABLE `__new_event_role_assignments` RENAME TO `event_role_assignments`;
CREATE UNIQUE INDEX `event_role_assignments_event_user_idx` ON `event_role_assignments` (`event_id`, `user_id`);
CREATE INDEX `event_role_assignments_user_created_idx` ON `event_role_assignments` (`user_id`, `created_at`);
CREATE INDEX `event_role_assignments_event_judge_pool_created_idx` ON `event_role_assignments` (`event_id`, `is_in_judge_pool`, `created_at`);

ALTER TABLE `hackathon_terms_documents` RENAME TO `event_terms_documents`;
ALTER TABLE `event_terms_documents` RENAME COLUMN `hackathon_id` TO `event_id`;
CREATE UNIQUE INDEX `event_terms_documents_event_type_version_idx` ON `event_terms_documents` (`event_id`, `document_type`, `version`);

ALTER TABLE `user_applications` RENAME COLUMN `hackathon_id` TO `event_id`;
UPDATE `user_applications`
SET `registration_details_json` = json_set(
  json_remove(`registration_details_json`, '$.whyThisHackathon'),
  '$.whyThisEvent',
  coalesce(json_extract(`registration_details_json`, '$.whyThisHackathon'), '')
)
WHERE json_type(`registration_details_json`, '$.whyThisHackathon') IS NOT NULL;
CREATE UNIQUE INDEX `user_applications_event_user_idx` ON `user_applications` (`event_id`, `user_id`);
CREATE INDEX `user_applications_event_submitted_idx` ON `user_applications` (`event_id`, `submitted_at`);
CREATE INDEX `user_applications_event_status_submitted_idx` ON `user_applications` (`event_id`, `status`, `submitted_at`);

ALTER TABLE `teams` RENAME COLUMN `hackathon_id` TO `event_id`;
CREATE UNIQUE INDEX `teams_event_slug_idx` ON `teams` (`event_id`, `slug`);
CREATE INDEX `teams_event_idx` ON `teams` (`event_id`);
CREATE INDEX `teams_event_name_created_idx` ON `teams` (`event_id`, `name`, `created_at`);

ALTER TABLE `evaluation_criteria` RENAME COLUMN `hackathon_id` TO `event_id`;
CREATE UNIQUE INDEX `evaluation_criteria_event_display_order_idx` ON `evaluation_criteria` (`event_id`, `display_order`);

ALTER TABLE `judge_assignments` RENAME COLUMN `hackathon_id` TO `event_id`;
CREATE INDEX `judge_assignments_event_stage_status_judge_idx` ON `judge_assignments` (`event_id`, `review_stage`, `status`, `judge_user_id`);
CREATE INDEX `judge_assignments_event_submission_stage_status_idx` ON `judge_assignments` (`event_id`, `submission_id`, `review_stage`, `status`);

ALTER TABLE `prizes` RENAME COLUMN `hackathon_id` TO `event_id`;
CREATE INDEX `prizes_event_display_order_idx` ON `prizes` (`event_id`, `display_order`);

ALTER TABLE `hackathon_credit_offers` RENAME TO `event_credit_offers`;
ALTER TABLE `event_credit_offers` RENAME COLUMN `hackathon_id` TO `event_id`;
CREATE INDEX `event_credit_offers_event_display_order_idx` ON `event_credit_offers` (`event_id`, `display_order`);

ALTER TABLE `hackathon_credit_codes` RENAME TO `event_credit_codes`;
CREATE INDEX `event_credit_codes_offer_claim_state_idx` ON `event_credit_codes` (`credit_offer_id`, `claimed_by_user_id`, `created_at`);
CREATE UNIQUE INDEX `event_credit_codes_offer_claimed_user_idx` ON `event_credit_codes` (`credit_offer_id`, `claimed_by_user_id`) WHERE `claimed_by_user_id` is not null;

ALTER TABLE `prize_eligibility_snapshots` RENAME COLUMN `hackathon_id` TO `event_id`;
CREATE INDEX `prize_eligibility_snapshots_event_user_team_idx` ON `prize_eligibility_snapshots` (`event_id`, `user_id`, `team_id`);
CREATE INDEX `prize_eligibility_snapshots_event_team_created_idx` ON `prize_eligibility_snapshots` (`event_id`, `team_id`, `created_at`);
CREATE UNIQUE INDEX `prize_eligibility_snapshots_event_team_user_idx` ON `prize_eligibility_snapshots` (`event_id`, `team_id`, `user_id`);

ALTER TABLE `hackathon_outcome_caches` RENAME TO `event_outcome_caches`;
ALTER TABLE `event_outcome_caches` RENAME COLUMN `hackathon_id` TO `event_id`;
CREATE INDEX `event_outcome_caches_updated_idx` ON `event_outcome_caches` (`updated_at`);

ALTER TABLE `hackathon_outcome_cache_entries` RENAME TO `event_outcome_cache_entries`;
ALTER TABLE `event_outcome_cache_entries` RENAME COLUMN `hackathon_id` TO `event_id`;
CREATE UNIQUE INDEX `event_outcome_cache_entries_generation_order_idx` ON `event_outcome_cache_entries` (`event_id`, `generation_id`, `collection`, `display_order`);
CREATE INDEX `event_outcome_cache_entries_event_generation_idx` ON `event_outcome_cache_entries` (`event_id`, `generation_id`);

UPDATE `audit_logs`
SET `metadata` = json_set(
  json_remove(`metadata`, '$.hackathonId'),
  '$.eventId',
  json_extract(`metadata`, '$.hackathonId')
)
WHERE json_type(`metadata`, '$.hackathonId') IS NOT NULL;
CREATE INDEX `audit_logs_metadata_event_created_idx` ON `audit_logs` (json_extract(`metadata`, '$.eventId'), `created_at`);

CREATE TRIGGER `events_current_application_terms_insert_guard`
BEFORE INSERT ON `events`
FOR EACH ROW
WHEN NEW.`current_application_terms_document_id` IS NOT NULL
BEGIN
  SELECT RAISE(ABORT, 'event_current_application_terms_document_invalid')
  WHERE NOT EXISTS (
    SELECT 1
    FROM `event_terms_documents` `document`
    WHERE `document`.`id` = NEW.`current_application_terms_document_id`
      AND `document`.`event_id` = NEW.`id`
      AND `document`.`document_type` = 'application_terms'
  );
END;

CREATE TRIGGER `events_current_application_terms_update_guard`
BEFORE UPDATE OF `current_application_terms_document_id` ON `events`
FOR EACH ROW
WHEN NEW.`current_application_terms_document_id` IS NOT NULL
BEGIN
  SELECT RAISE(ABORT, 'event_current_application_terms_document_invalid')
  WHERE NOT EXISTS (
    SELECT 1
    FROM `event_terms_documents` `document`
    WHERE `document`.`id` = NEW.`current_application_terms_document_id`
      AND `document`.`event_id` = NEW.`id`
      AND `document`.`document_type` = 'application_terms'
  );
END;

CREATE TRIGGER `events_current_winner_terms_insert_guard`
BEFORE INSERT ON `events`
FOR EACH ROW
WHEN NEW.`current_winner_terms_document_id` IS NOT NULL
BEGIN
  SELECT RAISE(ABORT, 'event_current_winner_terms_document_invalid')
  WHERE NOT EXISTS (
    SELECT 1
    FROM `event_terms_documents` `document`
    WHERE `document`.`id` = NEW.`current_winner_terms_document_id`
      AND `document`.`event_id` = NEW.`id`
      AND `document`.`document_type` = 'winner_terms'
  );
END;

CREATE TRIGGER `events_current_winner_terms_update_guard`
BEFORE UPDATE OF `current_winner_terms_document_id` ON `events`
FOR EACH ROW
WHEN NEW.`current_winner_terms_document_id` IS NOT NULL
BEGIN
  SELECT RAISE(ABORT, 'event_current_winner_terms_document_invalid')
  WHERE NOT EXISTS (
    SELECT 1
    FROM `event_terms_documents` `document`
    WHERE `document`.`id` = NEW.`current_winner_terms_document_id`
      AND `document`.`event_id` = NEW.`id`
      AND `document`.`document_type` = 'winner_terms'
  );
END;

CREATE TRIGGER `event_terms_documents_current_application_reference_update_guard`
BEFORE UPDATE OF `event_id`, `document_type` ON `event_terms_documents`
FOR EACH ROW
WHEN EXISTS (
  SELECT 1
  FROM `events` `event`
  WHERE `event`.`current_application_terms_document_id` = OLD.`id`
    AND (
      NEW.`event_id` != `event`.`id`
      OR NEW.`document_type` != 'application_terms'
    )
)
BEGIN
  SELECT RAISE(ABORT, 'event_current_application_terms_document_invalid');
END;

CREATE TRIGGER `event_terms_documents_current_application_reference_delete_guard`
BEFORE DELETE ON `event_terms_documents`
FOR EACH ROW
WHEN EXISTS (
  SELECT 1
  FROM `events` `event`
  WHERE `event`.`current_application_terms_document_id` = OLD.`id`
)
BEGIN
  SELECT RAISE(ABORT, 'event_current_application_terms_document_invalid');
END;

CREATE TRIGGER `event_terms_documents_current_winner_reference_update_guard`
BEFORE UPDATE OF `event_id`, `document_type` ON `event_terms_documents`
FOR EACH ROW
WHEN EXISTS (
  SELECT 1
  FROM `events` `event`
  WHERE `event`.`current_winner_terms_document_id` = OLD.`id`
    AND (
      NEW.`event_id` != `event`.`id`
      OR NEW.`document_type` != 'winner_terms'
    )
)
BEGIN
  SELECT RAISE(ABORT, 'event_current_winner_terms_document_invalid');
END;

CREATE TRIGGER `event_terms_documents_current_winner_reference_delete_guard`
BEFORE DELETE ON `event_terms_documents`
FOR EACH ROW
WHEN EXISTS (
  SELECT 1
  FROM `events` `event`
  WHERE `event`.`current_winner_terms_document_id` = OLD.`id`
)
BEGIN
  SELECT RAISE(ABORT, 'event_current_winner_terms_document_invalid');
END;

CREATE TRIGGER `team_members_single_event_membership_insert`
BEFORE INSERT ON `team_members`
FOR EACH ROW
WHEN NEW.`left_at` IS NULL
AND EXISTS (
  SELECT 1
  FROM `team_members` `existing_membership`
  INNER JOIN `teams` `existing_team` ON `existing_team`.`id` = `existing_membership`.`team_id`
  INNER JOIN `teams` `new_team` ON `new_team`.`id` = NEW.`team_id`
  WHERE `existing_membership`.`user_id` = NEW.`user_id`
    AND `existing_membership`.`left_at` IS NULL
    AND `existing_team`.`event_id` = `new_team`.`event_id`
)
BEGIN
  SELECT RAISE(ABORT, 'user already has an active team membership in this event');
END;

CREATE TRIGGER `team_members_single_event_membership_update`
BEFORE UPDATE OF `team_id`, `user_id`, `left_at` ON `team_members`
FOR EACH ROW
WHEN NEW.`left_at` IS NULL
AND EXISTS (
  SELECT 1
  FROM `team_members` `existing_membership`
  INNER JOIN `teams` `existing_team` ON `existing_team`.`id` = `existing_membership`.`team_id`
  INNER JOIN `teams` `new_team` ON `new_team`.`id` = NEW.`team_id`
  WHERE `existing_membership`.`id` != OLD.`id`
    AND `existing_membership`.`user_id` = NEW.`user_id`
    AND `existing_membership`.`left_at` IS NULL
    AND `existing_team`.`event_id` = `new_team`.`event_id`
)
BEGIN
  SELECT RAISE(ABORT, 'user already has an active team membership in this event');
END;

CREATE TRIGGER `team_members_post_submission_close_member_guard`
BEFORE UPDATE OF `left_at` ON `team_members`
FOR EACH ROW
WHEN OLD.`left_at` IS NULL
AND NEW.`left_at` IS NOT NULL
AND EXISTS (
  SELECT 1
  FROM `teams` `team`
  INNER JOIN `events` `event` ON `event`.`id` = `team`.`event_id`
  WHERE `team`.`id` = OLD.`team_id`
    AND `event`.`state` NOT IN ('registration_open', 'submission_open')
)
AND NOT EXISTS (
  SELECT 1
  FROM `team_members` `remaining_member`
  WHERE `remaining_member`.`team_id` = OLD.`team_id`
    AND `remaining_member`.`id` != OLD.`id`
    AND `remaining_member`.`left_at` IS NULL
)
BEGIN
  SELECT RAISE(ABORT, 'teams must retain at least one active member after submission closes');
END;

CREATE TRIGGER `team_members_active_admin_guard`
BEFORE UPDATE OF `role`, `left_at` ON `team_members`
FOR EACH ROW
WHEN OLD.`role` = 'admin'
AND OLD.`left_at` IS NULL
AND (NEW.`role` != 'admin' OR NEW.`left_at` IS NOT NULL)
AND NOT EXISTS (
  SELECT 1
  FROM `team_members` `other_admin`
  WHERE `other_admin`.`team_id` = OLD.`team_id`
    AND `other_admin`.`id` != OLD.`id`
    AND `other_admin`.`role` = 'admin'
    AND `other_admin`.`left_at` IS NULL
)
AND NOT (
  NEW.`left_at` IS NOT NULL
  AND NOT EXISTS (
    SELECT 1
    FROM `team_members` `remaining_member`
    WHERE `remaining_member`.`team_id` = OLD.`team_id`
      AND `remaining_member`.`id` != OLD.`id`
      AND `remaining_member`.`left_at` IS NULL
  )
  AND EXISTS (
    SELECT 1
    FROM `teams` `team`
    INNER JOIN `events` `event` ON `event`.`id` = `team`.`event_id`
    WHERE `team`.`id` = OLD.`team_id`
      AND `event`.`state` IN ('registration_open', 'submission_open')
  )
  AND NOT EXISTS (
    SELECT 1
    FROM `submissions` `submission`
    WHERE `submission`.`team_id` = OLD.`team_id`
      AND `submission`.`status` IN ('draft', 'submitted', 'locked')
  )
)
BEGIN
  SELECT RAISE(ABORT, 'active teams must retain at least one active admin');
END;

CREATE TRIGGER `team_members_active_admin_delete_guard`
BEFORE DELETE ON `team_members`
FOR EACH ROW
WHEN OLD.`role` = 'admin'
AND OLD.`left_at` IS NULL
AND NOT EXISTS (
  SELECT 1
  FROM `team_members` `other_admin`
  WHERE `other_admin`.`team_id` = OLD.`team_id`
    AND `other_admin`.`id` != OLD.`id`
    AND `other_admin`.`role` = 'admin'
    AND `other_admin`.`left_at` IS NULL
)
AND NOT (
  NOT EXISTS (
    SELECT 1
    FROM `team_members` `remaining_member`
    WHERE `remaining_member`.`team_id` = OLD.`team_id`
      AND `remaining_member`.`id` != OLD.`id`
      AND `remaining_member`.`left_at` IS NULL
  )
  AND EXISTS (
    SELECT 1
    FROM `teams` `team`
    INNER JOIN `events` `event` ON `event`.`id` = `team`.`event_id`
    WHERE `team`.`id` = OLD.`team_id`
      AND `event`.`state` IN ('registration_open', 'submission_open')
  )
  AND NOT EXISTS (
    SELECT 1
    FROM `submissions` `submission`
    WHERE `submission`.`team_id` = OLD.`team_id`
      AND `submission`.`status` IN ('draft', 'submitted', 'locked')
  )
)
BEGIN
  SELECT RAISE(ABORT, 'active teams must retain at least one active admin');
END;

PRAGMA foreign_keys=ON;
