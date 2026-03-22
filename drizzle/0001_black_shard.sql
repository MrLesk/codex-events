PRAGMA foreign_keys=OFF;--> statement-breakpoint
DROP TRIGGER IF EXISTS `team_members_single_hackathon_membership_insert`;--> statement-breakpoint
DROP TRIGGER IF EXISTS `team_members_single_hackathon_membership_update`;--> statement-breakpoint
DROP TRIGGER IF EXISTS `team_members_active_admin_guard`;--> statement-breakpoint
DROP TRIGGER IF EXISTS `team_members_post_submission_close_member_guard`;--> statement-breakpoint
CREATE TABLE `__new_hackathons` (
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
	`submission_opens_at` text NOT NULL,
	`submission_closes_at` text NOT NULL,
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
	FOREIGN KEY (`created_by_user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "hackathons_max_team_members_check" CHECK("__new_hackathons"."max_team_members" >= 1),
	CONSTRAINT "hackathons_schedule_order_check" CHECK("__new_hackathons"."registration_opens_at" < "__new_hackathons"."registration_closes_at"
        and "__new_hackathons"."registration_closes_at" <= "__new_hackathons"."submission_opens_at"
        and "__new_hackathons"."submission_opens_at" < "__new_hackathons"."submission_closes_at")
);
--> statement-breakpoint
INSERT INTO `__new_hackathons`("id", "name", "slug", "description", "background_image_url", "banner_image_url", "city", "address", "registration_opens_at", "registration_closes_at", "submission_opens_at", "submission_closes_at", "state", "max_team_members", "require_x_profile", "require_linkedin_profile", "require_github_profile", "current_application_terms_document_id", "current_winner_terms_document_id", "created_by_user_id", "created_at", "updated_at") SELECT "id", "name", "slug", "description", "background_image_url", "banner_image_url", "city", "address", "registration_opens_at", "registration_closes_at", "submission_opens_at", "submission_closes_at", "state", "max_team_members", "require_x_profile", "require_linkedin_profile", "require_github_profile", "current_application_terms_document_id", "current_winner_terms_document_id", "created_by_user_id", "created_at", "updated_at" FROM `hackathons`;--> statement-breakpoint
DROP TABLE `hackathons`;--> statement-breakpoint
ALTER TABLE `__new_hackathons` RENAME TO `hackathons`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE UNIQUE INDEX `hackathons_slug_idx` ON `hackathons` (`slug`);--> statement-breakpoint
CREATE TABLE `__new_prizes` (
	`id` text PRIMARY KEY NOT NULL,
	`hackathon_id` text NOT NULL,
	`name` text NOT NULL,
	`description` text NOT NULL,
	`reward_type` text NOT NULL,
	`reward_value` text NOT NULL,
	`reward_currency` text,
	`award_scope` text NOT NULL,
	`rank_start` integer NOT NULL,
	`rank_end` integer NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`hackathon_id`) REFERENCES `hackathons`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "prizes_rank_order_check" CHECK("__new_prizes"."rank_start" <= "__new_prizes"."rank_end")
);
--> statement-breakpoint
INSERT INTO `__new_prizes`("id", "hackathon_id", "name", "description", "reward_type", "reward_value", "reward_currency", "award_scope", "rank_start", "rank_end", "created_at") SELECT "id", "hackathon_id", "name", "description", "reward_type", "reward_value", "reward_currency", "award_scope", "rank_start", "rank_end", "created_at" FROM `prizes`;--> statement-breakpoint
DROP TABLE `prizes`;--> statement-breakpoint
ALTER TABLE `__new_prizes` RENAME TO `prizes`;--> statement-breakpoint
CREATE TABLE `__new_audit_logs` (
	`id` text PRIMARY KEY NOT NULL,
	`actor_user_id` text,
	`entity_type` text NOT NULL,
	`entity_id` text NOT NULL,
	`action` text NOT NULL,
	`metadata` text DEFAULT '{}' NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`actor_user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
INSERT INTO `__new_audit_logs`("id", "actor_user_id", "entity_type", "entity_id", "action", "metadata", "created_at") SELECT "id", "actor_user_id", "entity_type", "entity_id", "action", "metadata", "created_at" FROM `audit_logs`;--> statement-breakpoint
DROP TABLE `audit_logs`;--> statement-breakpoint
ALTER TABLE `__new_audit_logs` RENAME TO `audit_logs`;--> statement-breakpoint
CREATE INDEX `audit_logs_entity_idx` ON `audit_logs` (`entity_type`,`entity_id`);--> statement-breakpoint
CREATE INDEX `audit_logs_actor_idx` ON `audit_logs` (`actor_user_id`);--> statement-breakpoint
CREATE TABLE `__new_evaluation_criteria` (
	`id` text PRIMARY KEY NOT NULL,
	`hackathon_id` text NOT NULL,
	`name` text NOT NULL,
	`description` text NOT NULL,
	`weight` integer NOT NULL,
	`display_order` integer NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`hackathon_id`) REFERENCES `hackathons`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "evaluation_criteria_weight_non_negative_check" CHECK("__new_evaluation_criteria"."weight" >= 0)
);
--> statement-breakpoint
INSERT INTO `__new_evaluation_criteria`("id", "hackathon_id", "name", "description", "weight", "display_order", "created_at") SELECT "id", "hackathon_id", "name", "description", "weight", "display_order", "created_at" FROM `evaluation_criteria`;--> statement-breakpoint
DROP TABLE `evaluation_criteria`;--> statement-breakpoint
ALTER TABLE `__new_evaluation_criteria` RENAME TO `evaluation_criteria`;--> statement-breakpoint
CREATE UNIQUE INDEX `evaluation_criteria_hackathon_display_order_idx` ON `evaluation_criteria` (`hackathon_id`,`display_order`);--> statement-breakpoint
CREATE TABLE `__new_hackathon_role_assignments` (
	`id` text PRIMARY KEY NOT NULL,
	`hackathon_id` text NOT NULL,
	`user_id` text NOT NULL,
	`role` text NOT NULL,
	`is_in_judge_pool` integer DEFAULT false NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`hackathon_id`) REFERENCES `hackathons`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "hackathon_role_assignments_judge_pool_check" CHECK(("__new_hackathon_role_assignments"."role" != 'judge') or ("__new_hackathon_role_assignments"."is_in_judge_pool" = 1))
);
--> statement-breakpoint
INSERT INTO `__new_hackathon_role_assignments`("id", "hackathon_id", "user_id", "role", "is_in_judge_pool", "created_at") SELECT "id", "hackathon_id", "user_id", "role", "is_in_judge_pool", "created_at" FROM `hackathon_role_assignments`;--> statement-breakpoint
DROP TABLE `hackathon_role_assignments`;--> statement-breakpoint
ALTER TABLE `__new_hackathon_role_assignments` RENAME TO `hackathon_role_assignments`;--> statement-breakpoint
CREATE UNIQUE INDEX `hackathon_role_assignments_hackathon_user_idx` ON `hackathon_role_assignments` (`hackathon_id`,`user_id`);--> statement-breakpoint
CREATE TABLE `__new_hackathon_terms_documents` (
	`id` text PRIMARY KEY NOT NULL,
	`hackathon_id` text NOT NULL,
	`document_type` text NOT NULL,
	`version` integer NOT NULL,
	`title` text NOT NULL,
	`content` text NOT NULL,
	`published_at` text NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`hackathon_id`) REFERENCES `hackathons`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
