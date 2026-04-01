ALTER TABLE `user_applications` ADD `luma_sync_status` text CHECK (
	`luma_sync_status` in (
		'not_synced',
		'approve_synced',
		'reject_synced',
		'approve_failed',
		'reject_failed'
	) OR `luma_sync_status` is null
);
