CREATE TABLE `hackathon_photos` (
	`id` text PRIMARY KEY NOT NULL,
	`hackathon_id` text NOT NULL,
	`uploaded_by_user_id` text NOT NULL,
	`file_name` text,
	`content_type` text NOT NULL,
	`width` integer NOT NULL,
	`height` integer NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	CHECK (`width` >= 1),
	CHECK (`height` >= 1),
	FOREIGN KEY (`hackathon_id`) REFERENCES `hackathons`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`uploaded_by_user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `hackathon_photos_hackathon_created_idx`
ON `hackathon_photos` (`hackathon_id`, `created_at`);
--> statement-breakpoint
CREATE INDEX `hackathon_photos_uploaded_by_idx`
ON `hackathon_photos` (`uploaded_by_user_id`);
