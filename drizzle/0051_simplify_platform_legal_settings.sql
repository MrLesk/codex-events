CREATE TABLE `__new_platform_legal_settings` (
  `id` text PRIMARY KEY NOT NULL,
  `support_email` text NOT NULL,
  `imprint_content` text NOT NULL,
  `created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
  `updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
  CONSTRAINT `platform_legal_settings_singleton_id_check` CHECK(`id` = 'default')
);

INSERT INTO `__new_platform_legal_settings` (
  `id`,
  `support_email`,
  `imprint_content`,
  `created_at`,
  `updated_at`
)
SELECT
  `id`,
  `support_email`,
  trim(
    CASE
      WHEN `imprint_content` LIKE '%' || `operator_name` || '%'
        AND `imprint_content` LIKE '%' || `operator_address` || '%'
        AND `imprint_content` LIKE '%' || `support_email` || '%'
        AND `imprint_content` LIKE '%' || `privacy_email` || '%'
        AND `imprint_content` LIKE '%' || `legal_contact_languages` || '%'
        AND `imprint_content` LIKE '%' || `business_purpose` || '%'
        AND `imprint_content` LIKE '%' || `editorial_line` || '%'
        THEN `imprint_content`
      ELSE trim(
        '## Operator' || char(10) || char(10) ||
        `operator_name` || char(10) ||
        `operator_address` || char(10) || char(10) ||
        '## Platform purpose' || char(10) || char(10) ||
        `business_purpose` || char(10) || char(10) ||
        '## Editorial focus' || char(10) || char(10) ||
        `editorial_line` || char(10) || char(10) ||
        '## Contact' || char(10) || char(10) ||
        '- Support and legal contact: ' || `support_email` || char(10) ||
        '- Privacy contact: ' || `privacy_email` || char(10) ||
        '- Languages accepted for legal and DSA communications: ' || `legal_contact_languages` || char(10) || char(10) ||
        `imprint_content`
      )
    END
  ),
  `created_at`,
  `updated_at`
FROM `platform_legal_settings`;

DROP TABLE `platform_legal_settings`;
ALTER TABLE `__new_platform_legal_settings` RENAME TO `platform_legal_settings`;
