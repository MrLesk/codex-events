CREATE TABLE `user_auth_identities` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL REFERENCES `users`(`id`),
	`auth0_subject` text NOT NULL,
	`created_at` text NOT NULL DEFAULT CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE UNIQUE INDEX `user_auth_identities_auth0_subject_idx` ON `user_auth_identities` (`auth0_subject`);
--> statement-breakpoint
CREATE INDEX `user_auth_identities_user_idx` ON `user_auth_identities` (`user_id`);
--> statement-breakpoint
INSERT INTO `user_auth_identities` (`id`, `user_id`, `auth0_subject`, `created_at`)
SELECT
	'user_auth_identity_' || replace(`id`, '-', '_'),
	`id`,
	`auth0_subject`,
	`created_at`
FROM `users`
WHERE `deleted_at` is null;
--> statement-breakpoint
CREATE TRIGGER `users_insert_primary_auth_identity`
AFTER INSERT ON `users`
WHEN NEW.`deleted_at` is null
BEGIN
	INSERT OR IGNORE INTO `user_auth_identities` (`id`, `user_id`, `auth0_subject`, `created_at`)
	VALUES (
		'user_auth_identity_' || replace(NEW.`id`, '-', '_'),
		NEW.`id`,
		NEW.`auth0_subject`,
		NEW.`created_at`
	);
END;
--> statement-breakpoint
CREATE TRIGGER `users_soft_delete_auth_identities`
AFTER UPDATE OF `deleted_at` ON `users`
WHEN NEW.`deleted_at` is not null
BEGIN
	DELETE FROM `user_auth_identities`
	WHERE `user_id` = NEW.`id`;
END;
