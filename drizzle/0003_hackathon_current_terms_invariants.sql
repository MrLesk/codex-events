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
