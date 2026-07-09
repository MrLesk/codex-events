ALTER TABLE `events` ADD `simplified_claiming_enabled` integer DEFAULT false NOT NULL;
--> statement-breakpoint
CREATE TABLE `event_attendee_eligibilities` (
	`id` text PRIMARY KEY NOT NULL,
	`event_id` text NOT NULL,
	`normalized_email` text NOT NULL,
	`first_name` text,
	`family_name` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`event_id`) REFERENCES `events`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `event_attendee_eligibilities_event_email_idx` ON `event_attendee_eligibilities` (`event_id`,`normalized_email`);
--> statement-breakpoint
CREATE INDEX `event_attendee_eligibilities_event_created_idx` ON `event_attendee_eligibilities` (`event_id`,`created_at`);
--> statement-breakpoint
ALTER TABLE `event_credit_codes` ADD `claimed_attendee_eligibility_id` text REFERENCES event_attendee_eligibilities(id);
--> statement-breakpoint
CREATE UNIQUE INDEX `event_credit_codes_claimed_attendee_eligibility_idx` ON `event_credit_codes` (`claimed_attendee_eligibility_id`) WHERE `claimed_attendee_eligibility_id` is not null;
--> statement-breakpoint
ALTER TABLE `user_applications` ADD `check_in_source` text;
--> statement-breakpoint
UPDATE `user_applications` SET `check_in_source` = 'luma' WHERE `checked_in_at` is not null;
