ALTER TABLE `events` RENAME COLUMN `media_revision` TO `public_content_revision`;
--> statement-breakpoint
ALTER TABLE `platform_settings` RENAME COLUMN `media_revision` TO `default_event_background_image_revision`;
--> statement-breakpoint
ALTER TABLE `users` ADD `profile_icon_object_key` text;
--> statement-breakpoint
ALTER TABLE `users` ADD `profile_icon_revision` integer DEFAULT 0 NOT NULL;
--> statement-breakpoint
ALTER TABLE `events` ADD `background_image_object_key` text;
--> statement-breakpoint
ALTER TABLE `events` ADD `background_image_revision` integer DEFAULT 0 NOT NULL;
--> statement-breakpoint
ALTER TABLE `events` ADD `banner_image_object_key` text;
--> statement-breakpoint
ALTER TABLE `events` ADD `banner_image_revision` integer DEFAULT 0 NOT NULL;
--> statement-breakpoint
ALTER TABLE `event_photos` ADD `object_key` text;
--> statement-breakpoint
ALTER TABLE `event_photos` ADD `image_revision` integer DEFAULT 0 NOT NULL;
--> statement-breakpoint
ALTER TABLE `platform_settings` ADD `default_event_background_image_object_key` text;
