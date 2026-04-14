CREATE TABLE `hackathon_credit_offers` (
	`id` text PRIMARY KEY NOT NULL,
	`hackathon_id` text NOT NULL REFERENCES `hackathons`(`id`) ON DELETE cascade,
	`name` text NOT NULL,
	`description` text NOT NULL,
	`display_order` integer DEFAULT 0 NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE INDEX `hackathon_credit_offers_hackathon_display_order_idx` ON `hackathon_credit_offers` (`hackathon_id`,`display_order`);
--> statement-breakpoint
CREATE TABLE `hackathon_credit_codes` (
	`id` text PRIMARY KEY NOT NULL,
	`credit_offer_id` text NOT NULL REFERENCES `hackathon_credit_offers`(`id`) ON DELETE cascade,
	`value` text NOT NULL,
	`claimed_by_user_id` text REFERENCES `users`(`id`),
	`claimed_at` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE INDEX `hackathon_credit_codes_offer_claim_state_idx` ON `hackathon_credit_codes` (`credit_offer_id`,`claimed_by_user_id`,`created_at`);
--> statement-breakpoint
CREATE UNIQUE INDEX `hackathon_credit_codes_offer_claimed_user_idx` ON `hackathon_credit_codes` (`credit_offer_id`,`claimed_by_user_id`) WHERE `claimed_by_user_id` is not null;
