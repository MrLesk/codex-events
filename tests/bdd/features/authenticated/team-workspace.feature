Feature: Participant team formation workspace
  Authenticated approved participants can move from the public hackathon detail into hackathon-scoped team routes, create teams, request to join visible teams, and manage team membership constraints.

  Scenario: Regular user creates a team from the participant team workspace
    Given the saved "regular_user" Auth0 session state exists
    When I open the participant team directory for hackathon slug "participant-team-create-fixture-hackathon" with the saved "regular_user" session
    And I create a participant team named "North Star Team"
    Then I should be in the participant team workspace for the created team

  Scenario: Regular user sees the solo-admin leave block in the team workspace
    Given the saved "regular_user" Auth0 session state exists
    When I open the participant team directory for hackathon slug "participant-team-solo-fixture-hackathon" with the saved "regular_user" session
    Then I should see the participant current team "Solo Admin Team"
    When I open my participant team workspace
    Then I should see the participant team text "Teams must retain at least one active team admin."
    And the participant team action "Leave team" should be disabled
