Feature: Authenticated session foundation
  Stable local personas can reuse a saved authenticated session across browser and request contexts.

  Scenario Outline: Reusing a saved local session
    Given the saved "<persona>" local session state exists
    When I open my events with the saved "<persona>" session
    Then I should see the my events heading
    And the saved "<persona>" session should authenticate a request context to "/account"

    Examples:
      | persona         |
      | platform_admin  |
      | event_admin |
      | judge           |
      | regular_user    |
