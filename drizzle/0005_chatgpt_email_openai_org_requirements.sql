ALTER TABLE `hackathons` ADD `require_chatgpt_email` integer DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `hackathons` ADD `require_openai_org_id` integer DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `users` ADD `chatgpt_email` text;--> statement-breakpoint
ALTER TABLE `users` ADD `openai_org_id` text;
