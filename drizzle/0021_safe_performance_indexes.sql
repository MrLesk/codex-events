CREATE INDEX `hackathon_role_assignments_user_created_idx`
ON `hackathon_role_assignments` (`user_id`, `created_at`);
--> statement-breakpoint
CREATE INDEX `hackathon_role_assignments_hackathon_judge_pool_created_idx`
ON `hackathon_role_assignments` (`hackathon_id`, `is_in_judge_pool`, `created_at`);
--> statement-breakpoint
CREATE INDEX `user_applications_user_submitted_idx`
ON `user_applications` (`user_id`, `submitted_at`);
--> statement-breakpoint
CREATE INDEX `user_applications_hackathon_submitted_idx`
ON `user_applications` (`hackathon_id`, `submitted_at`);
--> statement-breakpoint
CREATE INDEX `team_members_user_active_joined_idx`
ON `team_members` (`user_id`, `joined_at`, `created_at`)
WHERE `left_at` IS NULL;
--> statement-breakpoint
CREATE INDEX `team_members_team_active_joined_idx`
ON `team_members` (`team_id`, `joined_at`, `created_at`)
WHERE `left_at` IS NULL;
--> statement-breakpoint
CREATE INDEX `submissions_team_updated_idx`
ON `submissions` (`team_id`, `updated_at`);
--> statement-breakpoint
CREATE INDEX `judge_assignments_hackathon_status_judge_idx`
ON `judge_assignments` (`hackathon_id`, `status`, `judge_user_id`);
--> statement-breakpoint
CREATE INDEX `prizes_hackathon_display_order_idx`
ON `prizes` (`hackathon_id`, `display_order`);
