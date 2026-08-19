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
--> statement-breakpoint
UPDATE `users`
SET
  `profile_icon_object_key` = 'users/' || `id` || '/profile-icon',
  `profile_icon_revision` = CASE
    WHEN `profile_icon_revision` < 1 THEN 1
    ELSE `profile_icon_revision`
  END
WHERE `profile_icon_updated_at` IS NOT NULL;
--> statement-breakpoint
UPDATE `events`
SET
  `background_image_object_key` = CASE
    WHEN `background_image_url` LIKE '%/api/public/events/%/images/background'
      THEN 'events/' || `id` || '/background-image'
    ELSE NULL
  END,
  `background_image_revision` = CASE
    WHEN `background_image_url` LIKE '%/api/public/events/%/images/background'
      THEN CASE WHEN `background_image_revision` < 1 THEN 1 ELSE `background_image_revision` END
    ELSE `background_image_revision`
  END,
  `banner_image_object_key` = CASE
    WHEN `banner_image_url` LIKE '%/api/public/events/%/images/banner'
      THEN 'events/' || `id` || '/banner-image'
    ELSE NULL
  END,
  `banner_image_revision` = CASE
    WHEN `banner_image_url` LIKE '%/api/public/events/%/images/banner'
      THEN CASE WHEN `banner_image_revision` < 1 THEN 1 ELSE `banner_image_revision` END
    ELSE `banner_image_revision`
  END,
  `public_content_revision` = CASE
    WHEN (
      `background_image_url` LIKE '%/api/public/events/%/images/background'
      OR `banner_image_url` LIKE '%/api/public/events/%/images/banner'
    ) AND `public_content_revision` < 1 THEN 1
    ELSE `public_content_revision`
  END;
--> statement-breakpoint
UPDATE `event_photos`
SET
  `object_key` = 'events/' || `event_id` || '/photos/' || `id`,
  `image_revision` = CASE WHEN `image_revision` < 1 THEN 1 ELSE `image_revision` END;
--> statement-breakpoint
UPDATE `platform_settings`
SET
  `default_event_background_image_object_key` = CASE
    WHEN `default_event_background_image_url` LIKE '%/api/public/platform/event-default-background-image'
      THEN 'platform/default-event-background-image'
    ELSE NULL
  END,
  `default_event_background_image_revision` = CASE
    WHEN `default_event_background_image_url` LIKE '%/api/public/platform/event-default-background-image'
      THEN CASE
        WHEN `default_event_background_image_revision` < 1 THEN 1
        ELSE `default_event_background_image_revision`
      END
    ELSE `default_event_background_image_revision`
  END;
