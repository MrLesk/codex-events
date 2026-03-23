Feature: Admin operations workspace
  Hackathon admins can use the dedicated operations route for review and interventions without exposing it to non-admin actors.

  Scenario: Non-admin actors cannot use the operations workspace
    Given the saved "regular_user" Auth0 session state exists
    When I open the admin operations page for hackathon "hackathon_e2e_fixture" with the saved "regular_user" session
    Then I should see the admin operations text "Admin access required"

  Scenario: Hackathon admins can approve a submitted application from the operations workspace
    Given the saved "hackathon_admin" Auth0 session state exists
    When I open the admin operations page for hackathon "hackathon_e2e_fixture" with the saved "hackathon_admin" session
    Then I should see the admin application "application_regular_user_fixture_submitted" with status "Submitted"
    When I approve the admin application "application_regular_user_fixture_submitted"
    Then I should see the admin application "application_regular_user_fixture_submitted" with status "Approved"

  Scenario: Hackathon admins can load more teams in the operations workspace
    Given the saved "hackathon_admin" Auth0 session state exists
    When I open the admin operations page for hackathon "hackathon_e2e_operations_fixture" with the saved "hackathon_admin" session
    Then I should see the admin operations text "Showing 3 of 4 teams."
    Then I should not see the admin team "team_operations_fixture_zeta"
    When I load more admin teams
    Then I should see the admin operations text "Showing 4 of 4 teams."
    Then I should see the admin team "team_operations_fixture_zeta" with submission status "No Submission"

  Scenario: Hackathon admins can admin-withdraw a submitted team from the operations workspace
    Given the saved "hackathon_admin" Auth0 session state exists
    When I open the admin operations page for hackathon "hackathon_e2e_operations_fixture" with the saved "hackathon_admin" session
    Then I should see the admin team "team_operations_fixture_alpha" with submission status "Submitted"
    When I admin-withdraw the team submission for "team_operations_fixture_alpha" with note "Participant requested removal"
    Then I should see the admin team "team_operations_fixture_alpha" with submission status "Withdrawn"

  Scenario: Hackathon admins can disqualify a locked submission from the operations workspace
    Given the saved "hackathon_admin" Auth0 session state exists
    When I open the admin operations page for hackathon "hackathon_e2e_judging_fixture" with the saved "hackathon_admin" session
    Then I should see the admin team "team_judging_fixture_one" with submission status "Locked"
    When I disqualify the admin team submission for "team_judging_fixture_one" with note "Violation confirmed"
    Then I should see the admin team "team_judging_fixture_one" with submission status "Disqualified"
