Feature: Simplified Meetup claiming
  Approved Luma attendees can use the private event link to receive one coupon and record their attendance.

  Scenario: Regular user redeems from the private link and returns to the same coupon
    Given the saved "regular_user" Auth0 session state exists
    When I open the simplified claiming link with the saved "regular_user" session
    Then I should be redirected to the simplified claiming coupon
    When I open the simplified claiming link again
    Then I should be redirected to the simplified claiming coupon
    And the "event_admin" should see the simplified claiming participant checked in
