CREATE TABLE `audit_logs` (
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
CREATE INDEX `audit_logs_entity_idx` ON `audit_logs` (`entity_type`,`entity_id`);--> statement-breakpoint
CREATE INDEX `audit_logs_actor_idx` ON `audit_logs` (`actor_user_id`);--> statement-breakpoint
CREATE TABLE `evaluation_criteria` (
	`id` text PRIMARY KEY NOT NULL,
	`hackathon_id` text NOT NULL,
	`name` text NOT NULL,
	`description` text NOT NULL,
	`weight` integer NOT NULL,
	`display_order` integer NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`hackathon_id`) REFERENCES `hackathons`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "evaluation_criteria_weight_non_negative_check" CHECK("evaluation_criteria"."weight" >= 0)
);
--> statement-breakpoint
CREATE UNIQUE INDEX `evaluation_criteria_hackathon_display_order_idx` ON `evaluation_criteria` (`hackathon_id`,`display_order`);--> statement-breakpoint
CREATE TABLE `hackathon_role_assignments` (
	`id` text PRIMARY KEY NOT NULL,
	`hackathon_id` text NOT NULL,
	`user_id` text NOT NULL,
	`role` text NOT NULL,
	`is_in_judge_pool` integer DEFAULT false NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`hackathon_id`) REFERENCES `hackathons`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "hackathon_role_assignments_judge_pool_check" CHECK(("hackathon_role_assignments"."role" != 'judge') or ("hackathon_role_assignments"."is_in_judge_pool" = 1))
);
--> statement-breakpoint
CREATE UNIQUE INDEX `hackathon_role_assignments_hackathon_user_idx` ON `hackathon_role_assignments` (`hackathon_id`,`user_id`);--> statement-breakpoint
CREATE TABLE `hackathon_terms_documents` (
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
CREATE UNIQUE INDEX `hackathon_terms_documents_hackathon_type_version_idx` ON `hackathon_terms_documents` (`hackathon_id`,`document_type`,`version`);--> statement-breakpoint
CREATE TABLE `hackathons` (
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
	CONSTRAINT "hackathons_max_team_members_check" CHECK("hackathons"."max_team_members" >= 1),
	CONSTRAINT "hackathons_schedule_order_check" CHECK("hackathons"."registration_opens_at" < "hackathons"."registration_closes_at"
        and "hackathons"."registration_closes_at" <= "hackathons"."submission_opens_at"
        and "hackathons"."submission_opens_at" < "hackathons"."submission_closes_at")
);
--> statement-breakpoint
CREATE UNIQUE INDEX `hackathons_slug_idx` ON `hackathons` (`slug`);--> statement-breakpoint
CREATE TABLE `judge_assignments` (
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
CREATE UNIQUE INDEX `judge_assignments_active_submission_idx` ON `judge_assignments` (`submission_id`) WHERE "judge_assignments"."status" in ('assigned', 'judge_started');--> statement-breakpoint
CREATE INDEX `judge_assignments_judge_idx` ON `judge_assignments` (`judge_user_id`);--> statement-breakpoint
CREATE TABLE `judge_criterion_scores` (
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
CREATE UNIQUE INDEX `judge_criterion_scores_assignment_criterion_idx` ON `judge_criterion_scores` (`judge_assignment_id`,`evaluation_criterion_id`);--> statement-breakpoint
CREATE TABLE `platform_documents` (
	`id` text PRIMARY KEY NOT NULL,
	`document_type` text NOT NULL,
	`version` integer NOT NULL,
	`title` text NOT NULL,
	`content` text NOT NULL,
	`published_at` text NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `platform_documents_type_version_idx` ON `platform_documents` (`document_type`,`version`);--> statement-breakpoint
CREATE TABLE `prize_eligibility_snapshots` (
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
CREATE UNIQUE INDEX `prize_eligibility_snapshots_hackathon_team_user_idx` ON `prize_eligibility_snapshots` (`hackathon_id`,`team_id`,`user_id`);--> statement-breakpoint
CREATE TABLE `prize_redemptions` (
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
CREATE TABLE `prizes` (
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
	CONSTRAINT "prizes_rank_order_check" CHECK("prizes"."rank_start" <= "prizes"."rank_end")
);
--> statement-breakpoint
CREATE TABLE `submissions` (
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
CREATE UNIQUE INDEX `submissions_active_team_idx` ON `submissions` (`team_id`) WHERE "submissions"."status" in ('draft', 'submitted', 'locked');--> statement-breakpoint
CREATE TABLE `team_join_requests` (
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
CREATE UNIQUE INDEX `team_join_requests_pending_team_user_idx` ON `team_join_requests` (`team_id`,`user_id`) WHERE "team_join_requests"."status" = 'pending';--> statement-breakpoint
CREATE TABLE `team_members` (
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
CREATE UNIQUE INDEX `team_members_team_user_active_idx` ON `team_members` (`team_id`,`user_id`) WHERE "team_members"."left_at" is null;--> statement-breakpoint
CREATE INDEX `team_members_user_idx` ON `team_members` (`user_id`);--> statement-breakpoint
CREATE TABLE `teams` (
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
CREATE UNIQUE INDEX `teams_hackathon_slug_idx` ON `teams` (`hackathon_id`,`slug`);--> statement-breakpoint
CREATE INDEX `teams_hackathon_idx` ON `teams` (`hackathon_id`);--> statement-breakpoint
CREATE TABLE `user_applications` (
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
CREATE UNIQUE INDEX `user_applications_hackathon_user_idx` ON `user_applications` (`hackathon_id`,`user_id`);--> statement-breakpoint
CREATE TABLE `user_platform_document_acceptances` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`platform_document_id` text NOT NULL,
	`accepted_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`platform_document_id`) REFERENCES `platform_documents`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `user_platform_document_acceptances_user_document_idx` ON `user_platform_document_acceptances` (`user_id`,`platform_document_id`);--> statement-breakpoint
CREATE TABLE `users` (
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
CREATE UNIQUE INDEX `users_auth0_subject_active_idx` ON `users` (`auth0_subject`) WHERE "users"."deleted_at" is null;--> statement-breakpoint
CREATE UNIQUE INDEX `users_email_active_idx` ON `users` (`email`) WHERE "users"."deleted_at" is null;
--> statement-breakpoint
CREATE TRIGGER `team_members_single_hackathon_membership_insert`
BEFORE INSERT ON `team_members`
WHEN NEW.`left_at` IS NULL
AND EXISTS (
  SELECT 1
  FROM `team_members` existing_member
  INNER JOIN `teams` existing_team ON existing_team.`id` = existing_member.`team_id`
  INNER JOIN `teams` next_team ON next_team.`id` = NEW.`team_id`
  WHERE existing_member.`user_id` = NEW.`user_id`
    AND existing_member.`left_at` IS NULL
    AND existing_team.`hackathon_id` = next_team.`hackathon_id`
)
BEGIN
  SELECT RAISE(ABORT, 'user already has an active team membership in this hackathon');
END;
--> statement-breakpoint
CREATE TRIGGER `team_members_single_hackathon_membership_update`
BEFORE UPDATE ON `team_members`
WHEN NEW.`left_at` IS NULL
AND EXISTS (
  SELECT 1
  FROM `team_members` existing_member
  INNER JOIN `teams` existing_team ON existing_team.`id` = existing_member.`team_id`
  INNER JOIN `teams` next_team ON next_team.`id` = NEW.`team_id`
  WHERE existing_member.`user_id` = NEW.`user_id`
    AND existing_member.`left_at` IS NULL
    AND existing_member.`id` != OLD.`id`
    AND existing_team.`hackathon_id` = next_team.`hackathon_id`
)
BEGIN
  SELECT RAISE(ABORT, 'user already has an active team membership in this hackathon');
END;
--> statement-breakpoint
CREATE TRIGGER `team_members_active_admin_guard`
BEFORE UPDATE OF `left_at`, `role` ON `team_members`
WHEN OLD.`left_at` IS NULL
AND OLD.`role` = 'admin'
AND (NEW.`left_at` IS NOT NULL OR NEW.`role` != 'admin')
AND NOT EXISTS (
  SELECT 1
  FROM `team_members` remaining_member
  WHERE remaining_member.`team_id` = OLD.`team_id`
    AND remaining_member.`id` != OLD.`id`
    AND remaining_member.`left_at` IS NULL
    AND remaining_member.`role` = 'admin'
)
BEGIN
  SELECT RAISE(ABORT, 'active teams must retain at least one active admin');
END;
--> statement-breakpoint
CREATE TRIGGER `team_members_post_submission_close_member_guard`
BEFORE UPDATE OF `left_at` ON `team_members`
WHEN OLD.`left_at` IS NULL
AND NEW.`left_at` IS NOT NULL
AND EXISTS (
  SELECT 1
  FROM `teams` team
  INNER JOIN `hackathons` hackathon ON hackathon.`id` = team.`hackathon_id`
  WHERE team.`id` = OLD.`team_id`
    AND hackathon.`state` NOT IN ('registration_open', 'submission_open')
)
AND NOT EXISTS (
  SELECT 1
  FROM `team_members` remaining_member
  WHERE remaining_member.`team_id` = OLD.`team_id`
    AND remaining_member.`id` != OLD.`id`
    AND remaining_member.`left_at` IS NULL
)
BEGIN
  SELECT RAISE(ABORT, 'teams must retain at least one active member after submission closes');
END;
