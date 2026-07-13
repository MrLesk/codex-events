ALTER TABLE `event_credit_offers` ADD `simplified_claiming_only` integer DEFAULT false NOT NULL;
--> statement-breakpoint
UPDATE `event_credit_offers`
SET `simplified_claiming_only` = true
WHERE EXISTS (
	SELECT 1
	FROM `events`
	WHERE `events`.`id` = `event_credit_offers`.`event_id`
		AND `events`.`simplified_claiming_enabled` = true
)
	AND NOT EXISTS (
		SELECT 1
		FROM `event_credit_offers` `other_offer`
		WHERE `other_offer`.`event_id` = `event_credit_offers`.`event_id`
			AND `other_offer`.`id` <> `event_credit_offers`.`id`
	);
--> statement-breakpoint
CREATE UNIQUE INDEX `event_credit_offers_simplified_claiming_event_idx` ON `event_credit_offers` (`event_id`) WHERE `simplified_claiming_only` = true;
