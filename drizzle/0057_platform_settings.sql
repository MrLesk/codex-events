CREATE TABLE `platform_settings` (
  `id` text PRIMARY KEY NOT NULL,
  `default_event_background_image_url` text,
  `created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
  `updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
  CONSTRAINT `platform_settings_singleton_id_check` CHECK(`id` = 'default')
);
