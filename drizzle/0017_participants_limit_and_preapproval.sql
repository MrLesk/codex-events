ALTER TABLE `hackathons` ADD `participants_limit` integer CHECK (`participants_limit` is null OR `participants_limit` >= 1);--> statement-breakpoint
ALTER TABLE `user_applications` ADD `pre_approval_status` text CHECK (`pre_approval_status` in ('approved', 'rejected') OR `pre_approval_status` is null);
