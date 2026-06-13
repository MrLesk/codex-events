ALTER TABLE `event_tracks` RENAME COLUMN `description` TO `short_description`;
--> statement-breakpoint
ALTER TABLE `event_tracks` ADD `full_description` text DEFAULT '' NOT NULL;
--> statement-breakpoint
ALTER TABLE `event_tracks` ADD `staff_instructions` text DEFAULT '' NOT NULL;
--> statement-breakpoint
ALTER TABLE `user_applications` ADD `selected_track_id` text REFERENCES `event_tracks`(`id`) ON DELETE SET NULL;
--> statement-breakpoint
CREATE INDEX `user_applications_event_selected_track_idx` ON `user_applications` (`event_id`, `selected_track_id`);
