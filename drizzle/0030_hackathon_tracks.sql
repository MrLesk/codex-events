CREATE TABLE `hackathon_tracks` (
	`id` text PRIMARY KEY NOT NULL,
	`hackathon_id` text NOT NULL,
	`name` text NOT NULL,
	`description` text NOT NULL,
	`display_order` integer NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`hackathon_id`) REFERENCES `hackathons`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `hackathon_tracks_hackathon_display_order_idx` ON `hackathon_tracks` (`hackathon_id`,`display_order`);
--> statement-breakpoint
CREATE INDEX `hackathon_tracks_hackathon_idx` ON `hackathon_tracks` (`hackathon_id`);
--> statement-breakpoint
ALTER TABLE `submissions` ADD `track_id` text REFERENCES `hackathon_tracks`(`id`);
--> statement-breakpoint
CREATE INDEX `submissions_track_idx` ON `submissions` (`track_id`);
