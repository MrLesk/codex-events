DROP TRIGGER IF EXISTS `hackathon_terms_documents_current_application_reference_update_guard`;--> statement-breakpoint
DROP TRIGGER IF EXISTS `hackathon_terms_documents_current_application_reference_delete_guard`;--> statement-breakpoint
DROP TRIGGER IF EXISTS `hackathon_terms_documents_current_winner_reference_update_guard`;--> statement-breakpoint
DROP TRIGGER IF EXISTS `hackathon_terms_documents_current_winner_reference_delete_guard`;--> statement-breakpoint
DROP TRIGGER IF EXISTS `hackathons_current_application_terms_insert_guard`;--> statement-breakpoint
DROP TRIGGER IF EXISTS `hackathons_current_application_terms_update_guard`;--> statement-breakpoint
DROP TRIGGER IF EXISTS `hackathons_current_winner_terms_insert_guard`;--> statement-breakpoint
DROP TRIGGER IF EXISTS `hackathons_current_winner_terms_update_guard`;--> statement-breakpoint

CREATE TABLE `__new_hackathon_terms_documents` (
	`id` text PRIMARY KEY NOT NULL,
	`hackathon_id` text NOT NULL,
	`document_type` text NOT NULL,
	`version` integer NOT NULL,
	`title` text NOT NULL,
	`content` text NOT NULL,
	`published_at` text NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`hackathon_id`) REFERENCES `hackathons`(`id`) ON UPDATE no action ON DELETE cascade
);--> statement-breakpoint
INSERT INTO `__new_hackathon_terms_documents`("id", "hackathon_id", "document_type", "version", "title", "content", "published_at", "created_at")
SELECT "id", "hackathon_id", "document_type", "version", "title", "content", "published_at", "created_at"
FROM `hackathon_terms_documents`;--> statement-breakpoint
DROP TABLE `hackathon_terms_documents`;--> statement-breakpoint
ALTER TABLE `__new_hackathon_terms_documents` RENAME TO `hackathon_terms_documents`;--> statement-breakpoint
CREATE UNIQUE INDEX `hackathon_terms_documents_hackathon_type_version_idx`
ON `hackathon_terms_documents` (`hackathon_id`, `document_type`, `version`);--> statement-breakpoint

CREATE TRIGGER `hackathon_terms_documents_current_application_reference_update_guard`
BEFORE UPDATE OF `hackathon_id`, `document_type` ON `hackathon_terms_documents`
FOR EACH ROW
WHEN EXISTS (
  SELECT 1
  FROM `hackathons` `hackathon`
  WHERE `hackathon`.`current_application_terms_document_id` = OLD.`id`
    AND (
      NEW.`hackathon_id` != `hackathon`.`id`
      OR NEW.`document_type` != 'application_terms'
    )
)
BEGIN
  SELECT RAISE(ABORT, 'hackathon_current_application_terms_document_invalid');
END;--> statement-breakpoint

CREATE TRIGGER `hackathon_terms_documents_current_application_reference_delete_guard`
BEFORE DELETE ON `hackathon_terms_documents`
FOR EACH ROW
WHEN EXISTS (
  SELECT 1
  FROM `hackathons` `hackathon`
  WHERE `hackathon`.`current_application_terms_document_id` = OLD.`id`
)
BEGIN
  SELECT RAISE(ABORT, 'hackathon_current_application_terms_document_invalid');
END;--> statement-breakpoint

CREATE TRIGGER `hackathon_terms_documents_current_winner_reference_update_guard`
BEFORE UPDATE OF `hackathon_id`, `document_type` ON `hackathon_terms_documents`
FOR EACH ROW
WHEN EXISTS (
  SELECT 1
  FROM `hackathons` `hackathon`
  WHERE `hackathon`.`current_winner_terms_document_id` = OLD.`id`
    AND (
      NEW.`hackathon_id` != `hackathon`.`id`
      OR NEW.`document_type` != 'winner_terms'
    )
)
BEGIN
  SELECT RAISE(ABORT, 'hackathon_current_winner_terms_document_invalid');
END;--> statement-breakpoint

CREATE TRIGGER `hackathon_terms_documents_current_winner_reference_delete_guard`
BEFORE DELETE ON `hackathon_terms_documents`
FOR EACH ROW
WHEN EXISTS (
  SELECT 1
  FROM `hackathons` `hackathon`
  WHERE `hackathon`.`current_winner_terms_document_id` = OLD.`id`
)
BEGIN
  SELECT RAISE(ABORT, 'hackathon_current_winner_terms_document_invalid');
END;--> statement-breakpoint

CREATE TRIGGER `hackathons_current_application_terms_insert_guard`
BEFORE INSERT ON `hackathons`
FOR EACH ROW
WHEN NEW.`current_application_terms_document_id` IS NOT NULL
BEGIN
  SELECT RAISE(ABORT, 'hackathon_current_application_terms_document_invalid')
  WHERE NOT EXISTS (
    SELECT 1
    FROM `hackathon_terms_documents` `document`
    WHERE `document`.`id` = NEW.`current_application_terms_document_id`
      AND `document`.`hackathon_id` = NEW.`id`
      AND `document`.`document_type` = 'application_terms'
  );
END;--> statement-breakpoint

CREATE TRIGGER `hackathons_current_application_terms_update_guard`
BEFORE UPDATE OF `current_application_terms_document_id` ON `hackathons`
FOR EACH ROW
WHEN NEW.`current_application_terms_document_id` IS NOT NULL
BEGIN
  SELECT RAISE(ABORT, 'hackathon_current_application_terms_document_invalid')
  WHERE NOT EXISTS (
    SELECT 1
    FROM `hackathon_terms_documents` `document`
    WHERE `document`.`id` = NEW.`current_application_terms_document_id`
      AND `document`.`hackathon_id` = NEW.`id`
      AND `document`.`document_type` = 'application_terms'
  );
END;--> statement-breakpoint

CREATE TRIGGER `hackathons_current_winner_terms_insert_guard`
BEFORE INSERT ON `hackathons`
FOR EACH ROW
WHEN NEW.`current_winner_terms_document_id` IS NOT NULL
BEGIN
  SELECT RAISE(ABORT, 'hackathon_current_winner_terms_document_invalid')
  WHERE NOT EXISTS (
    SELECT 1
    FROM `hackathon_terms_documents` `document`
    WHERE `document`.`id` = NEW.`current_winner_terms_document_id`
      AND `document`.`hackathon_id` = NEW.`id`
      AND `document`.`document_type` = 'winner_terms'
  );
END;--> statement-breakpoint

CREATE TRIGGER `hackathons_current_winner_terms_update_guard`
BEFORE UPDATE OF `current_winner_terms_document_id` ON `hackathons`
FOR EACH ROW
WHEN NEW.`current_winner_terms_document_id` IS NOT NULL
BEGIN
  SELECT RAISE(ABORT, 'hackathon_current_winner_terms_document_invalid')
  WHERE NOT EXISTS (
    SELECT 1
    FROM `hackathon_terms_documents` `document`
    WHERE `document`.`id` = NEW.`current_winner_terms_document_id`
      AND `document`.`hackathon_id` = NEW.`id`
      AND `document`.`document_type` = 'winner_terms'
  );
END;--> statement-breakpoint