INSERT INTO `__new_hackathon_terms_documents`("id", "hackathon_id", "document_type", "version", "title", "content", "published_at", "created_at") SELECT "id", "hackathon_id", "document_type", "version", "title", "content", "published_at", "created_at" FROM `hackathon_terms_documents`;--> statement-breakpoint
DROP TABLE `hackathon_terms_documents`;--> statement-breakpoint
ALTER TABLE `__new_hackathon_terms_documents` RENAME TO `hackathon_terms_documents`;--> statement-breakpoint
CREATE UNIQUE INDEX `hackathon_terms_documents_hackathon_type_version_idx` ON `hackathon_terms_documents` (`hackathon_id`,`document_type`,`version`);--> statement-breakpoint
CREATE TABLE `__new_judge_assignments` (
	`id` text PRIMARY KEY NOT NULL,
	`hackathon_id` text NOT NULL,
	`submission_id` text NOT NULL,
	`judge_user_id` text NOT NULL,
	`status` text DEFAULT 'assigned' NOT NULL,
	`assigned_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`started_at` text,
	`completed_at` text,
	`skipped_at` text,
	`skipped_by_user_id` text,
	`skip_reason` text,
	`ineligibility_status` text DEFAULT 'eligible' NOT NULL,
	`ineligibility_reason` text,
	`ineligibility_marked_at` text,
	`ineligibility_marked_by_user_id` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`hackathon_id`) REFERENCES `hackathons`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`submission_id`) REFERENCES `submissions`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`judge_user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`skipped_by_user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`ineligibility_marked_by_user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
INSERT INTO `__new_judge_assignments`("id", "hackathon_id", "submission_id", "judge_user_id", "status", "assigned_at", "started_at", "completed_at", "skipped_at", "skipped_by_user_id", "skip_reason", "ineligibility_status", "ineligibility_reason", "ineligibility_marked_at", "ineligibility_marked_by_user_id", "created_at") SELECT "id", "hackathon_id", "submission_id", "judge_user_id", "status", "assigned_at", "started_at", "completed_at", "skipped_at", "skipped_by_user_id", "skip_reason", "ineligibility_status", "ineligibility_reason", "ineligibility_marked_at", "ineligibility_marked_by_user_id", "created_at" FROM `judge_assignments`;--> statement-breakpoint
DROP TABLE `judge_assignments`;--> statement-breakpoint
ALTER TABLE `__new_judge_assignments` RENAME TO `judge_assignments`;--> statement-breakpoint
CREATE UNIQUE INDEX `judge_assignments_active_submission_idx` ON `judge_assignments` (`submission_id`) WHERE "judge_assignments"."status" in ('assigned', 'judge_started');--> statement-breakpoint
CREATE INDEX `judge_assignments_judge_idx` ON `judge_assignments` (`judge_user_id`);--> statement-breakpoint
CREATE TABLE `__new_judge_criterion_scores` (
	`id` text PRIMARY KEY NOT NULL,
	`judge_assignment_id` text NOT NULL,
	`evaluation_criterion_id` text NOT NULL,
	`score` integer NOT NULL,
	`comment` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`judge_assignment_id`) REFERENCES `judge_assignments`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`evaluation_criterion_id`) REFERENCES `evaluation_criteria`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
