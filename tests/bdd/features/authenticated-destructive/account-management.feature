Feature: TASK-4.3 platform account registration recovery and profile management
  Authenticated identities can recover from account deletion by provisioning the platform account after sign-in and updating profile fields used by event registration.

  Scenario: Recreating and updating the regular user platform account
    Given the saved "regular_user" local session state exists
    And the saved "regular_user" session should resolve to an authenticated identity without a platform account
    When I open the account settings page with the saved "regular_user" session
    Then I should see the profile settings heading
    And OAuth should be the recommended MCP connection
    When I create and copy an MCP access token named "BDD Codex client"
    Then the copied MCP credential should be shown only once
    When I finish the MCP token setup
    Then the MCP access token named "BDD Codex client" should be listed
    When I revoke the MCP access token named "BDD Codex client"
    Then the revoked MCP access token named "BDD Codex client" should be hidden after refresh
    When I update the account profile links
    Then the account profile should show the updated links
    When I upload a profile icon from account settings
    Then the header menu should show the uploaded profile icon
