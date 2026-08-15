ALTER TABLE `events` ADD `creation_flow` text DEFAULT 'classic' NOT NULL;
--> statement-breakpoint
ALTER TABLE `events` ADD `balance_score` integer;
--> statement-breakpoint
ALTER TABLE `events` ADD `balance_breakdown_json` text;
