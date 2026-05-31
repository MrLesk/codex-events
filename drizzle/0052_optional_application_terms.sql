CREATE TABLE `__new_user_applications` (
  `id` text PRIMARY KEY NOT NULL,
  `event_id` text NOT NULL,
  `user_id` text NOT NULL,
  `status` text DEFAULT 'submitted' NOT NULL,
  `submitted_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
  `withdrawn_at` text,
  `checked_in_at` text,
  `reviewed_at` text,
  `reviewed_by_user_id` text,
  `pre_approval_status` text CHECK (`pre_approval_status` in ('approved', 'rejected') OR `pre_approval_status` is null),
  `luma_sync_status` text CHECK (
    `luma_sync_status` in (
      'not_synced',
      'approve_synced',
      'reject_synced',
      'approve_failed',
      'reject_failed'
    ) OR `luma_sync_status` is null
  ),
  `application_terms_document_id` text,
  `application_terms_accepted_at` text,
  `registration_details_json` text NOT NULL DEFAULT '{"teamIntent":"unknown","teamMembers":[],"inPersonAttendanceCommitment":false,"whyThisEvent":"","proofOfExecutionUrl":""}',
  `created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
  `updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
  FOREIGN KEY (`event_id`) REFERENCES `events`(`id`) ON UPDATE no action ON DELETE no action,
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
  FOREIGN KEY (`reviewed_by_user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
  FOREIGN KEY (`application_terms_document_id`) REFERENCES `event_terms_documents`(`id`) ON UPDATE no action ON DELETE no action
);

INSERT INTO `__new_user_applications` (
  `id`,
  `event_id`,
  `user_id`,
  `status`,
  `submitted_at`,
  `withdrawn_at`,
  `checked_in_at`,
  `reviewed_at`,
  `reviewed_by_user_id`,
  `pre_approval_status`,
  `luma_sync_status`,
  `application_terms_document_id`,
  `application_terms_accepted_at`,
  `registration_details_json`,
  `created_at`,
  `updated_at`
)
SELECT
  `id`,
  `event_id`,
  `user_id`,
  `status`,
  `submitted_at`,
  `withdrawn_at`,
  `checked_in_at`,
  `reviewed_at`,
  `reviewed_by_user_id`,
  `pre_approval_status`,
  `luma_sync_status`,
  `application_terms_document_id`,
  `application_terms_accepted_at`,
  `registration_details_json`,
  `created_at`,
  `updated_at`
FROM `user_applications`;

DROP TABLE `user_applications`;
ALTER TABLE `__new_user_applications` RENAME TO `user_applications`;

CREATE UNIQUE INDEX `user_applications_event_user_idx` ON `user_applications` (`event_id`, `user_id`);
CREATE INDEX `user_applications_user_submitted_idx` ON `user_applications` (`user_id`, `submitted_at`);
CREATE INDEX `user_applications_event_submitted_idx` ON `user_applications` (`event_id`, `submitted_at`);
CREATE INDEX `user_applications_event_status_submitted_idx` ON `user_applications` (`event_id`, `status`, `submitted_at`);
