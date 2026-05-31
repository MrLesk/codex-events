ALTER TABLE `events` ADD `application_x_profile_visible` integer DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE `events` ADD `application_linkedin_profile_visible` integer DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE `events` ADD `application_github_profile_visible` integer DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE `events` ADD `application_chatgpt_email_visible` integer DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `events` ADD `application_openai_org_id_visible` integer DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `events` ADD `application_luma_email_visible` integer DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `events` ADD `application_why_this_event_visible` integer DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE `events` ADD `application_proof_of_execution_visible` integer DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE `events` ADD `application_team_intent_visible` integer DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE `events` ADD `require_team_intent` integer DEFAULT false NOT NULL;--> statement-breakpoint
UPDATE `events` SET `application_chatgpt_email_visible` = 1 WHERE `require_chatgpt_email` = 1;--> statement-breakpoint
UPDATE `events` SET `application_openai_org_id_visible` = 1 WHERE `require_openai_org_id` = 1;--> statement-breakpoint
UPDATE `events` SET `application_luma_email_visible` = 1 WHERE `require_luma_profile` = 1;
