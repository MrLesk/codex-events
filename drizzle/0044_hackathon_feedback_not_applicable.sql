CREATE TABLE `__new_hackathon_feedback` (
	`id` text PRIMARY KEY NOT NULL,
	`hackathon_id` text NOT NULL,
	`food_rating` integer,
	`staff_rating` integer,
	`organization_rating` integer,
	`platform_rating` integer,
	`judges_rating` integer,
	`venue_rating` integer,
	`participants_community_rating` integer,
	`communication_before_rating` integer,
	`communication_during_rating` integer,
	`rules_fairness_rating` integer,
	`overall_experience_rating` integer,
	`schedule_pacing_rating` integer,
	`technical_setup_rating` integer,
	`safety_accessibility_inclusion_rating` integer,
	`outcomes_rating` integer,
	`comment` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	CHECK (`food_rating` is null or (`food_rating` >= 1 and `food_rating` <= 5)),
	CHECK (`staff_rating` is null or (`staff_rating` >= 1 and `staff_rating` <= 5)),
	CHECK (`organization_rating` is null or (`organization_rating` >= 1 and `organization_rating` <= 5)),
	CHECK (`platform_rating` is null or (`platform_rating` >= 1 and `platform_rating` <= 5)),
	CHECK (`judges_rating` is null or (`judges_rating` >= 1 and `judges_rating` <= 5)),
	CHECK (`venue_rating` is null or (`venue_rating` >= 1 and `venue_rating` <= 5)),
	CHECK (`participants_community_rating` is null or (`participants_community_rating` >= 1 and `participants_community_rating` <= 5)),
	CHECK (`communication_before_rating` is null or (`communication_before_rating` >= 1 and `communication_before_rating` <= 5)),
	CHECK (`communication_during_rating` is null or (`communication_during_rating` >= 1 and `communication_during_rating` <= 5)),
	CHECK (`rules_fairness_rating` is null or (`rules_fairness_rating` >= 1 and `rules_fairness_rating` <= 5)),
	CHECK (`overall_experience_rating` is null or (`overall_experience_rating` >= 1 and `overall_experience_rating` <= 5)),
	CHECK (`schedule_pacing_rating` is null or (`schedule_pacing_rating` >= 1 and `schedule_pacing_rating` <= 5)),
	CHECK (`technical_setup_rating` is null or (`technical_setup_rating` >= 1 and `technical_setup_rating` <= 5)),
	CHECK (`safety_accessibility_inclusion_rating` is null or (`safety_accessibility_inclusion_rating` >= 1 and `safety_accessibility_inclusion_rating` <= 5)),
	CHECK (`outcomes_rating` is null or (`outcomes_rating` >= 1 and `outcomes_rating` <= 5)),
	FOREIGN KEY (`hackathon_id`) REFERENCES `hackathons`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
INSERT INTO `__new_hackathon_feedback`(
	`id`,
	`hackathon_id`,
	`food_rating`,
	`staff_rating`,
	`organization_rating`,
	`platform_rating`,
	`judges_rating`,
	`venue_rating`,
	`participants_community_rating`,
	`communication_before_rating`,
	`communication_during_rating`,
	`rules_fairness_rating`,
	`overall_experience_rating`,
	`schedule_pacing_rating`,
	`technical_setup_rating`,
	`safety_accessibility_inclusion_rating`,
	`outcomes_rating`,
	`comment`,
	`created_at`
)
SELECT
	`id`,
	`hackathon_id`,
	`food_rating`,
	`staff_rating`,
	`organization_rating`,
	`platform_rating`,
	`judges_rating`,
	`venue_rating`,
	`participants_community_rating`,
	`communication_before_rating`,
	`communication_during_rating`,
	`rules_fairness_rating`,
	`overall_experience_rating`,
	`schedule_pacing_rating`,
	`technical_setup_rating`,
	`safety_accessibility_inclusion_rating`,
	`outcomes_rating`,
	`comment`,
	`created_at`
FROM `hackathon_feedback`;
--> statement-breakpoint
DROP TABLE `hackathon_feedback`;
--> statement-breakpoint
ALTER TABLE `__new_hackathon_feedback` RENAME TO `hackathon_feedback`;
--> statement-breakpoint
CREATE INDEX `hackathon_feedback_hackathon_created_idx`
ON `hackathon_feedback` (`hackathon_id`, `created_at`);
