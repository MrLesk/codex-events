ALTER TABLE `hackathons`
ADD `blind_review_count` integer DEFAULT 1 NOT NULL
CHECK (`blind_review_count` >= 0 AND `blind_review_count` <= 2);
--> statement-breakpoint
ALTER TABLE `hackathons`
ADD `pitch_review_enabled` integer DEFAULT false NOT NULL;
--> statement-breakpoint
ALTER TABLE `hackathons`
ADD `blind_score_weight_percent` integer DEFAULT 70 NOT NULL
CHECK (`blind_score_weight_percent` >= 0 AND `blind_score_weight_percent` <= 100);
--> statement-breakpoint
ALTER TABLE `hackathons`
ADD `pitch_score_weight_percent` integer DEFAULT 30 NOT NULL
CHECK (
  `pitch_score_weight_percent` >= 0
  AND `pitch_score_weight_percent` <= 100
  AND (`blind_review_count` > 0 OR `pitch_review_enabled` = 1)
  AND (
    `blind_review_count` = 0
    OR `pitch_review_enabled` = 0
    OR `blind_score_weight_percent` + `pitch_score_weight_percent` = 100
  )
);
