# Lifecycle And State Machines

This document defines the canonical lifecycle states and transitions for the main workflows in the Codex event platform.

## Event

Event lifecycle behavior depends on `eventType`.

- Hackathon events use the full competition lifecycle.
- Meetup and Build events are registration-only and use only `draft`, `registration_open`, and `completed`.
- The storage enum is shared, but competition-only states are not valid operational states for Meetup or Build events.

### States

- `draft`
- `registration_open`
- `submission_open`
- `judging_preparation`
- `blind_review`
- `shortlist`
- `pitch`
- `pitch_review`
- `final_deliberation`
- `winners_announced`
- `completed`

### State Meanings

#### `draft`

The event exists but is not yet open to participants.

Behavior:

- Admins can configure the event.
- Users cannot apply.
- Teams cannot be created.
- Submissions cannot be created.

#### `registration_open`

The event is open for applications.

Behavior:

- Users can submit a `UserApplication`.
- Event admins can approve or reject applications.
- Approved users can create teams.
- Approved users can request to join open teams.
- Team admins can approve or reject join requests.
- Submissions cannot be created or edited.

#### `submission_open`

The Hackathon is open for team formation and submissions.

Behavior:

- Approved users can create teams.
- Approved users can request to join open teams.
- Team admins can approve or reject join requests.
- Team admins can create, edit, submit, and withdraw submissions.
- Team membership can change during this state, subject to the event team member limit.

#### `judging_preparation`

The Hackathon submission period is closed and the judging setup is being prepared.

Behavior:

- New teams cannot be created.
- Judges do not review submissions yet.
- Existing draft and submitted submissions remain mutable until the next judging-start action locks the submitted work.
- Prize eligibility is not frozen yet.
- Blind-review assignments do not exist yet.
- When pitch review is the first judging stage, the eligible submitted projects are prepared for the next state.

#### `blind_review`

Judges actively review assigned Hackathon submissions in blind review.

Behavior:

- Judges can start, complete, or skip their active assignments.
- Each locked submission has the configured number of blind review assignments.
- Skipped assignments are redistributed to the judge with the lowest blind-review load.
- Event admins can no longer withdraw submissions.
- If a submission must be removed from competition during or after review, the admin action is `disqualified`.

#### `shortlist`

The Hackathon blind-review leaderboard is reviewed, the full blind shortlist order is saved, and the finalist boundary is selected for the live pitch stage.

Behavior:

- Judges can review blind-review scores.
- Entering shortlist shows the top ranked blind-review submissions as the default finalist boundary up to the configured shortlist finalist count until admins save the shortlist.
- Event admins manually order the full blind shortlist and adjust which leading submissions are finalists.
- Final deliberation opens in combined-score order by default until admins explicitly save a final order or announce winners.
- Team identity remains hidden during shortlist.
- Participant-facing shortlist status is not published yet.

#### `pitch`

Hackathon finalist teams are in the live pitch stage before judges receive post-pitch review assignments.

Behavior:

- Teams pitch live during this state.
- Event admins explicitly enable the current finalist presentation one team at a time in the saved lineup order.
- Judges do not receive pitch-review assignments yet.
- When `pitch` is entered from `shortlist`, every active member of each finalist team receives a shortlist email.
- Finalist teams can see that their own team was shortlisted in the account overview and workspace.
- `pitch_review` stays unavailable until the full saved lineup has been presented.
- Event admins can manually start `pitch_review` only after the live pitch lineup is complete.

#### `pitch_review`

Judges score Hackathon finalists after the live pitch stage ends.

Behavior:

- Judges can see project name, team name, and full submission detail.
- Every finalist submission is assigned to every judge in the frozen pitch panel.
- Judges can start, complete, or skip their pitch assignments.
- Event admins can close pitch review once at least one pitch review vote has been submitted, even when some pitch assignments remain incomplete.
- Pitch averages are calculated from submitted pitch-review votes only.

#### `final_deliberation`

The final Hackathon weighted score and ranking are reviewed before winners are announced.

Behavior:

- Judges can review final combined scores.
- Event admins can manually reorder the final ranking without changing the underlying blind or pitch scores.
- Final order opens in combined-score order by default and becomes persisted only when admins save the ranking or announce winners.

#### `winners_announced`

The Hackathon winners are finalized for operations, but the completed showcase is not visible yet.

Behavior:

- Winner selection is closed.
- Prize redemption can proceed.
- Every frozen prize-eligible member of each winning team receives a winner email.
- Public and account-scoped event detail pages still show the `Prizes` tab rather than the completed winners showcase.
- Prize definitions are locked and can no longer be created, updated, or deleted.

#### `completed`

The event is fully closed.

Behavior:

