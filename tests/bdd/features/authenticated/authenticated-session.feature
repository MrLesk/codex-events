Feature: Authenticated session foundation
  Stable Auth0 personas can reuse a saved authenticated session across browser and request contexts.

  Scenario Outline: Reusing a saved Auth0 session
    Given the saved "<persona>" Auth0 session state exists
    When I open my hackathons with the saved "<persona>" session
    Then I should see the my hackathons heading
    And the saved "<persona>" session should authenticate a request context to "/account"

    Examples:
      | persona         |
      | platform_admin  |
      | hackathon_admin |
      | judge           |
      | regular_user    |
