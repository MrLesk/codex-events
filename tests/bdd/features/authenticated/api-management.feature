Feature: TASK-3.5 authenticated API management flows
  Authenticated platform actors can use the implemented TASK-3.5 API surface through real Auth0-backed sessions.

  Scenario Outline: Reading the current actor context from the API
    Given the saved "<persona>" Auth0 session state exists
    When the saved "<persona>" session requests the current API actor context
    Then the API actor kind should be "<actorKind>"
    And the API actor platform-account flag should be "<hasPlatformAccount>"
    And the API actor platform-admin flag should be "<isPlatformAdmin>"
    And the API actor should expose the fixture hackathon role "<hackathonRole>"

    Examples:
      | persona         | actorKind     | hasPlatformAccount | isPlatformAdmin | hackathonRole   |
      | platform_admin  | platform_user | true               | true            | none            |
      | hackathon_admin | platform_user | true               | false           | hackathon_admin |
      | judge           | platform_user | true               | false           | judge           |

  Scenario: Hackathon admin can list fixture hackathon roles through the API
    Given the saved "hackathon_admin" Auth0 session state exists
    When the saved "hackathon_admin" session lists fixture hackathon roles
    Then the fixture role response should include user "user_judge" as "judge"

  Scenario: Platform admin can grant platform-admin access through the API
    Given the saved "platform_admin" Auth0 session state exists
    When the saved "platform_admin" session grants platform-admin access to "user_regular_user"
    Then the platform-admin grant response should promote user "user_regular_user"
    When the saved "regular_user" session requests the current API actor context
    Then the API actor platform-admin flag should be "true"

  Scenario: Opening submission is blocked while registration remains open
    Given the saved "hackathon_admin" Auth0 session state exists
    And the saved "hackathon_admin" session opens submission for the fixture hackathon
    Then the API error code should be "registration_window_still_open"
