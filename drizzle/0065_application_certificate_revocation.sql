ALTER TABLE `user_applications` ADD `certificate_revoked_at` text;
--> statement-breakpoint
ALTER TABLE `user_applications` ADD `certificate_revoked_by_user_id` text REFERENCES users(`id`);
