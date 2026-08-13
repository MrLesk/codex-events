CREATE TABLE `mcp_access_tokens` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`name` text NOT NULL,
	`display_prefix` text NOT NULL,
	`secret_hash` text NOT NULL,
	`expires_at` text NOT NULL,
	`last_used_at` text,
	`revoked_at` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `mcp_access_tokens_secret_hash_idx` ON `mcp_access_tokens` (`secret_hash`);
--> statement-breakpoint
CREATE INDEX `mcp_access_tokens_user_created_idx` ON `mcp_access_tokens` (`user_id`,`created_at`);
--> statement-breakpoint
CREATE INDEX `mcp_access_tokens_user_active_idx` ON `mcp_access_tokens` (`user_id`,`expires_at`) WHERE `revoked_at` is null;
