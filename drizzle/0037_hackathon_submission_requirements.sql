ALTER TABLE `hackathons`
ADD `require_submission_summary` integer DEFAULT false NOT NULL;
--> statement-breakpoint
ALTER TABLE `hackathons`
ADD `require_submission_repository_url` integer DEFAULT false NOT NULL;
--> statement-breakpoint
ALTER TABLE `hackathons`
ADD `require_submission_demo_url` integer DEFAULT false NOT NULL;
