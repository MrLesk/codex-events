ALTER TABLE `hackathons` ADD `require_luma_profile` integer DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `users` ADD `luma_username` text;