- For Meetup and Build events, the registration-only lifecycle is finished.
- For Hackathon events, the outcome is final.
- Public and account-scoped Hackathon detail pages switch from `Prizes` to `Winners` and show the completed outcome showcase.
- The completed winners showcase exposes one card per winning project with prize information, project links, and the published winning-team roster.
- A separate published-projects section appears below the winners for locked non-winning submissions that team admins opted to show publicly after completion.
- Completing the event also enqueues winner emails for frozen prize-eligible members of winning teams.
- Prize redemption records remain available for operational and audit purposes.

### Hackathon Transitions

- `draft -> registration_open`
  Actor: event admin or platform admin.
  Guard: event configuration is ready, the registration window is open, and an admin opens registration manually.
- `registration_open -> submission_open`
  Actor: event admin or platform admin.
  Guard: registration is closed, the submission window is open, and an admin starts submission manually.
- `submission_open -> judging_preparation`
  Guard: the submission window is closed and an event admin stops submissions manually.
- `judging_preparation -> blind_review`
  Guard: blind review is enabled, at least one submitted submission exists, the automatic judge pool has enough distinct judges, and an event admin starts blind review manually. This transition locks submitted work, freezes prize eligibility, and creates blind assignments.
- `judging_preparation -> pitch`
  Guard: blind review is disabled, pitch review is enabled, at least one submitted submission exists, and an event admin starts the live pitch stage manually. This transition locks submitted work, freezes prize eligibility, and creates the pitch lineup.
- `blind_review -> shortlist`
  Guard: pitch review is enabled and all active submissions have the configured number of completed blind review outcomes or have been removed from competition.
- `blind_review -> final_deliberation`
  Guard: pitch review is disabled and all active submissions have the configured number of completed blind review outcomes or have been removed from competition.
- `shortlist -> pitch`
  Guard: event admins finalize the saved shortlist order, including the ordered finalist set at the top of that list, and start the live pitch stage manually. This transition also enqueues shortlist emails for active members of finalist teams.
- `pitch -> pitch_review`
  Guard: event admins complete the live pitch lineup and then start pitch review manually.
- `pitch_review -> final_deliberation`
  Guard: pitch review is closed by event admins after at least one submitted pitch vote exists and the submitted pitch votes to count are accepted for scoring.
- `final_deliberation -> winners_announced`
  Guard: event admins finalize the ranking and announce winners. This transition persists the final ranking operationally, creates prize redemptions, and enqueues winner emails for frozen prize-eligible members of winning teams.
- `winners_announced -> completed`
  Guard: event admins close the event. This transition reveals the completed outcome showcase on public and account detail pages, including the winners section and the separate published-projects section for eligible opted-in submissions, and enqueues winner emails for frozen prize-eligible members of winning teams.

### Meetup And Build Transitions

- `draft -> registration_open`
  Actor: event admin or platform admin.
  Guard: event configuration is ready, the registration window is open, and an admin opens registration manually.
- `registration_open -> completed`
  Actor: event admin or platform admin.
  Guard: the event is ready to close. No submission, judging, winner, or prize workflows run.

## UserApplication

### States

- `submitted`
- `approved`
- `rejected`
- `withdrawn`

### State Meanings

#### `submitted`

The user has applied to the event and is awaiting a decision.

Behavior:

- The user counts as an applicant.
- The user cannot create or join a team yet.
- Event admins can stage a pre-approval decision (`approved` or `rejected`) without changing the canonical status until staged decisions are applied.
- Events with automatic application approval skip this state for new applications after required submission checks pass.

#### `approved`

The user is approved to participate in the event.

Behavior:

- The user can create a team during `registration_open` or `submission_open`.
- The user can request to join an open team during `registration_open` or `submission_open`.

#### `rejected`

The user is not approved to participate in the event.

Behavior:

- The user cannot create a team.
- The user cannot join a team.
- The user cannot submit another application to the same event.

#### `withdrawn`

The participant withdrew from the event.

Behavior:

- The user is no longer eligible to participate in the event.
- The user is no longer eligible to attend the event in person through this application when the event is in person.
- When Luma sync is enabled for the event, withdrawal also triggers Luma guest removal for this participant.
- Admin-managed withdrawal can also remove the participant from an active team, or dismantle the participant's team, when team invariants require that outcome.
- Admin-managed withdrawal is blocked when dismantling the participant's team would affect an active draft, submitted, or locked submission.
- The user cannot create a team.
- The user cannot join a team.
- The application record remains stored for auditability, event-terms acceptance history when present, and operational history.

### Transitions

- `submitted -> approved`
  Actor: event admin or platform admin applying staged decisions.
- `new application -> approved`
  Actor: system, when automatic application approval is enabled for the event at submission time.
- `submitted -> rejected`
  Actor: event admin or platform admin applying staged decisions.
- `submitted -> withdrawn`
  Actor: applicant, event admin, or platform admin.
  Guard: applicant self-withdraw requires no active team membership in the event.
  Guard: admin-managed withdrawal can remove an active team membership or dismantle the team when doing so does not affect an active draft, submitted, or locked submission.
