ALTER TABLE `user_applications` ADD `check_in_override_status` text;
--> statement-breakpoint
ALTER TABLE `user_applications` ADD `check_in_override_at` text;
--> statement-breakpoint
ALTER TABLE `user_applications` ADD `check_in_override_by_user_id` text REFERENCES users(`id`);
