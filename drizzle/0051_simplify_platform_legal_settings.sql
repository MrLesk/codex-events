DROP TABLE IF EXISTS `__new_platform_legal_settings`;

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
      WHEN instr(`imprint_content`, `operator_name`) > 0
        AND instr(`imprint_content`, `operator_address`) > 0
        AND instr(`imprint_content`, `support_email`) > 0
        AND instr(`imprint_content`, `privacy_email`) > 0
        AND instr(`imprint_content`, `legal_contact_languages`) > 0
        AND instr(`imprint_content`, `business_purpose`) > 0
        AND instr(`imprint_content`, `editorial_line`) > 0
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
