ALTER TABLE `event_role_assignments` ADD `staff_track_id` text REFERENCES `event_tracks`(`id`) ON DELETE SET NULL;
--> statement-breakpoint
CREATE TABLE `__new_event_role_assignments` (
  `id` text PRIMARY KEY NOT NULL,
  `event_id` text NOT NULL,
  `user_id` text NOT NULL,
  `role` text NOT NULL,
  `is_in_judge_pool` integer DEFAULT false NOT NULL,
  `is_staff` integer DEFAULT false NOT NULL,
  `staff_track_id` text,
  `created_at` text NOT NULL,
  FOREIGN KEY (`event_id`) REFERENCES `events`(`id`) ON UPDATE no action ON DELETE no action,
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
  FOREIGN KEY (`staff_track_id`) REFERENCES `event_tracks`(`id`) ON UPDATE no action ON DELETE set null,
  CONSTRAINT "event_role_assignments_judge_pool_check" CHECK((`role` != 'judge') or ((`is_in_judge_pool` = 1) and (`is_staff` = 0))),
  CONSTRAINT "event_role_assignments_staff_flag_check" CHECK((`role` != 'staff') or ((`is_staff` = 1) and (`is_in_judge_pool` = 0))),
  CONSTRAINT "event_role_assignments_staff_track_check" CHECK((`staff_track_id` is null) or (`is_staff` = 1))
);
--> statement-breakpoint
INSERT INTO `__new_event_role_assignments` (`id`, `event_id`, `user_id`, `role`, `is_in_judge_pool`, `is_staff`, `staff_track_id`, `created_at`)
SELECT `id`, `event_id`, `user_id`, `role`, `is_in_judge_pool`, `is_staff`, `staff_track_id`, `created_at`
FROM `event_role_assignments`;
--> statement-breakpoint
DROP TABLE `event_role_assignments`;
--> statement-breakpoint
ALTER TABLE `__new_event_role_assignments` RENAME TO `event_role_assignments`;
--> statement-breakpoint
CREATE UNIQUE INDEX `event_role_assignments_event_user_idx` ON `event_role_assignments` (`event_id`, `user_id`);
--> statement-breakpoint
CREATE INDEX `event_role_assignments_user_created_idx` ON `event_role_assignments` (`user_id`, `created_at`);
--> statement-breakpoint
CREATE INDEX `event_role_assignments_event_judge_pool_created_idx` ON `event_role_assignments` (`event_id`, `is_in_judge_pool`, `created_at`);
