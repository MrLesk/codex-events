ALTER TABLE `events` ADD `media_revision` integer DEFAULT 0 NOT NULL;
--> statement-breakpoint
ALTER TABLE `platform_settings` ADD `media_revision` integer DEFAULT 0 NOT NULL;
