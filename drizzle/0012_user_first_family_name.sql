ALTER TABLE `users` ADD `first_name` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `users` ADD `family_name` text DEFAULT '' NOT NULL;--> statement-breakpoint

UPDATE `users`
SET
  `first_name` = CASE
    WHEN length(trim(`display_name`)) = 0 THEN ''
    WHEN instr(trim(`display_name`), ' ') = 0 THEN trim(`display_name`)
    ELSE substr(trim(`display_name`), 1, instr(trim(`display_name`), ' ') - 1)
  END,
  `family_name` = CASE
    WHEN length(trim(`display_name`)) = 0 THEN ''
    WHEN instr(trim(`display_name`), ' ') = 0 THEN ''
    ELSE trim(substr(trim(`display_name`), instr(trim(`display_name`), ' ') + 1))
  END;
