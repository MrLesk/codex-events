CREATE INDEX `prize_eligibility_snapshots_hackathon_user_team_idx`
ON `prize_eligibility_snapshots` (`hackathon_id`, `user_id`, `team_id`);
--> statement-breakpoint
CREATE INDEX `prize_redemptions_pending_user_created_idx`
ON `prize_redemptions` (`user_id`, `created_at`)
WHERE `status` = 'pending' AND `user_id` IS NOT NULL;
--> statement-breakpoint
CREATE INDEX `prize_redemptions_pending_team_created_idx`
ON `prize_redemptions` (`team_id`, `created_at`)
WHERE `status` = 'pending' AND `team_id` IS NOT NULL AND `user_id` IS NULL;
--> statement-breakpoint
CREATE INDEX `audit_logs_created_idx`
ON `audit_logs` (`created_at`);
--> statement-breakpoint
CREATE INDEX `audit_logs_entity_created_idx`
ON `audit_logs` (`entity_type`, `entity_id`, `created_at`);
--> statement-breakpoint
CREATE INDEX `audit_logs_metadata_hackathon_created_idx`
ON `audit_logs` (json_extract(`metadata`, '$.hackathonId'), `created_at`);
