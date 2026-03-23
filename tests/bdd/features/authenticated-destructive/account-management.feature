Feature: TASK-4.3 platform account onboarding and profile management
  Authenticated identities can recover from account deletion by recreating the platform account and updating profile fields used by hackathon registration.

  Scenario: Recreating and updating the regular user platform account
    Given the saved "regular_user" Auth0 session state exists
    When I open the account settings page with the saved "regular_user" session
    Then I should see the account settings heading
    When I delete the platform account through the account settings page
    Then I should see the deleted platform account message
    And the saved "regular_user" session should resolve to an authenticated identity without a platform account
    And I submit the platform account registration form for "regular_user"
    Then I should see the account settings heading
    When I update the account profile links
    Then the account profile should show the updated links
