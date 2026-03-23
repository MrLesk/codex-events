Feature: Public homepage
  Visitors can understand the platform entry point before authenticating.

  Scenario: Viewing the signed-out homepage
    Given I am on the public homepage
    Then I should see the hero title "Operate hackathons through one role-aware surface instead of scattered workflows."
    And I should see a call to action labeled "Browse hackathons"
    And I should see a call to action labeled "Sign in with Auth0"
    And I should see a public navigation link labeled "Hackathons"
