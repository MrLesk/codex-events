Feature: TASK-3.8 authenticated outcome flows
  Authenticated platform actors can exercise finalist selection, partial pitch review closure, final-ranking override, winners, prize redemption, and audit reads through real Auth0-backed sessions.

  Scenario: Hackathon admins move from shortlist through winners with a final-ranking override
    Given the saved "hackathon_admin" Auth0 session state exists
    And the saved "judge" Auth0 session state exists
    And the saved "platform_admin" Auth0 session state exists
    And the saved "regular_user" Auth0 session state exists
    When the saved "hackathon_admin" session selects outcomes finalists to prefer submission two
    Then the outcomes shortlist should save submission two as finalist one and submission one as finalist two
    And the outcomes shortlist should remain blind to team identity
    When the saved "hackathon_admin" session starts pitch for the outcomes fixture hackathon
    Then the outcomes fixture hackathon state should be "pitch"
    When the saved "hackathon_admin" session starts pitch review for the outcomes fixture hackathon
    Then the outcomes fixture hackathon state should be "pitch_review"
    When the saved "judge" session loads the active pitch assignments for the outcomes fixture hackathon
    Then the outcomes fixture should expose two active pitch assignments for the saved judge session
    When the saved "judge" session completes the remembered outcomes pitch assignments with fixture scores
    When the saved "hackathon_admin" session loads the active pitch assignments for the outcomes fixture hackathon
    Then the outcomes fixture should expose two remaining active pitch assignments
    When the saved "hackathon_admin" session starts final deliberation for the outcomes fixture hackathon
    Then the outcomes fixture hackathon state should be "final_deliberation"
    When the saved "hackathon_admin" session lists final deliberation for the outcomes fixture hackathon
    Then the outcomes final deliberation should rank submission two first and submission one second by score
    When the saved "hackathon_admin" session reorders the outcomes final ranking to prefer submission one
    Then the outcomes final deliberation should rank submission one first and submission two second by final order
    When the saved "hackathon_admin" session announces winners for the outcomes fixture hackathon
    Then the outcomes fixture hackathon state should be "winners_announced"
    When the saved "regular_user" session lists winners for the outcomes fixture hackathon
    Then the outcomes fixture winners should rank team one first and team two second
    When the saved "regular_user" session lists pending prize redemptions for the outcomes fixture hackathon
    Then the remembered outcomes prize redemption should target team "team_outcomes_fixture_one" and prize "prize_outcomes_fixture_team_rank_1"
    When the saved "regular_user" session redeems the remembered outcomes prize redemption as "Regular User Team Lead"
    Then the remembered outcomes prize redemption should be redeemed by "user_regular_user"
    And the redeemed outcomes prize redemption should accept the current outcomes winner terms document
    When the saved "hackathon_admin" session lists audit logs for the outcomes fixture hackathon
    Then the outcomes fixture hackathon audit should include actions "hackathon.pitch_finalists_selected, hackathon.start_pitch, hackathon.start_pitch_review, hackathon.start_final_deliberation, hackathon.final_ranking_reordered, hackathon.announce_winners, prize_redemption.redeemed"
    When the saved "platform_admin" session lists platform audit logs
    Then the platform audit should include actions "hackathon.pitch_finalists_selected, hackathon.start_pitch, hackathon.start_pitch_review, hackathon.start_final_deliberation, hackathon.final_ranking_reordered, hackathon.announce_winners, prize_redemption.redeemed"
