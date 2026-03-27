ALTER TABLE `user_applications`
ADD COLUMN `registration_details_json` text NOT NULL DEFAULT '{"teamIntent":"unknown","teamMembers":[]}';
