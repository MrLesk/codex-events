Feature: TASK-4.3 platform account registration recovery and profile management
  Authenticated identities can recover from account deletion by recreating the platform account through the app-owned registration flow and updating profile fields used by hackathon registration.

  Scenario: Recreating and updating the regular user platform account
    Given the saved "regular_user" Auth0 session state exists
    And the saved "regular_user" session should resolve to an authenticated identity without a platform account
    When I open the account onboarding page with the saved "regular_user" session
    And I submit the platform account registration form for "regular_user"
    Then I should see the profile onboarding heading
    When I update the account profile links
    Then I should see the account settings heading
    Then the account profile should show the updated links
