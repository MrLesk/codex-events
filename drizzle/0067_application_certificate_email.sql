ALTER TABLE `user_applications` ADD `certificate_email_queued_at` text;
--> statement-breakpoint
ALTER TABLE `user_applications` ADD `certificate_email_queued_by_user_id` text REFERENCES users(`id`);
--> statement-breakpoint
ALTER TABLE `user_applications` ADD `certificate_email_sent_at` text;
