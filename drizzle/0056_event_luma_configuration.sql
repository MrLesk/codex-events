ALTER TABLE `events` ADD `luma_api_key` text;--> statement-breakpoint
ALTER TABLE `events` ADD `luma_webhook_id` text;--> statement-breakpoint
ALTER TABLE `events` ADD `luma_webhook_secret` text;--> statement-breakpoint
ALTER TABLE `events` ADD `luma_webhook_status` text DEFAULT 'not_configured' NOT NULL CHECK (
  `luma_webhook_status` in ('not_configured', 'configured', 'failed')
);--> statement-breakpoint
ALTER TABLE `events` ADD `luma_webhook_error` text;--> statement-breakpoint
ALTER TABLE `events` ADD `luma_webhook_registered_at` text;
