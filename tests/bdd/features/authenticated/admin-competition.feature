Feature: Admin competition workspace
  Hackathon admins can use the dedicated competition route to supervise judging, finalize shortlist order, and publish the canonical winner lifecycle actions.

  Scenario: Non-admin actors cannot use the competition workspace
    Given the saved "regular_user" Auth0 session state exists
    When I open the admin competition page for hackathon "hackathon_e2e_competition_reassign_fixture" with the saved "regular_user" session
    Then I should see the admin competition text "Admin access required"

  Scenario: Hackathon admins can reassign an unstarted blind review from the competition workspace
    Given the saved "hackathon_admin" Auth0 session state exists
    When I open the admin competition page for hackathon "hackathon_e2e_competition_reassign_fixture" with the saved "hackathon_admin" session
    Then I should see the competition assignment "submission_competition_reassign_fixture" assigned to judge "user_judge"
    When I reassign the competition assignment "submission_competition_reassign_fixture" to judge "user_backup_judge" with note "Balancing reviewer load"
    Then I should see the competition assignment "submission_competition_reassign_fixture" assigned to judge "user_backup_judge"

  Scenario: Hackathon admins can force-skip an active review from the competition workspace
    Given the saved "hackathon_admin" Auth0 session state exists
    When I open the admin competition page for hackathon "hackathon_e2e_competition_force_skip_fixture" with the saved "hackathon_admin" session
    Then I should see the competition assignment "submission_competition_force_skip_fixture" assigned to judge "user_judge"
    When I force-skip the competition assignment "submission_competition_force_skip_fixture" with note "Original judge is unavailable"
    Then I should see the competition assignment "submission_competition_force_skip_fixture" assigned to judge "user_backup_judge"

  Scenario: Hackathon admins can reorder the shortlist and announce winners from the competition workspace
    Given the saved "hackathon_admin" Auth0 session state exists
    When I open the admin competition page for hackathon "hackathon_e2e_competition_shortlist_fixture" with the saved "hackathon_admin" session
    Then I should see the admin competition state "Shortlist"
    Then I should see the competition shortlist entry "submission_competition_shortlist_fixture_one" at rank "1"
    When I move the competition shortlist entry "submission_competition_shortlist_fixture_two" up
    And I save the competition shortlist order
    Then I should see the competition shortlist entry "submission_competition_shortlist_fixture_two" at rank "1"
    Then I should see the competition shortlist entry "submission_competition_shortlist_fixture_one" at rank "2"
    When I announce competition winners
    Then I should see the admin competition state "Winners Announced"
    Then I should see the competition winner "submission_competition_shortlist_fixture_two"

  Scenario: Hackathon admins can complete a winners-announced hackathon from the competition workspace
    Given the saved "hackathon_admin" Auth0 session state exists
    When I open the admin competition page for hackathon "hackathon_e2e_competition_complete_fixture" with the saved "hackathon_admin" session
    Then I should see the admin competition state "Winners Announced"
    Then I should see the competition winner "submission_competition_complete_fixture_one"
    When I complete the competition hackathon
    Then I should see the admin competition state "Completed"
    Then I should see the competition winner "submission_competition_complete_fixture_one"
