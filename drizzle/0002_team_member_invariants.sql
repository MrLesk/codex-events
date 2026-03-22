CREATE TRIGGER `team_members_single_hackathon_membership_insert`
BEFORE INSERT ON `team_members`
FOR EACH ROW
WHEN NEW.`left_at` IS NULL
AND EXISTS (
  SELECT 1
  FROM `team_members` `existing_membership`
  INNER JOIN `teams` `existing_team` ON `existing_team`.`id` = `existing_membership`.`team_id`
  INNER JOIN `teams` `new_team` ON `new_team`.`id` = NEW.`team_id`
  WHERE `existing_membership`.`user_id` = NEW.`user_id`
    AND `existing_membership`.`left_at` IS NULL
    AND `existing_team`.`hackathon_id` = `new_team`.`hackathon_id`
)
BEGIN
  SELECT RAISE(ABORT, 'user already has an active team membership in this hackathon');
END;
--> statement-breakpoint
CREATE TRIGGER `team_members_single_hackathon_membership_update`
BEFORE UPDATE OF `team_id`, `user_id`, `left_at` ON `team_members`
FOR EACH ROW
WHEN NEW.`left_at` IS NULL
AND EXISTS (
  SELECT 1
  FROM `team_members` `existing_membership`
  INNER JOIN `teams` `existing_team` ON `existing_team`.`id` = `existing_membership`.`team_id`
  INNER JOIN `teams` `new_team` ON `new_team`.`id` = NEW.`team_id`
  WHERE `existing_membership`.`id` != OLD.`id`
    AND `existing_membership`.`user_id` = NEW.`user_id`
    AND `existing_membership`.`left_at` IS NULL
    AND `existing_team`.`hackathon_id` = `new_team`.`hackathon_id`
)
BEGIN
  SELECT RAISE(ABORT, 'user already has an active team membership in this hackathon');
END;
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
BEGIN
  SELECT RAISE(ABORT, 'active teams must retain at least one active admin');
END;
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
BEGIN
  SELECT RAISE(ABORT, 'active teams must retain at least one active admin');
END;
--> statement-breakpoint
CREATE TRIGGER `team_members_post_submission_close_member_guard`
BEFORE UPDATE OF `left_at` ON `team_members`
FOR EACH ROW
WHEN OLD.`left_at` IS NULL
AND NEW.`left_at` IS NOT NULL
AND EXISTS (
  SELECT 1
  FROM `teams` `team`
  INNER JOIN `hackathons` `hackathon` ON `hackathon`.`id` = `team`.`hackathon_id`
  WHERE `team`.`id` = OLD.`team_id`
    AND `hackathon`.`state` NOT IN ('registration_open', 'submission_open')
)
AND NOT EXISTS (
  SELECT 1
  FROM `team_members` `remaining_member`
  WHERE `remaining_member`.`team_id` = OLD.`team_id`
    AND `remaining_member`.`id` != OLD.`id`
    AND `remaining_member`.`left_at` IS NULL
)
BEGIN
  SELECT RAISE(ABORT, 'teams must retain at least one active member after submission closes');
END;
