Feature: Participant team submission workspace
  Approved participants use the account hackathon Workspace tab to monitor the canonical submission state, while team admins manage the draft, submit, and withdraw actions during the allowed lifecycle window.

  Scenario: Approved user without a team does not see the submission surface
    Given the saved "regular_user" Auth0 session state exists
    When I open the participant Submission tab for hackathon slug "participant-approved-fixture-hackathon" with the saved "regular_user" session
    Then the participant submission surface should not be visible
    And I should see the participant team text "Join a Team"
    And I should see the participant navigation link "Open Teams"

  Scenario: Approved user with a team sees the submission window notice during registration_open
    Given the saved "regular_user" Auth0 session state exists
    When I open the participant Submission tab for hackathon slug "participant-team-solo-fixture-hackathon" with the saved "regular_user" session
    Then I should see the participant submission text "Submission window not open yet"
    And I should see the participant submission text "Submission opens at"

  Scenario: Regular user creates, edits, submits, and withdraws a team submission during submission_open
    Given the saved "regular_user" Auth0 session state exists
    When I open the participant Submission tab for hackathon slug "participant-submission-create-fixture-hackathon" with the saved "regular_user" session
    Then I should see the participant submission status "No submission"
    When I fill the participant submission form with project name "Launch Console", summary "Initial draft for the launch console.", repository URL "https://github.com/example/launch-console", and demo URL "https://example.com/launch-console"
    And I create the participant submission draft
    Then I should see the participant submission status "Draft"
    And I should see the participant submission text "Launch Console"
    When I fill the participant submission form with project name "Launch Console Revised", summary "Updated draft for the launch console.", repository URL "https://github.com/example/launch-console-revised", and demo URL "https://example.com/launch-console-revised"
    And I save the participant submission draft
    Then I should see the participant submission text "Launch Console Revised"
    When I submit the participant submission
    Then I should see the participant submission status "Submitted"
    When I withdraw the participant submission
    Then I should see the participant submission status "Withdrawn"

  Scenario: Regular user sees a locked team submission as read-only
    Given the saved "regular_user" Auth0 session state exists
    When I open the participant Submission tab for hackathon slug "participant-submission-locked-fixture-hackathon" with the saved "regular_user" session
    Then I should see the participant submission status "Locked"
    Then I should see the participant submission text "This project is locked for judging and can no longer be edited or withdrawn."
    And the participant submission action "Save changes" should be disabled
    And the participant submission action "Withdraw submission" should be disabled