- `approved -> withdrawn`
  Actor: participant, event admin, or platform admin.
  Guard: participant self-withdraw requires no active team membership in the event.
  Guard: admin-managed withdrawal can remove an active team membership or dismantle the team when doing so does not affect an active draft, submitted, or locked submission.

## Team Join Request

Team join requests exist only for Hackathon events.

### States

- `pending`
- `approved`
- `rejected`
- `canceled`

### State Meanings

#### `pending`

The user asked to join an open team and is awaiting a decision.

Behavior:

- The request can be reviewed by team admins.
- The user does not become a team member until the request is approved.

#### `approved`

The request was accepted and the user became a team member.

Behavior:

- Approval creates the team membership.

#### `rejected`

The request was declined by the team.

#### `canceled`

The user canceled the pending request.

### Transitions

- `pending -> approved`
  Guard: the event is in `registration_open` or `submission_open`, the user has an approved `UserApplication`, is not already on another team in the same event, the team has available capacity, and the team is still open to join requests.
  Actor: team admin.
- `pending -> rejected`
  Actor: team admin.
- `pending -> canceled`
  Actor: requesting user.

## Submission

Submissions exist only for Hackathon events.

### States

- `draft`
- `submitted`
- `withdrawn`
- `locked`
- `disqualified`

### State Meanings

#### `draft`

The team has started a submission but has not submitted it yet.

Behavior:

- Team admins can create and edit the submission during `submission_open`.
- Team admins can continue editing or withdrawing an existing draft during `judging_preparation`.
- A draft that is never submitted is treated as no submission when submitted work is locked for judging.

#### `submitted`

The team has submitted its project.

Behavior:

- Team admins can continue editing or withdrawing the submission while the event remains in `submission_open` or `judging_preparation`.
- The submission remains eligible to be locked for judging unless it is withdrawn or disqualified.

#### `withdrawn`

The team chose to leave the competition before submitted work was locked for judging.

Behavior:

- The submission is no longer considered for judging.

#### `locked`

The submission is closed for editing and ready for judging.

Behavior:

- The submission cannot be edited.
- Judge assignments can be created and processed.
- After the event reaches `completed`, a team admin can opt a locked non-winning submission into the public published-projects showcase.

#### `disqualified`

The submission was removed from competition by admin action.

Behavior:

- The submission is no longer considered for judging or ranking.

### Transitions

- `draft -> submitted`
  Actor: team admin.
- `draft -> withdrawn`
  Actor: team admin, event admin, or platform admin acting on the team's request.
- `submitted -> withdrawn`
  Actor: team admin, event admin, or platform admin acting on the team's request.
  Guard: submitted work has not yet been locked for judging.
- `submitted -> locked`
  Guard: blind review begins, or `pitch` begins in a pitch-only event.
- `draft -> disqualified`
  Actor: event admin or platform admin.
- `submitted -> disqualified`
  Actor: event admin or platform admin.
- `locked -> disqualified`
  Actor: event admin or platform admin.

### Notes

- A team with no submission is not part of this state machine.
- A team admin creates the first draft when the team moves from no submission into this state machine.
- `ineligible` is not a `Submission` state. Judge-level eligibility decisions live on `JudgeAssignment`.

## JudgeAssignment

Judge assignments exist only for Hackathon events.

### States

- `assigned`
- `judge_started`
- `judge_completed`
- `skipped`

### State Meanings

#### `assigned`

The submission is assigned to a judge and waiting for review.

Behavior:

- Event admins can replace an unstarted blind-review assignment with another blind-review assignment.

#### `judge_started`

The judge has begun reviewing the submission.

Behavior:

- The assignment can no longer be manually reassigned by admins.
- Blind-review criterion scores can be saved progressively while the assignment remains in progress.
- An event admin or platform admin can force the assignment to `skipped` if the judge cannot complete the review.

#### `judge_completed`

The judge finished the review.

Behavior:

- Blind-review criterion scores or pitch-review score data are final unless an admin explicitly reverts an eligibility decision.

#### `skipped`

The judge declined to review the submission.

Behavior:

- The assignment is closed.
- A skipped blind-review assignment creates a new active assignment for another judge with the lowest blind-review load.
- A skipped pitch-review assignment is excluded from pitch-score averaging.

### Transitions

- `assigned -> judge_started`
  Actor: assigned judge.
- `assigned -> skipped`
  Actor: assigned judge.
- `judge_started -> skipped`
  Actor: assigned judge, event admin, or platform admin.
- `judge_started -> judge_completed`
  Actor: assigned judge.

### Notes

- Blind review assignments belong to the `blind_review` stage and pitch assignments belong to the `pitch_review` stage.
- A skipped assignment remains part of the audit trail even after a new blind-review replacement assignment is created.

## Event Credits

### Lifecycle Notes

- Event credits are independent from winner prizes and do not require `winners_announced`.
- Approved participants can claim at most one uploaded value from each event credit offer while inventory remains available.
