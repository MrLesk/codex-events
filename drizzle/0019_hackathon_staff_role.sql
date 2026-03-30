CREATE TABLE `__new_hackathon_role_assignments` (
	`id` text PRIMARY KEY NOT NULL,
	`hackathon_id` text NOT NULL,
	`user_id` text NOT NULL,
	`role` text NOT NULL,
	`is_in_judge_pool` integer DEFAULT false NOT NULL,
	`is_staff` integer DEFAULT false NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`hackathon_id`) REFERENCES `hackathons`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "hackathon_role_assignments_judge_pool_check" CHECK(("__new_hackathon_role_assignments"."role" != 'judge') or (("__new_hackathon_role_assignments"."is_in_judge_pool" = 1) and ("__new_hackathon_role_assignments"."is_staff" = 0))),
	CONSTRAINT "hackathon_role_assignments_staff_flag_check" CHECK(("__new_hackathon_role_assignments"."role" != 'staff') or (("__new_hackathon_role_assignments"."is_staff" = 1) and ("__new_hackathon_role_assignments"."is_in_judge_pool" = 0)))
);
--> statement-breakpoint
INSERT INTO `__new_hackathon_role_assignments` (`id`, `hackathon_id`, `user_id`, `role`, `is_in_judge_pool`, `is_staff`, `created_at`)
SELECT `id`, `hackathon_id`, `user_id`, `role`, `is_in_judge_pool`, 0, `created_at`
FROM `hackathon_role_assignments`;
--> statement-breakpoint
DROP TABLE `hackathon_role_assignments`;
--> statement-breakpoint
ALTER TABLE `__new_hackathon_role_assignments` RENAME TO `hackathon_role_assignments`;
--> statement-breakpoint
CREATE UNIQUE INDEX `hackathon_role_assignments_hackathon_user_idx` ON `hackathon_role_assignments` (`hackathon_id`,`user_id`);
