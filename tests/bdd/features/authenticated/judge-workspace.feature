Feature: TASK-4.7 judge workspace UI
  Authenticated judges can use the blind judge workspace without exposing team identity.

  Scenario: Judge starts, completes, and marks a blind review ineligible from the workspace
    Given the saved "judge" Auth0 session state exists
    When I open the judge workspace with the saved "judge" session
    Then I should see the blind workspace assignment card for "Workspace Project One"
    And I should not see the text "Fixture Judge Workspace Team One"
    When I open the blind workspace assignment for "Workspace Project One"
    Then I should see the blind assignment project name "Workspace Project One"
    And I should not see the text "Fixture Judge Workspace Team One"
    When I start the opened blind review
    Then the opened blind assignment should show status "In review"
    When I complete the opened blind review with workspace fixture scores
    Then the opened blind assignment should show status "Completed"
    When I mark the opened blind assignment ineligible with reason "Rule violation"
    Then the opened blind assignment should show ineligibility "Ineligible"

  Scenario: Judge skips an in-progress blind review from the workspace inbox
    Given the saved "judge" Auth0 session state exists
    When I open the judge workspace with the saved "judge" session
    Then I should see the blind workspace assignment card for "Workspace Project Two"
    When I open the blind workspace assignment for "Workspace Project Two"
    Then the opened blind assignment should show status "In review"
    When I skip the opened blind review with reason "Conflict"
    Then I should be returned to the judge dashboard
    When I reopen the judge workspace for the fixture hackathon
    And I should not see the blind workspace assignment card for "Workspace Project Two"
