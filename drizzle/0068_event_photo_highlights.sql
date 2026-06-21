ALTER TABLE `event_photos` ADD `is_highlighted` integer DEFAULT false NOT NULL;
--> statement-breakpoint
UPDATE `event_photos` SET `is_highlighted` = true;
