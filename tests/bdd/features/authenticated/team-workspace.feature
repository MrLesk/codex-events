Feature: Participant team formation workspace
  Authenticated approved participants can move from the public hackathon detail into hackathon-scoped team routes, create teams, request to join visible teams, and manage team membership constraints.

  Scenario: Regular user creates a team from the participant team workspace
    Given the saved "regular_user" Auth0 session state exists
    When I open the participant team directory for hackathon slug "participant-team-create-fixture-hackathon" with the saved "regular_user" session
    And I create a participant team named "North Star Team"
    Then I should be in the participant team workspace for the created team

  Scenario: Regular user requests to join a visible team and the team admin approves it
    Given the saved "regular_user" Auth0 session state exists
    And the saved "judge" Auth0 session state exists
    When I open the participant team directory for hackathon slug "participant-team-join-fixture-hackathon" with the saved "regular_user" session
    Then I should see the participant team card "Judge Review Team"
    When I open the participant visible team workspace for "Judge Review Team"
    And I request to join the current participant team
    Then I should see the participant team text "Cancel pending request"
    When I open the participant team directory for hackathon slug "participant-team-join-fixture-hackathon" with the saved "judge" session
    And I open the participant visible team workspace for "Judge Review Team"
    Then I should see the participant join request for "Regular User"
    When I approve the participant join request for "Regular User"
    Then I should see the participant team member "Regular User"
    When I open the participant team directory for hackathon slug "participant-team-join-fixture-hackathon" with the saved "regular_user" session
    Then I should see the participant current team "Judge Review Team"

  Scenario: Regular user sees the solo-admin leave block in the team workspace
    Given the saved "regular_user" Auth0 session state exists
    When I open the participant team directory for hackathon slug "participant-team-solo-fixture-hackathon" with the saved "regular_user" session
    Then I should see the participant current team "Solo Admin Team"
    When I open my participant team workspace
    Then I should see the participant team text "Teams must retain at least one active team admin."
    And the participant team action "Leave team" should be disabled
