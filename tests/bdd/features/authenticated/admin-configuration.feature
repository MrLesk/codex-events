Feature: TASK-3.9 authenticated admin configuration coverage
  The backend release gate includes Auth0-backed coverage for the remaining admin configuration workflows that were not yet represented in the BDD suite.

  Scenario: Platform admin configures a managed hackathon through authenticated API workflows
    Given the saved "platform_admin" Auth0 session state exists
    When the saved "platform_admin" session creates a managed hackathon named "BDD Managed Hackathon"
    Then the remembered managed hackathon should be created in state "draft"
    When the saved "platform_admin" session adds evaluation criterion "Execution" with weight 30 and display order 1 to the remembered managed hackathon
    Then the remembered managed hackathon criterion should be created with display order 1
    When the saved "platform_admin" session publishes application terms titled "BDD Application Terms v1" for the remembered managed hackathon
    Then the remembered managed hackathon terms document should be "application_terms" version 1
    When the saved "platform_admin" session sets the remembered managed hackathon application terms as current
    Then the remembered managed hackathon should reference the remembered current application terms document
    When the saved "platform_admin" session loads current terms for the remembered managed hackathon
    Then the current terms response should expose the remembered current application terms document
