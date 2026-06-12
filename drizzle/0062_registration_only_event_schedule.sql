PRAGMA defer_foreign_keys=ON;
--> statement-breakpoint
DROP TRIGGER IF EXISTS `events_current_application_terms_insert_guard`;
--> statement-breakpoint
DROP TRIGGER IF EXISTS `events_current_application_terms_update_guard`;
--> statement-breakpoint
DROP TRIGGER IF EXISTS `events_current_winner_terms_insert_guard`;
--> statement-breakpoint
DROP TRIGGER IF EXISTS `events_current_winner_terms_update_guard`;
--> statement-breakpoint
DROP TRIGGER IF EXISTS `event_terms_documents_current_application_reference_update_guard`;
--> statement-breakpoint
DROP TRIGGER IF EXISTS `event_terms_documents_current_application_reference_delete_guard`;
--> statement-breakpoint
DROP TRIGGER IF EXISTS `event_terms_documents_current_winner_reference_update_guard`;
--> statement-breakpoint
DROP TRIGGER IF EXISTS `event_terms_documents_current_winner_reference_delete_guard`;
--> statement-breakpoint
DROP TRIGGER IF EXISTS `team_members_post_submission_close_member_guard`;
--> statement-breakpoint
DROP TRIGGER IF EXISTS `team_members_active_admin_guard`;
--> statement-breakpoint
DROP TRIGGER IF EXISTS `team_members_active_admin_delete_guard`;
--> statement-breakpoint
CREATE TABLE `__new_events` (
  `id` text PRIMARY KEY NOT NULL,
  `name` text NOT NULL,
  `slug` text NOT NULL,
  `description` text NOT NULL,
  `background_image_url` text,
  `banner_image_url` text,
  `city` text NOT NULL,
  `address` text NOT NULL,
  `registration_opens_at` text NOT NULL,
  `registration_closes_at` text NOT NULL,
  `submission_opens_at` text,
  `submission_closes_at` text,
  `state` text DEFAULT 'draft' NOT NULL,
  `max_team_members` integer NOT NULL,
  `require_x_profile` integer DEFAULT false NOT NULL,
  `require_linkedin_profile` integer DEFAULT false NOT NULL,
  `require_github_profile` integer DEFAULT false NOT NULL,
  `current_application_terms_document_id` text,
  `current_winner_terms_document_id` text,
  `created_by_user_id` text NOT NULL,
  `created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
  `updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
  `require_luma_profile` integer DEFAULT false NOT NULL,
  `require_chatgpt_email` integer DEFAULT false NOT NULL,
  `require_openai_org_id` integer DEFAULT false NOT NULL,
  `luma_event_url` text,
  `agenda_items_json` text DEFAULT '[]' NOT NULL,
  `in_person_event` integer DEFAULT false NOT NULL,
  `require_why_this_event` integer DEFAULT false NOT NULL,
  `require_proof_of_execution` integer DEFAULT false NOT NULL,
  `participants_limit` integer,
  `country` text DEFAULT '' NOT NULL,
  `luma_event_api_id` text,
  `blind_review_count` integer DEFAULT 1 NOT NULL,
  `pitch_review_enabled` integer DEFAULT false NOT NULL,
  `blind_score_weight_percent` integer DEFAULT 70 NOT NULL,
  `pitch_score_weight_percent` integer DEFAULT 30 NOT NULL,
  `pitch_finalist_submission_ids_json` text DEFAULT '[]' NOT NULL,
  `final_ranking_submission_ids_json` text DEFAULT '[]' NOT NULL,
  `discord_server_url` text,
  `require_submission_summary` integer DEFAULT false NOT NULL,
  `require_submission_repository_url` integer DEFAULT false NOT NULL,
  `require_submission_demo_url` integer DEFAULT false NOT NULL,
  `active_pitch_presentation_submission_id` text,
  `pitch_presentations_completed_at` text,
  `shortlist_finalist_count` integer DEFAULT 10 NOT NULL,
  `auto_approve_applications` integer DEFAULT false NOT NULL,
  `event_type` text DEFAULT 'hackathon' NOT NULL,
  `application_x_profile_visible` integer DEFAULT true NOT NULL,
  `application_linkedin_profile_visible` integer DEFAULT true NOT NULL,
  `application_github_profile_visible` integer DEFAULT true NOT NULL,
  `application_chatgpt_email_visible` integer DEFAULT false NOT NULL,
  `application_openai_org_id_visible` integer DEFAULT false NOT NULL,
  `application_luma_email_visible` integer DEFAULT false NOT NULL,
  `application_why_this_event_visible` integer DEFAULT true NOT NULL,
  `application_proof_of_execution_visible` integer DEFAULT true NOT NULL,
  `application_team_intent_visible` integer DEFAULT true NOT NULL,
  `require_team_intent` integer DEFAULT false NOT NULL,
  `application_ai_knowledge_visible` integer DEFAULT false NOT NULL,
  `require_ai_knowledge` integer DEFAULT false NOT NULL,
  `luma_api_key` text,
  `luma_webhook_id` text,
  `luma_webhook_secret` text,
  `luma_webhook_status` text DEFAULT 'not_configured' NOT NULL,
  `luma_webhook_error` text,
  `luma_webhook_registered_at` text,
  FOREIGN KEY (`created_by_user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
  CONSTRAINT "events_blind_review_count_check" CHECK(`blind_review_count` >= 0 and `blind_review_count` <= 2),
  CONSTRAINT "events_blind_score_weight_percent_check" CHECK(`blind_score_weight_percent` >= 0 and `blind_score_weight_percent` <= 100),
  CONSTRAINT "events_pitch_score_weight_percent_check" CHECK(`pitch_score_weight_percent` >= 0 and `pitch_score_weight_percent` <= 100),
  CONSTRAINT "events_judging_stage_enabled_check" CHECK(`event_type` != 'hackathon' or `blind_review_count` > 0 or `pitch_review_enabled` = 1),
  CONSTRAINT "events_combined_score_weight_percent_check" CHECK(
    `event_type` != 'hackathon'
    or `blind_review_count` = 0
    or `pitch_review_enabled` = 0
    or `blind_score_weight_percent` + `pitch_score_weight_percent` = 100
  ),
  CONSTRAINT "events_max_team_members_check" CHECK(`max_team_members` >= 1),
  CONSTRAINT "events_participants_limit_check" CHECK(`participants_limit` is null or `participants_limit` >= 1),
  CONSTRAINT "events_schedule_order_check" CHECK(
    (
      `event_type` = 'hackathon'
      and `registration_opens_at` < `registration_closes_at`
      and `submission_opens_at` is not null
      and `submission_closes_at` is not null
      and `registration_closes_at` <= `submission_opens_at`
      and `submission_opens_at` < `submission_closes_at`
    )
    or (
      `event_type` in ('meetup', 'build')
      and `registration_opens_at` < `registration_closes_at`
      and `submission_opens_at` is null
      and `submission_closes_at` is null
    )
  ),
  CONSTRAINT "events_type_check" CHECK(`event_type` in ('hackathon', 'meetup', 'build')),
  CONSTRAINT "events_luma_webhook_status_check" CHECK(`luma_webhook_status` in ('not_configured', 'configured', 'failed'))
);
--> statement-breakpoint
INSERT INTO `__new_events` (
  `id`,
  `name`,
  `slug`,
  `description`,
  `background_image_url`,
  `banner_image_url`,
  `city`,
  `address`,
  `registration_opens_at`,
  `registration_closes_at`,
  `submission_opens_at`,
  `submission_closes_at`,
  `state`,
  `max_team_members`,
  `require_x_profile`,
  `require_linkedin_profile`,
  `require_github_profile`,
  `current_application_terms_document_id`,
  `current_winner_terms_document_id`,
  `created_by_user_id`,
  `created_at`,
  `updated_at`,
  `require_luma_profile`,
  `require_chatgpt_email`,
  `require_openai_org_id`,
  `luma_event_url`,
  `agenda_items_json`,
  `in_person_event`,
  `require_why_this_event`,
  `require_proof_of_execution`,
  `participants_limit`,
  `country`,
  `luma_event_api_id`,
  `blind_review_count`,
  `pitch_review_enabled`,
  `blind_score_weight_percent`,
  `pitch_score_weight_percent`,
  `pitch_finalist_submission_ids_json`,
  `final_ranking_submission_ids_json`,
  `discord_server_url`,
  `require_submission_summary`,
  `require_submission_repository_url`,
  `require_submission_demo_url`,
  `active_pitch_presentation_submission_id`,
  `pitch_presentations_completed_at`,
  `shortlist_finalist_count`,
  `auto_approve_applications`,
  `event_type`,
  `application_x_profile_visible`,
  `application_linkedin_profile_visible`,
  `application_github_profile_visible`,
  `application_chatgpt_email_visible`,
  `application_openai_org_id_visible`,
  `application_luma_email_visible`,
  `application_why_this_event_visible`,
  `application_proof_of_execution_visible`,
  `application_team_intent_visible`,
  `require_team_intent`,
  `application_ai_knowledge_visible`,
  `require_ai_knowledge`,
  `luma_api_key`,
  `luma_webhook_id`,
  `luma_webhook_secret`,
  `luma_webhook_status`,
  `luma_webhook_error`,
  `luma_webhook_registered_at`
)
SELECT
  `id`,
  `name`,
  `slug`,
  `description`,
  `background_image_url`,
  `banner_image_url`,
  `city`,
  `address`,
  `registration_opens_at`,
  `registration_closes_at`,
  CASE WHEN `event_type` = 'hackathon' THEN `submission_opens_at` ELSE NULL END,
  CASE WHEN `event_type` = 'hackathon' THEN `submission_closes_at` ELSE NULL END,
  `state`,
  `max_team_members`,
  `require_x_profile`,
  `require_linkedin_profile`,
  `require_github_profile`,
  `current_application_terms_document_id`,
  `current_winner_terms_document_id`,
  `created_by_user_id`,
  `created_at`,
  `updated_at`,
  `require_luma_profile`,
  `require_chatgpt_email`,
  `require_openai_org_id`,
  `luma_event_url`,
  `agenda_items_json`,
  `in_person_event`,
  `require_why_this_event`,
  `require_proof_of_execution`,
  `participants_limit`,
  `country`,
  `luma_event_api_id`,
  `blind_review_count`,
  `pitch_review_enabled`,
  `blind_score_weight_percent`,
  `pitch_score_weight_percent`,
  `pitch_finalist_submission_ids_json`,
  `final_ranking_submission_ids_json`,
  `discord_server_url`,
  `require_submission_summary`,
  `require_submission_repository_url`,
  `require_submission_demo_url`,
  `active_pitch_presentation_submission_id`,
  `pitch_presentations_completed_at`,
  `shortlist_finalist_count`,
  `auto_approve_applications`,
  `event_type`,
  `application_x_profile_visible`,
  `application_linkedin_profile_visible`,
  `application_github_profile_visible`,
  `application_chatgpt_email_visible`,
  `application_openai_org_id_visible`,
  `application_luma_email_visible`,
  `application_why_this_event_visible`,
  `application_proof_of_execution_visible`,
  `application_team_intent_visible`,
  `require_team_intent`,
  `application_ai_knowledge_visible`,
  `require_ai_knowledge`,
  `luma_api_key`,
  `luma_webhook_id`,
  `luma_webhook_secret`,
  `luma_webhook_status`,
  `luma_webhook_error`,
  `luma_webhook_registered_at`
FROM `events`;
--> statement-breakpoint
DROP TABLE `events`;
--> statement-breakpoint
ALTER TABLE `__new_events` RENAME TO `events`;
--> statement-breakpoint
CREATE UNIQUE INDEX `events_slug_idx` ON `events` (`slug`);
--> statement-breakpoint
CREATE UNIQUE INDEX `events_luma_event_api_id_idx` ON `events` (`luma_event_api_id`);
--> statement-breakpoint
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
--> statement-breakpoint
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
--> statement-breakpoint
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
--> statement-breakpoint
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
--> statement-breakpoint
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
--> statement-breakpoint
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
--> statement-breakpoint
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
--> statement-breakpoint
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
--> statement-breakpoint
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
--> statement-breakpoint
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
--> statement-breakpoint
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
--> statement-breakpoint
PRAGMA defer_foreign_keys=OFF;
