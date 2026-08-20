CREATE TABLE `media_cleanup_outbox` (
	`id` text PRIMARY KEY NOT NULL,
	`kind` text NOT NULL,
	`object_key` text NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`available_at` text NOT NULL,
	`attempt_count` integer DEFAULT 0 NOT NULL,
	`last_attempted_at` text,
	`last_error` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	CONSTRAINT `media_cleanup_outbox_kind_check` CHECK (`kind` in ('event_image', 'event_photo', 'platform_default_event_background', 'profile_icon')),
	CONSTRAINT `media_cleanup_outbox_status_check` CHECK (`status` in ('pending', 'quarantined')),
	CONSTRAINT `media_cleanup_outbox_attempt_count_check` CHECK (`attempt_count` >= 0)
);
--> statement-breakpoint
CREATE UNIQUE INDEX `media_cleanup_outbox_kind_object_idx` ON `media_cleanup_outbox` (`kind`, `object_key`);
--> statement-breakpoint
CREATE INDEX `media_cleanup_outbox_available_idx` ON `media_cleanup_outbox` (`available_at`, `created_at`);
--> statement-breakpoint
CREATE TRIGGER `events_background_image_cleanup_outbox_after_update`
AFTER UPDATE OF `background_image_object_key` ON `events`
WHEN OLD.`background_image_object_key` IS NOT NULL
  AND (NEW.`background_image_object_key` IS NULL OR OLD.`background_image_object_key` <> NEW.`background_image_object_key`)
BEGIN
	INSERT INTO `media_cleanup_outbox` (`id`, `kind`, `object_key`, `available_at`)
	VALUES (lower(hex(randomblob(16))), 'event_image', OLD.`background_image_object_key`, strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '+30 seconds'))
	ON CONFLICT (`kind`, `object_key`) DO NOTHING;
END;
--> statement-breakpoint
CREATE TRIGGER `events_banner_image_cleanup_outbox_after_update`
AFTER UPDATE OF `banner_image_object_key` ON `events`
WHEN OLD.`banner_image_object_key` IS NOT NULL
  AND (NEW.`banner_image_object_key` IS NULL OR OLD.`banner_image_object_key` <> NEW.`banner_image_object_key`)
BEGIN
	INSERT INTO `media_cleanup_outbox` (`id`, `kind`, `object_key`, `available_at`)
	VALUES (lower(hex(randomblob(16))), 'event_image', OLD.`banner_image_object_key`, strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '+30 seconds'))
	ON CONFLICT (`kind`, `object_key`) DO NOTHING;
END;
--> statement-breakpoint
CREATE TRIGGER `event_photos_cleanup_outbox_after_update`
AFTER UPDATE OF `object_key` ON `event_photos`
WHEN OLD.`object_key` IS NOT NULL
  AND (NEW.`object_key` IS NULL OR OLD.`object_key` <> NEW.`object_key`)
BEGIN
	INSERT INTO `media_cleanup_outbox` (`id`, `kind`, `object_key`, `available_at`)
	VALUES (lower(hex(randomblob(16))), 'event_photo', OLD.`object_key`, strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '+30 seconds'))
	ON CONFLICT (`kind`, `object_key`) DO NOTHING;
END;
--> statement-breakpoint
CREATE TRIGGER `event_photos_cleanup_outbox_after_delete`
AFTER DELETE ON `event_photos`
WHEN OLD.`object_key` IS NOT NULL
BEGIN
	INSERT INTO `media_cleanup_outbox` (`id`, `kind`, `object_key`, `available_at`)
	VALUES (lower(hex(randomblob(16))), 'event_photo', OLD.`object_key`, strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '+30 seconds'))
	ON CONFLICT (`kind`, `object_key`) DO NOTHING;
END;
--> statement-breakpoint
CREATE TRIGGER `platform_default_event_background_cleanup_outbox_after_update`
AFTER UPDATE OF `default_event_background_image_object_key` ON `platform_settings`
WHEN OLD.`default_event_background_image_object_key` IS NOT NULL
  AND (NEW.`default_event_background_image_object_key` IS NULL OR OLD.`default_event_background_image_object_key` <> NEW.`default_event_background_image_object_key`)
BEGIN
	INSERT INTO `media_cleanup_outbox` (`id`, `kind`, `object_key`, `available_at`)
	VALUES (lower(hex(randomblob(16))), 'platform_default_event_background', OLD.`default_event_background_image_object_key`, strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '+30 seconds'))
	ON CONFLICT (`kind`, `object_key`) DO NOTHING;
END;
--> statement-breakpoint
CREATE TRIGGER `users_profile_icon_cleanup_outbox_after_update`
AFTER UPDATE OF `profile_icon_object_key` ON `users`
WHEN OLD.`profile_icon_object_key` IS NOT NULL
  AND (NEW.`profile_icon_object_key` IS NULL OR OLD.`profile_icon_object_key` <> NEW.`profile_icon_object_key`)
BEGIN
	INSERT INTO `media_cleanup_outbox` (`id`, `kind`, `object_key`, `available_at`)
	VALUES (lower(hex(randomblob(16))), 'profile_icon', OLD.`profile_icon_object_key`, strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '+30 seconds'))
	ON CONFLICT (`kind`, `object_key`) DO NOTHING;
END;
