DROP TRIGGER IF EXISTS `team_members_active_admin_guard`;
--> statement-breakpoint
CREATE TRIGGER `team_members_active_admin_guard`
BEFORE UPDATE OF `role`, `left_at` ON `team_members`
FOR EACH ROW
WHEN OLD.`role` = 'admin'
AND OLD.`left_at` IS NULL
AND (NEW.`role` != 'admin' OR NEW.`left_at` IS NOT NULL)
AND NOT EXISTS (
  SELECT 1
  FROM `team_members` `other_admin`
  WHERE `other_admin`.`team_id` = OLD.`team_id`
    AND `other_admin`.`id` != OLD.`id`
    AND `other_admin`.`role` = 'admin'
    AND `other_admin`.`left_at` IS NULL
)
AND NOT (
  NEW.`left_at` IS NOT NULL
  AND NOT EXISTS (
    SELECT 1
    FROM `team_members` `remaining_member`
    WHERE `remaining_member`.`team_id` = OLD.`team_id`
      AND `remaining_member`.`id` != OLD.`id`
      AND `remaining_member`.`left_at` IS NULL
  )
  AND EXISTS (
    SELECT 1
    FROM `teams` `team`
    INNER JOIN `hackathons` `hackathon` ON `hackathon`.`id` = `team`.`hackathon_id`
    WHERE `team`.`id` = OLD.`team_id`
      AND `hackathon`.`state` IN ('registration_open', 'submission_open')
  )
  AND NOT EXISTS (
    SELECT 1
    FROM `submissions` `submission`
    WHERE `submission`.`team_id` = OLD.`team_id`
      AND `submission`.`status` IN ('draft', 'submitted', 'locked')
  )
)
BEGIN
  SELECT RAISE(ABORT, 'active teams must retain at least one active admin');
END;
--> statement-breakpoint
DROP TRIGGER IF EXISTS `team_members_active_admin_delete_guard`;
--> statement-breakpoint
CREATE TRIGGER `team_members_active_admin_delete_guard`
BEFORE DELETE ON `team_members`
FOR EACH ROW
WHEN OLD.`role` = 'admin'
AND OLD.`left_at` IS NULL
AND NOT EXISTS (
  SELECT 1
  FROM `team_members` `other_admin`
  WHERE `other_admin`.`team_id` = OLD.`team_id`
    AND `other_admin`.`id` != OLD.`id`
    AND `other_admin`.`role` = 'admin'
    AND `other_admin`.`left_at` IS NULL
)
AND NOT (
  NOT EXISTS (
    SELECT 1
    FROM `team_members` `remaining_member`
    WHERE `remaining_member`.`team_id` = OLD.`team_id`
      AND `remaining_member`.`id` != OLD.`id`
      AND `remaining_member`.`left_at` IS NULL
  )
  AND EXISTS (
    SELECT 1
    FROM `teams` `team`
    INNER JOIN `hackathons` `hackathon` ON `hackathon`.`id` = `team`.`hackathon_id`
    WHERE `team`.`id` = OLD.`team_id`
      AND `hackathon`.`state` IN ('registration_open', 'submission_open')
  )
  AND NOT EXISTS (
    SELECT 1
    FROM `submissions` `submission`
    WHERE `submission`.`team_id` = OLD.`team_id`
      AND `submission`.`status` IN ('draft', 'submitted', 'locked')
  )
)
BEGIN
  SELECT RAISE(ABORT, 'active teams must retain at least one active admin');
END;
