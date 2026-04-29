CREATE INDEX `user_applications_hackathon_status_submitted_idx`
ON `user_applications` (`hackathon_id`, `status`, `submitted_at`);
--> statement-breakpoint
CREATE INDEX `teams_hackathon_name_created_idx`
ON `teams` (`hackathon_id`, `name`, `created_at`);
--> statement-breakpoint
CREATE INDEX `submissions_team_status_created_idx`
ON `submissions` (`team_id`, `status`, `created_at`);
--> statement-breakpoint
CREATE INDEX `submissions_public_status_team_idx`
ON `submissions` (`is_publicly_visible`, `status`, `team_id`);
--> statement-breakpoint
CREATE INDEX `judge_assignments_hackathon_submission_stage_status_idx`
ON `judge_assignments` (`hackathon_id`, `submission_id`, `review_stage`, `status`);
--> statement-breakpoint
CREATE INDEX `judge_criterion_scores_assignment_created_idx`
ON `judge_criterion_scores` (`judge_assignment_id`, `created_at`);
--> statement-breakpoint
CREATE INDEX `prize_eligibility_snapshots_hackathon_team_created_idx`
ON `prize_eligibility_snapshots` (`hackathon_id`, `team_id`, `created_at`);
--> statement-breakpoint
CREATE INDEX `prize_redemptions_prize_created_idx`
ON `prize_redemptions` (`prize_id`, `created_at`);
--> statement-breakpoint
CREATE INDEX `prize_redemptions_team_idx`
ON `prize_redemptions` (`team_id`);
--> statement-breakpoint
CREATE TABLE `hackathon_outcome_caches` (
  `hackathon_id` text PRIMARY KEY NOT NULL,
  `generation_id` text NOT NULL,
  `generated_at` text NOT NULL,
  `updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
  FOREIGN KEY (`hackathon_id`) REFERENCES `hackathons`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `hackathon_outcome_caches_updated_idx`
ON `hackathon_outcome_caches` (`updated_at`);
--> statement-breakpoint
CREATE TABLE `hackathon_outcome_cache_entries` (
  `id` text PRIMARY KEY NOT NULL,
  `hackathon_id` text NOT NULL,
  `generation_id` text NOT NULL,
  `collection` text NOT NULL,
  `display_order` integer NOT NULL,
  `payload_json` text NOT NULL,
  `created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
  FOREIGN KEY (`hackathon_id`) REFERENCES `hackathons`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `hackathon_outcome_cache_entries_generation_order_idx`
ON `hackathon_outcome_cache_entries` (`hackathon_id`, `generation_id`, `collection`, `display_order`);
--> statement-breakpoint
CREATE INDEX `hackathon_outcome_cache_entries_hackathon_generation_idx`
ON `hackathon_outcome_cache_entries` (`hackathon_id`, `generation_id`);
--> statement-breakpoint
CREATE INDEX `audit_logs_submission_disqualified_created_idx`
ON `audit_logs` (`entity_type`, `action`, `entity_id`, `created_at`)
WHERE `entity_type` = 'submission' AND `action` = 'submission.disqualified';