INSERT INTO `__new_judge_criterion_scores`("id", "judge_assignment_id", "evaluation_criterion_id", "score", "comment", "created_at", "updated_at") SELECT "id", "judge_assignment_id", "evaluation_criterion_id", "score", "comment", "created_at", "updated_at" FROM `judge_criterion_scores`;--> statement-breakpoint
DROP TABLE `judge_criterion_scores`;--> statement-breakpoint
ALTER TABLE `__new_judge_criterion_scores` RENAME TO `judge_criterion_scores`;--> statement-breakpoint
CREATE UNIQUE INDEX `judge_criterion_scores_assignment_criterion_idx` ON `judge_criterion_scores` (`judge_assignment_id`,`evaluation_criterion_id`);--> statement-breakpoint
CREATE TABLE `__new_platform_documents` (
	`id` text PRIMARY KEY NOT NULL,
	`document_type` text NOT NULL,
	`version` integer NOT NULL,
	`title` text NOT NULL,
	`content` text NOT NULL,
	`published_at` text NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
INSERT INTO `__new_platform_documents`("id", "document_type", "version", "title", "content", "published_at", "created_at") SELECT "id", "document_type", "version", "title", "content", "published_at", "created_at" FROM `platform_documents`;--> statement-breakpoint
DROP TABLE `platform_documents`;--> statement-breakpoint
ALTER TABLE `__new_platform_documents` RENAME TO `platform_documents`;--> statement-breakpoint
CREATE UNIQUE INDEX `platform_documents_type_version_idx` ON `platform_documents` (`document_type`,`version`);--> statement-breakpoint
CREATE TABLE `__new_prize_eligibility_snapshots` (
	`id` text PRIMARY KEY NOT NULL,
	`hackathon_id` text NOT NULL,
	`team_id` text NOT NULL,
	`user_id` text NOT NULL,
	`snapshot_at` text NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`hackathon_id`) REFERENCES `hackathons`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`team_id`) REFERENCES `teams`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
INSERT INTO `__new_prize_eligibility_snapshots`("id", "hackathon_id", "team_id", "user_id", "snapshot_at", "created_at") SELECT "id", "hackathon_id", "team_id", "user_id", "snapshot_at", "created_at" FROM `prize_eligibility_snapshots`;--> statement-breakpoint
DROP TABLE `prize_eligibility_snapshots`;--> statement-breakpoint
ALTER TABLE `__new_prize_eligibility_snapshots` RENAME TO `prize_eligibility_snapshots`;--> statement-breakpoint
CREATE UNIQUE INDEX `prize_eligibility_snapshots_hackathon_team_user_idx` ON `prize_eligibility_snapshots` (`hackathon_id`,`team_id`,`user_id`);--> statement-breakpoint
CREATE TABLE `__new_prize_redemptions` (
	`id` text PRIMARY KEY NOT NULL,
	`prize_id` text NOT NULL,
	`user_id` text,
	`team_id` text,
	`status` text DEFAULT 'pending' NOT NULL,
	`legal_name` text,
	`winner_terms_document_id` text,
	`winner_terms_accepted_at` text,
	`redeemed_at` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`prize_id`) REFERENCES `prizes`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`team_id`) REFERENCES `teams`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`winner_terms_document_id`) REFERENCES `hackathon_terms_documents`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
