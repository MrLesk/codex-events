ALTER TABLE `user_applications` ADD `checked_in_at` text;
--> statement-breakpoint
CREATE UNIQUE INDEX `hackathons_luma_event_api_id_idx` ON `hackathons` (`luma_event_api_id`);
