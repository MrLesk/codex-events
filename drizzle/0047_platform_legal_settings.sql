CREATE TABLE `platform_legal_settings` (
  `id` text PRIMARY KEY NOT NULL,
  `operator_name` text NOT NULL,
  `operator_address` text NOT NULL,
  `support_email` text NOT NULL,
  `privacy_email` text NOT NULL,
  `legal_contact_languages` text NOT NULL,
  `business_purpose` text NOT NULL,
  `editorial_line` text NOT NULL,
  `imprint_content` text NOT NULL,
  `created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
  `updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
  CONSTRAINT `platform_legal_settings_singleton_id_check` CHECK(`id` = 'default')
);
