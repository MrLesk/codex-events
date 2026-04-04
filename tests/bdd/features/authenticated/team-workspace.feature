Feature: Participant team workspace in the account hackathon page
  Authenticated approved participants can use the account hackathon Team tab to start from their own team workspace, request to join visible teams, and manage team collaboration.

  Scenario: Regular user starts from the default solo team workspace and saves a custom team name
    Given the saved "regular_user" Auth0 session state exists
    When I open the participant Team tab for hackathon slug "participant-team-create-fixture-hackathon" with the saved "regular_user" session
    Then I should see the participant current team "Team Regular User"
    And I should see the participant team text "Closed to join requests"
    And I create a participant team named "North Star Team"
    Then I should be in the participant team workspace for the created team

  Scenario: Regular user saves a team bio from the participant Team tab
    Given the saved "regular_user" Auth0 session state exists
    When I open the participant Team tab for hackathon slug "participant-team-create-fixture-hackathon" with the saved "regular_user" session
    And I create a participant team named "North Star Team" with bio "We build reliable hackathon tooling together."
    Then I should be in the participant team workspace for the created team
    And I should see the participant team text "We build reliable hackathon tooling together."

  Scenario: Regular user does not see the solo-admin leave block in the participant Team tab
    Given the saved "regular_user" Auth0 session state exists
    When I open the participant Team tab for hackathon slug "participant-team-solo-fixture-hackathon" with the saved "regular_user" session
    Then I should see the participant current team "Solo Admin Team"
    And the participant team action "Leave team" should not be visible
