Feature: Participant hackathon application experience
  Authenticated platform users can apply to a hackathon from the public detail surface, satisfy required-profile gates, and review application outcomes before team formation.

  Scenario: Regular user submits an application from the participant application panel
    Given the saved "regular_user" Auth0 session state exists
    When I open the participant application page for hackathon slug "participant-application-fixture-hackathon" with the saved "regular_user" session
    Then I should see the participant application text "Applications are open for this hackathon."
    When I accept the current participant application terms
    And I submit the participant application
    Then I should see the participant application status "Submitted"

  Scenario: Regular user sees the required-profile block before applying
    Given the saved "regular_user" Auth0 session state exists
    When I open the participant application page for hackathon slug "participant-profile-requirement-fixture-hackathon" with the saved "regular_user" session
    Then I should see the participant application text "Profile update required before applying"
    And I should see the participant application missing profile field "Luma username"

  Scenario: Regular user sees an approved application state
    Given the saved "regular_user" Auth0 session state exists
    When I open the participant application page for hackathon slug "participant-approved-fixture-hackathon" with the saved "regular_user" session
    Then I should see the participant application status "Approved"

  Scenario: Regular user sees a rejected application state
    Given the saved "regular_user" Auth0 session state exists
    When I open the participant application page for hackathon slug "participant-rejected-fixture-hackathon" with the saved "regular_user" session
    Then I should see the participant application status "Rejected"
