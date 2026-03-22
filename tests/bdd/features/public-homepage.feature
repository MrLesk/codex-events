Feature: Public homepage
  Visitors can understand the platform entry point before authenticating.

  Scenario: Viewing the signed-out homepage
    Given I am on the public homepage
    Then I should see the hero title "Run Codex hackathons on a real platform, not a starter template."
    And I should see a call to action labeled "Sign in with Auth0"
    And I should see a dashboard navigation link
