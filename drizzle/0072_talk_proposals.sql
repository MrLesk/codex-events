ALTER TABLE `events` ADD `talk_proposals_enabled` integer DEFAULT false NOT NULL;
--> statement-breakpoint
ALTER TABLE `events` ADD `talk_proposal_opens_at` text;
--> statement-breakpoint
ALTER TABLE `events` ADD `talk_proposal_closes_at` text;
--> statement-breakpoint
CREATE TABLE `talk_proposals` (
	`id` text PRIMARY KEY NOT NULL,
	`event_id` text NOT NULL,
	`user_id` text NOT NULL,
	`status` text DEFAULT 'draft' NOT NULL,
	`title` text NOT NULL,
	`abstract` text NOT NULL,
	`demo_or_slides_url` text,
	`decision_message` text,
	`reviewed_by_user_id` text,
	`submitted_at` text,
	`withdrawn_at` text,
	`revised_at` text,
	`decided_at` text,
	`decision_email_delivery_id` text,
	`decision_email_state` text,
	`decision_email_enqueue_attempts` integer DEFAULT 0 NOT NULL,
	`decision_email_last_enqueue_attempted_at` text,
	`decision_email_enqueue_lease_token` text,
	`decision_email_enqueue_lease_expires_at` text,
	`decision_email_queued_at` text,
	`decision_email_delivery_attempts` integer DEFAULT 0 NOT NULL,
	`decision_email_delivery_lease_token` text,
	`decision_email_delivery_lease_expires_at` text,
	`decision_email_last_failure_code` text,
	`decision_email_last_attempted_at` text,
	`decision_email_sent_at` text,
	`decision_email_failed_at` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`event_id`) REFERENCES `events`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`reviewed_by_user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE set null,
	CONSTRAINT `talk_proposals_status_check` CHECK (`status` in ('draft', 'submitted', 'withdrawn', 'accepted', 'rejected')),
	CONSTRAINT `talk_proposals_decision_email_state_check` CHECK (`decision_email_state` is null or `decision_email_state` in ('pending', 'enqueued', 'delivering', 'retryable', 'sent', 'failed'))
);
--> statement-breakpoint
CREATE UNIQUE INDEX `talk_proposals_event_user_idx` ON `talk_proposals` (`event_id`,`user_id`);
--> statement-breakpoint
CREATE UNIQUE INDEX `talk_proposals_decision_email_delivery_idx` ON `talk_proposals` (`decision_email_delivery_id`);
--> statement-breakpoint
CREATE INDEX `talk_proposals_event_status_submitted_idx` ON `talk_proposals` (`event_id`,`status`,`submitted_at`);
--> statement-breakpoint
CREATE INDEX `talk_proposals_event_updated_idx` ON `talk_proposals` (`event_id`,`updated_at`);
--> statement-breakpoint
CREATE INDEX `talk_proposals_decision_email_recovery_idx` ON `talk_proposals` (`decision_email_state`,`decision_email_enqueue_lease_expires_at`,`updated_at`);
