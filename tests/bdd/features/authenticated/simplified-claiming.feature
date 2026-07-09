Feature: Simplified Meetup claiming
  Approved Luma attendees can use the private event link to receive one coupon and record their attendance.

  Scenario: Regular user redeems from the private link and returns to the same coupon
    Given the saved "regular_user" Auth0 session state exists
    When I open the simplified claiming link with the saved "regular_user" session
    Then I should see my saved Luma email ready to confirm
    When I replace the Luma email with "missing@example.com"
    And I confirm the simplified claim
    Then I should be able to correct the unmatched Luma email
    When I restore my saved Luma email
    And I confirm the simplified claim
    Then I should be redirected to the simplified claiming coupon
    When I open the simplified claiming link again
    Then I should be redirected to the simplified claiming coupon
    And the "event_admin" should see the simplified claiming participant checked in

  Scenario: Event admin sees the attendee claiming QR settings
    Given the saved "event_admin" Auth0 session state exists
    When I open the simplified claiming settings with the saved "event_admin" session
    Then I should see the attendee claiming QR settings
