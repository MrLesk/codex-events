Feature: Participant team workspace in the account hackathon page
  Authenticated approved participants can use the account hackathon Team tab to start from their own team workspace, request to join visible teams, and manage team collaboration.

  Scenario: Regular user can open join requests from the provisional solo team workspace
    Given the saved "regular_user" Auth0 session state exists
    When I open the participant Team tab for hackathon slug "participant-team-create-fixture-hackathon" with the saved "regular_user" session
    And I enable join requests for the participant team
    And I reload the participant Team tab page
    Then I should see the participant current team "Team Regular User"
    And I should see the participant team text "Open to join requests"

  Scenario: Regular user starts from the default solo team workspace and saves a custom team name
    Given the saved "regular_user" Auth0 session state exists
    When I open the participant Team tab for hackathon slug "participant-team-create-fixture-hackathon" with the saved "regular_user" session
    Then I should see the participant current team "Team Regular User"
    And I should see the participant team text "Closed to join requests"
    And the participant join requests panel should not be visible
    And I create a participant team named "North Star Team"
    Then I should be in the participant team workspace for the created team

  Scenario: Regular user saves a team bio from the participant Team tab
    Given the saved "regular_user" Auth0 session state exists
    When I open the participant Team tab for hackathon slug "participant-team-create-fixture-hackathon" with the saved "regular_user" session
    And I create a participant team named "North Star Team" with bio "We build reliable hackathon tooling together."
    Then I should be in the participant team workspace for the created team
    And I should see the participant team text "We build reliable hackathon tooling together."

  Scenario: Regular user does not see the team directory while on their own team page
    Given the saved "regular_user" Auth0 session state exists
    When I open the participant Team tab for hackathon slug "participant-team-join-fixture-hackathon" with the saved "regular_user" session
    Then I should see the participant current team "Team Regular User"
    And the participant team directory should not be visible

  Scenario: Regular user does not see the team directory while viewing another team
    Given the saved "regular_user" Auth0 session state exists
    When I open the participant Team tab for hackathon slug "operations-fixture-hackathon" and selected team slug "beta-operations-team" with the saved "regular_user" session
    Then I should see the participant current team "Beta Operations Team"
    And I should see the participant navigation link "Back to my team"
    And the participant team directory should not be visible

  Scenario: Regular user does not see the team directory while viewing another team before joining any team
    Given the saved "regular_user" Auth0 session state exists
    When I open the participant Team tab for hackathon slug "participant-team-join-fixture-hackathon" and selected team slug "judge-review-team" with the saved "regular_user" session
    Then I should see the participant current team "Judge Review Team"
    And I should see the participant navigation link "Back to my team"
    And the participant team directory should not be visible

  Scenario: Regular user can leave a solo-admin team during team formation
    Given the saved "regular_user" Auth0 session state exists
    When I open the participant Team tab for hackathon slug "participant-team-solo-fixture-hackathon" with the saved "regular_user" session
    Then I should see the participant current team "Solo Admin Team"
    And I should see the participant team text "Solo Team"
    And I should see the participant team text "You are participating as solo. Leave the team to join other teams."
    And I should not see the participant workspace text "Closed to join requests"
    And the participant team action "Leave team" should be visible
