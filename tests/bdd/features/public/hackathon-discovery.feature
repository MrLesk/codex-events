Feature: Public hackathon discovery
  Visitors can inspect visible hackathons without seeing restricted operational data.

  Scenario: Viewing the public hackathon list
    Given I am on the public hackathons page
    Then I should see the public hackathon titled "E2E Fixture Hackathon"
    And the public hackathon card for "E2E Fixture Hackathon" should show lifecycle state "Registration open"
    And the public hackathon card for "E2E Fixture Hackathon" should link to "/hackathons/e2e-fixture-hackathon"

  Scenario: Viewing the public hackathon list with the saved platform-admin session
    Given the saved "platform_admin" Auth0 session state exists
    When I open the public hackathons page with the saved "platform_admin" session
    Then I should see the public hackathon titled "E2E Fixture Hackathon"
    Then I should not see the public hackathon titled "Draft Managed Hackathon"

  Scenario: Loading more public hackathons
    Given I am on the public hackathons page
    Then I should not see the public hackathon titled "Public Archive Fixture Hackathon"
    When I load more public hackathons
    Then I should see the public hackathon titled "Public Archive Fixture Hackathon"

  Scenario: Viewing the public hackathon detail
    Given I am on the public hackathon detail page for the fixture hackathon
    Then I should see the public hackathon detail title "E2E Fixture Hackathon"
    And I should see the public evaluation criterion "Community Impact"
    And I should see the public prize "Launch Award"
    And I should see the current terms reference "Application Terms"
    And I should see the text "Maximum 5 team members"
    And I should not see the admin control "Configure"
