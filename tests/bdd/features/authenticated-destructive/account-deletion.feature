Feature: TASK-3.5 authenticated account deletion flow
  An authenticated platform user can delete their platform account without breaking the non-destructive stable-persona suite.

  Scenario: Deleting the current platform account through the API
    Given the saved "regular_user" Auth0 session state exists
    When the saved "regular_user" session accepts the fixture platform terms document
    Then the platform document acceptance response should reference the fixture platform terms document
    When the saved "regular_user" session deletes the current platform account
    Then the account deletion response should succeed for "regular_user"
    And the saved "regular_user" session should resolve to an authenticated identity without a platform account