INSERT INTO `__new_prize_redemptions`("id", "prize_id", "user_id", "team_id", "status", "legal_name", "winner_terms_document_id", "winner_terms_accepted_at", "redeemed_at", "created_at", "updated_at") SELECT "id", "prize_id", "user_id", "team_id", "status", "legal_name", "winner_terms_document_id", "winner_terms_accepted_at", "redeemed_at", "created_at", "updated_at" FROM `prize_redemptions`;--> statement-breakpoint
DROP TABLE `prize_redemptions`;--> statement-breakpoint
ALTER TABLE `__new_prize_redemptions` RENAME TO `prize_redemptions`;--> statement-breakpoint
CREATE TABLE `__new_submissions` (
	`id` text PRIMARY KEY NOT NULL,
	`team_id` text NOT NULL,
	`status` text DEFAULT 'draft' NOT NULL,
	`project_name` text,
	`summary` text,
	`repository_url` text,
	`demo_url` text,
	`submitted_at` text,
	`locked_at` text,
	`withdrawn_at` text,
	`disqualified_at` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`team_id`) REFERENCES `teams`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
INSERT INTO `__new_submissions`("id", "team_id", "status", "project_name", "summary", "repository_url", "demo_url", "submitted_at", "locked_at", "withdrawn_at", "disqualified_at", "created_at", "updated_at") SELECT "id", "team_id", "status", "project_name", "summary", "repository_url", "demo_url", "submitted_at", "locked_at", "withdrawn_at", "disqualified_at", "created_at", "updated_at" FROM `submissions`;--> statement-breakpoint
DROP TABLE `submissions`;--> statement-breakpoint
ALTER TABLE `__new_submissions` RENAME TO `submissions`;--> statement-breakpoint
CREATE UNIQUE INDEX `submissions_active_team_idx` ON `submissions` (`team_id`) WHERE "submissions"."status" in ('draft', 'submitted', 'locked');--> statement-breakpoint
CREATE TABLE `__new_team_join_requests` (
	`id` text PRIMARY KEY NOT NULL,
	`team_id` text NOT NULL,
	`user_id` text NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`requested_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`reviewed_at` text,
	`reviewed_by_user_id` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`team_id`) REFERENCES `teams`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`reviewed_by_user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
INSERT INTO `__new_team_join_requests`("id", "team_id", "user_id", "status", "requested_at", "reviewed_at", "reviewed_by_user_id", "created_at") SELECT "id", "team_id", "user_id", "status", "requested_at", "reviewed_at", "reviewed_by_user_id", "created_at" FROM `team_join_requests`;--> statement-breakpoint
DROP TABLE `team_join_requests`;--> statement-breakpoint
ALTER TABLE `__new_team_join_requests` RENAME TO `team_join_requests`;--> statement-breakpoint
CREATE UNIQUE INDEX `team_join_requests_pending_team_user_idx` ON `team_join_requests` (`team_id`,`user_id`) WHERE "team_join_requests"."status" = 'pending';--> statement-breakpoint
CREATE TABLE `__new_team_members` (
	`id` text PRIMARY KEY NOT NULL,
	`team_id` text NOT NULL,
	`user_id` text NOT NULL,
	`role` text DEFAULT 'member' NOT NULL,
	`joined_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`left_at` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`team_id`) REFERENCES `teams`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
INSERT INTO `__new_team_members`("id", "team_id", "user_id", "role", "joined_at", "left_at", "created_at") SELECT "id", "team_id", "user_id", "role", "joined_at", "left_at", "created_at" FROM `team_members`;--> statement-breakpoint
DROP TABLE `team_members`;--> statement-breakpoint
ALTER TABLE `__new_team_members` RENAME TO `team_members`;--> statement-breakpoint
CREATE UNIQUE INDEX `team_members_team_user_active_idx` ON `team_members` (`team_id`,`user_id`) WHERE "team_members"."left_at" is null;--> statement-breakpoint
CREATE INDEX `team_members_user_idx` ON `team_members` (`user_id`);--> statement-breakpoint
CREATE TABLE `__new_teams` (
	`id` text PRIMARY KEY NOT NULL,
	`hackathon_id` text NOT NULL,
	`name` text NOT NULL,
	`slug` text NOT NULL,
	`is_open_to_join_requests` integer DEFAULT true NOT NULL,
	`created_by_user_id` text NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`hackathon_id`) REFERENCES `hackathons`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`created_by_user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
INSERT INTO `__new_teams`("id", "hackathon_id", "name", "slug", "is_open_to_join_requests", "created_by_user_id", "created_at", "updated_at") SELECT "id", "hackathon_id", "name", "slug", "is_open_to_join_requests", "created_by_user_id", "created_at", "updated_at" FROM `teams`;--> statement-breakpoint
DROP TABLE `teams`;--> statement-breakpoint
ALTER TABLE `__new_teams` RENAME TO `teams`;--> statement-breakpoint
CREATE UNIQUE INDEX `teams_hackathon_slug_idx` ON `teams` (`hackathon_id`,`slug`);--> statement-breakpoint
CREATE INDEX `teams_hackathon_idx` ON `teams` (`hackathon_id`);--> statement-breakpoint
CREATE TABLE `__new_user_applications` (
	`id` text PRIMARY KEY NOT NULL,
	`hackathon_id` text NOT NULL,
	`user_id` text NOT NULL,
	`status` text DEFAULT 'submitted' NOT NULL,
	`submitted_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`reviewed_at` text,
	`reviewed_by_user_id` text,
	`application_terms_document_id` text NOT NULL,
	`application_terms_accepted_at` text NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`hackathon_id`) REFERENCES `hackathons`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`reviewed_by_user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`application_terms_document_id`) REFERENCES `hackathon_terms_documents`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
INSERT INTO `__new_user_applications`("id", "hackathon_id", "user_id", "status", "submitted_at", "reviewed_at", "reviewed_by_user_id", "application_terms_document_id", "application_terms_accepted_at", "created_at", "updated_at") SELECT "id", "hackathon_id", "user_id", "status", "submitted_at", "reviewed_at", "reviewed_by_user_id", "application_terms_document_id", "application_terms_accepted_at", "created_at", "updated_at" FROM `user_applications`;--> statement-breakpoint
DROP TABLE `user_applications`;--> statement-breakpoint
ALTER TABLE `__new_user_applications` RENAME TO `user_applications`;--> statement-breakpoint
CREATE UNIQUE INDEX `user_applications_hackathon_user_idx` ON `user_applications` (`hackathon_id`,`user_id`);--> statement-breakpoint
CREATE TABLE `__new_user_platform_document_acceptances` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`platform_document_id` text NOT NULL,
	`accepted_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`platform_document_id`) REFERENCES `platform_documents`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
INSERT INTO `__new_user_platform_document_acceptances`("id", "user_id", "platform_document_id", "accepted_at") SELECT "id", "user_id", "platform_document_id", "accepted_at" FROM `user_platform_document_acceptances`;--> statement-breakpoint
DROP TABLE `user_platform_document_acceptances`;--> statement-breakpoint
ALTER TABLE `__new_user_platform_document_acceptances` RENAME TO `user_platform_document_acceptances`;--> statement-breakpoint
CREATE UNIQUE INDEX `user_platform_document_acceptances_user_document_idx` ON `user_platform_document_acceptances` (`user_id`,`platform_document_id`);--> statement-breakpoint
CREATE TABLE `__new_users` (
	`id` text PRIMARY KEY NOT NULL,
	`auth0_subject` text NOT NULL,
	`email` text NOT NULL,
	`display_name` text NOT NULL,
	`is_platform_admin` integer DEFAULT false NOT NULL,
	`x_profile_url` text,
	`linkedin_profile_url` text,
	`github_profile_url` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`deleted_at` text
);
--> statement-breakpoint
INSERT INTO `__new_users`("id", "auth0_subject", "email", "display_name", "is_platform_admin", "x_profile_url", "linkedin_profile_url", "github_profile_url", "created_at", "updated_at", "deleted_at") SELECT "id", "auth0_subject", "email", "display_name", "is_platform_admin", "x_profile_url", "linkedin_profile_url", "github_profile_url", "created_at", "updated_at", "deleted_at" FROM `users`;--> statement-breakpoint
DROP TABLE `users`;--> statement-breakpoint
ALTER TABLE `__new_users` RENAME TO `users`;--> statement-breakpoint
CREATE UNIQUE INDEX `users_auth0_subject_active_idx` ON `users` (`auth0_subject`) WHERE "users"."deleted_at" is null;--> statement-breakpoint
CREATE UNIQUE INDEX `users_email_active_idx` ON `users` (`email`) WHERE "users"."deleted_at" is null;
