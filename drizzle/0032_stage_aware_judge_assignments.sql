ALTER TABLE `hackathons`
ADD `pitch_finalist_submission_ids_json` text DEFAULT '[]' NOT NULL;
--> statement-breakpoint
CREATE TABLE `__new_judge_assignments` (
	`id` text PRIMARY KEY NOT NULL,
	`hackathon_id` text NOT NULL,
	`submission_id` text NOT NULL,
	`judge_user_id` text NOT NULL,
	`review_stage` text DEFAULT 'blind_review' NOT NULL,
	`blind_review_slot` integer DEFAULT 1,
	`status` text DEFAULT 'assigned' NOT NULL,
	`pitch_score` integer,
	`pitch_comment` text,
	`assigned_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`started_at` text,
	`completed_at` text,
	`skipped_at` text,
	`skipped_by_user_id` text,
	`skip_reason` text,
	`ineligibility_status` text DEFAULT 'eligible' NOT NULL,
	`ineligibility_reason` text,
	`ineligibility_marked_at` text,
	`ineligibility_marked_by_user_id` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	CHECK (
		(`review_stage` = 'blind_review'
			and `blind_review_slot` in (1, 2)
			and `pitch_score` is null
			and `pitch_comment` is null)
		or (`review_stage` = 'pitch_review'
			and `blind_review_slot` is null)
	),
	CHECK (`pitch_score` is null or (`pitch_score` >= 0 and `pitch_score` <= 10)),
	FOREIGN KEY (`hackathon_id`) REFERENCES `hackathons`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`submission_id`) REFERENCES `submissions`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`judge_user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`skipped_by_user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`ineligibility_marked_by_user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
INSERT INTO `__new_judge_assignments`(
	"id",
	"hackathon_id",
	"submission_id",
	"judge_user_id",
	"review_stage",
	"blind_review_slot",
	"status",
	"pitch_score",
	"pitch_comment",
	"assigned_at",
	"started_at",
	"completed_at",
	"skipped_at",
	"skipped_by_user_id",
	"skip_reason",
	"ineligibility_status",
	"ineligibility_reason",
	"ineligibility_marked_at",
	"ineligibility_marked_by_user_id",
	"created_at"
) SELECT
	"id",
	"hackathon_id",
	"submission_id",
	"judge_user_id",
	'blind_review',
	1,
	"status",
	null,
	null,
	"assigned_at",
	"started_at",
	"completed_at",
	"skipped_at",
	"skipped_by_user_id",
	"skip_reason",
	"ineligibility_status",
	"ineligibility_reason",
	"ineligibility_marked_at",
	"ineligibility_marked_by_user_id",
	"created_at"
FROM `judge_assignments`;
--> statement-breakpoint
DROP TABLE `judge_assignments`;
--> statement-breakpoint
ALTER TABLE `__new_judge_assignments` RENAME TO `judge_assignments`;
--> statement-breakpoint
CREATE UNIQUE INDEX `judge_assignments_active_blind_submission_slot_idx`
ON `judge_assignments` (`submission_id`, `blind_review_slot`)
WHERE "judge_assignments"."review_stage" = 'blind_review'
	and "judge_assignments"."status" in ('assigned', 'judge_started');
--> statement-breakpoint
CREATE UNIQUE INDEX `judge_assignments_pitch_submission_judge_idx`
ON `judge_assignments` (`submission_id`, `judge_user_id`)
WHERE "judge_assignments"."review_stage" = 'pitch_review';
--> statement-breakpoint
CREATE INDEX `judge_assignments_judge_idx`
ON `judge_assignments` (`judge_user_id`);
--> statement-breakpoint
CREATE INDEX `judge_assignments_hackathon_stage_status_judge_idx`
ON `judge_assignments` (`hackathon_id`, `review_stage`, `status`, `judge_user_id`);
