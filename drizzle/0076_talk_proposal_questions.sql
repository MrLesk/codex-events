ALTER TABLE `events` ADD `talk_proposal_questions_json` text DEFAULT '[]' NOT NULL;
--> statement-breakpoint
ALTER TABLE `events` ADD `talk_proposal_questions_revision` integer DEFAULT 0 NOT NULL;
--> statement-breakpoint
ALTER TABLE `talk_proposals` ADD `question_set_revision` integer DEFAULT 0 NOT NULL;
--> statement-breakpoint
ALTER TABLE `talk_proposals` ADD `answers_json` text DEFAULT '[]' NOT NULL;
