Feature: TASK-3.8 authenticated outcome flows
  Authenticated platform actors can use the implemented TASK-3.8 shortlist, winners, prize-redemption, and audit API surface through real Auth0-backed sessions.

  Scenario: Hackathon admins reorder the shortlist, winners are announced, a team admin redeems the prize, and audit reads expose the actions
    Given the saved "hackathon_admin" Auth0 session state exists
    And the saved "judge" Auth0 session state exists
    And the saved "platform_admin" Auth0 session state exists
    And the saved "regular_user" Auth0 session state exists
    When the saved "hackathon_admin" session reorders the outcomes fixture shortlist to prefer submission two
    Then the outcomes fixture shortlist should rank submission two first and submission one second
    When the saved "hackathon_admin" session announces winners for the outcomes fixture hackathon
    Then the outcomes fixture hackathon state should be "winners_announced"
    When the saved "regular_user" session lists winners for the outcomes fixture hackathon
    Then the outcomes fixture winners should rank team two first and team one second
    When the saved "judge" session lists pending prize redemptions for the outcomes fixture hackathon
    Then the remembered outcomes prize redemption should target team "team_outcomes_fixture_two" and prize "prize_outcomes_fixture_team_rank_1"
    When the saved "judge" session redeems the remembered outcomes prize redemption as "Judge Team Lead"
    Then the remembered outcomes prize redemption should be redeemed by "user_judge"
    And the redeemed outcomes prize redemption should accept the current outcomes winner terms document
    When the saved "hackathon_admin" session lists audit logs for the outcomes fixture hackathon
    Then the outcomes fixture hackathon audit should include actions "hackathon.shortlist_reordered", "hackathon.announce_winners", and "prize_redemption.redeemed"
    When the saved "platform_admin" session lists platform audit logs
    Then the platform audit should include actions "hackathon.shortlist_reordered", "hackathon.announce_winners", and "prize_redemption.redeemed"
