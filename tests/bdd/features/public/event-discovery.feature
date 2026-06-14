Feature: Public event discovery
  Visitors can inspect visible events without seeing restricted operational data.

  Scenario: Viewing the public event list
    Given I am on the public events page
    Then I should see the public event titled "E2E Fixture Event"
    And the public event card for "E2E Fixture Event" should show event type "Hackathon"
    And the public event card for "E2E Fixture Event" should link to "/events/e2e-fixture-event"

  Scenario: Viewing the public event list with the saved platform-admin session
    Given the saved "platform_admin" Auth0 session state exists
    When I open the public events page with the saved "platform_admin" session
    Then I should see the public event titled "E2E Fixture Event"
    Then I should not see the public event titled "Draft Managed Event"

  Scenario: Loading more public events
    Given I am on the public events page
    Then I should see 4 public event cards
    When I load more public events
    Then I should see 8 public event cards

  Scenario: Viewing the public event detail
    Given I am on the public event detail page for the fixture event
    Then I should see the public event detail title "E2E Fixture Event"
    And I should see the public event detail type "Hackathon"
    And I should see the public prize "Launch Award"
    And I should see the text "Vienna, Austria"
    And I should not see the admin control "Configure"
