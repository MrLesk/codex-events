Feature: Prize redemption workspace
  Prize recipients can complete pending redemptions from the winner-facing route, and hackathon admins can review redemption records in the competition workspace.

  Scenario: A team admin redeems a pending prize from the winner-facing workspace
    Given the saved "regular_user" Auth0 session state exists
    When I open the prize redemptions page with the saved "regular_user" session
    Then I should see the prize redemption task for hackathon slug "prize-workspace-fixture-hackathon" and prize "prize_prize_workspace_fixture_team_rank_1"
    When I submit the prize redemption task for hackathon slug "prize-workspace-fixture-hackathon" and prize "prize_prize_workspace_fixture_team_rank_1" as "Regular User Winner"
    Then I should see the completed prize redemption for hackathon slug "prize-workspace-fixture-hackathon" and prize "prize_prize_workspace_fixture_team_rank_1"

  Scenario: Hackathon admins can view redemption records in the competition workspace
    Given the saved "hackathon_admin" Auth0 session state exists
    When I open the admin competition page for hackathon "hackathon_e2e_competition_complete_fixture" with the saved "hackathon_admin" session
    Then I should see the competition redemption "redemption_competition_complete_fixture_team" with status "Pending"
