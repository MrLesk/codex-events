# Lifecycle And State Machines

This document defines the canonical lifecycle states and transitions for the main workflows in the Codex hackathon platform.

## Hackathon

### States

- `draft`
- `registration_open`
- `submission_open`
- `judging_preparation`
- `blind_review`
- `shortlist`
- `pitch_review`
- `final_deliberation`
- `winners_announced`
- `completed`

### State Meanings

#### `draft`

The hackathon exists but is not yet open to participants.

Behavior:

- Admins can configure the hackathon.
- Users cannot apply.
- Teams cannot be created.
- Submissions cannot be created.

#### `registration_open`

The hackathon is open for applications.

Behavior:

- Users can submit a `UserApplication`.
- Hackathon admins can approve or reject applications.
- Approved users can create teams.
- Approved users can request to join open teams.
- Team admins can approve or reject join requests.
- Submissions cannot be created or edited.

#### `submission_open`

The hackathon is open for team formation and submissions.

Behavior:

- Approved users can create teams.
- Approved users can request to join open teams.
- Team admins can approve or reject join requests.
- Team admins can create, edit, submit, and withdraw submissions.
- Team membership can change during this state, subject to the hackathon team member limit.

#### `judging_preparation`

The submission period is closed and the judging setup is being prepared.

Behavior:

- All submissions are locked.
- New teams cannot be created.
- Judges do not review submissions yet.
- Prize eligibility snapshots are created for teams with submitted submissions.
- When blind review is enabled, submissions are distributed between users in the automatic judge distribution pool as evenly as possible until each locked submission has the configured number of blind review assignments.
- When pitch review is the first judging stage, the eligible pitch submissions and pitch panel are prepared for the next state.
- Hackathon admins can reassign blind-review submissions only while the active blind assignment has not been started.

#### `blind_review`

Judges actively review assigned submissions in blind review.

Behavior:

- Judges can start, complete, or skip their active assignments.
- Each locked submission has the configured number of blind review assignments.
- Skipped assignments are redistributed to the judge with the lowest blind-review load.
- Hackathon admins can no longer withdraw submissions.
- If a submission must be removed from competition during or after review, the admin action is `disqualified`.

#### `shortlist`

The blind-review leaderboard is reviewed and finalists are selected for pitch review.

Behavior:

- Judges can review blind-review scores.
- Hackathon admins manually choose and order the finalist submissions that advance to pitch review.
- Team identity remains hidden during shortlist.

#### `pitch_review`

Finalists present their projects and judges score the live pitch.

Behavior:

- Judges can see project name, team name, and full submission detail.
- Every finalist submission is assigned to every judge in the frozen pitch panel.
- Judges can start, complete, or skip their pitch assignments.
- Hackathon admins can close pitch review even when some pitch assignments remain incomplete.
- Pitch averages are calculated from submitted pitch-review votes only.

#### `final_deliberation`

The final weighted score and ranking are reviewed before winners are announced.

Behavior:

- Judges can review final combined scores.
- Hackathon admins can manually reorder the final ranking without changing the underlying blind or pitch scores.
- Final order is computed hackathon data with any explicit admin ranking override applied.

#### `winners_announced`

The winners are final and visible.

Behavior:

- Winner selection is closed.
- Prize redemption can proceed.

#### `completed`

The hackathon is fully closed.

Behavior:

- The outcome is final.
- Prize redemption records remain available for operational and audit purposes.

### Transitions

- `draft -> registration_open`
  Actor: hackathon admin or platform admin.
  Guard: hackathon configuration is ready, the registration window is open, and an admin opens registration manually.
- `registration_open -> submission_open`
  Actor: hackathon admin or platform admin.
  Guard: registration is closed, the submission window is open, and an admin starts submission manually.
- `submission_open -> judging_preparation`
  Guard: submission editing is closed and a hackathon admin starts judging preparation manually.
- `judging_preparation -> blind_review`
  Guard: blind review is enabled, blind review assignments are ready, and a hackathon admin starts blind review manually.
- `judging_preparation -> pitch_review`
  Guard: blind review is disabled, pitch review is enabled, and a hackathon admin starts pitch review manually.
- `blind_review -> shortlist`
  Guard: pitch review is enabled and all active submissions have the configured number of completed blind review outcomes or have been removed from competition.
- `blind_review -> final_deliberation`
  Guard: pitch review is disabled and all active submissions have the configured number of completed blind review outcomes or have been removed from competition.
- `shortlist -> pitch_review`
  Guard: hackathon admins finalize the ordered finalist set and start pitch review manually.
- `pitch_review -> final_deliberation`
  Guard: pitch review is closed by hackathon admins after submitted pitch votes are accepted for scoring.
- `final_deliberation -> winners_announced`
  Guard: hackathon admins finalize the ranking and announce winners.
- `winners_announced -> completed`
  Guard: hackathon admins close the hackathon.

## UserApplication

### States

- `submitted`
- `approved`
- `rejected`
- `withdrawn`

### State Meanings

#### `submitted`

The user has applied to the hackathon and is awaiting a decision.

Behavior:

- The user counts as an applicant.
- The user cannot create or join a team yet.
- Hackathon admins can stage a pre-approval decision (`approved` or `rejected`) without changing the canonical status until staged decisions are applied.

#### `approved`

The user is approved to participate in the hackathon.

Behavior:

- The user can create a team during `registration_open` or `submission_open`.
- The user can request to join an open team during `registration_open` or `submission_open`.

#### `rejected`

The user is not approved to participate in the hackathon.

Behavior:

- The user cannot create a team.
- The user cannot join a team.
- The user cannot submit another application to the same hackathon.

#### `withdrawn`

The participant withdrew from the hackathon.

Behavior:

- The user is no longer eligible to participate in the hackathon.
- The user is no longer eligible to attend the hackathon in person through this application when the event is in person.
- When Luma sync is enabled for the hackathon, withdrawal also triggers Luma guest removal for this participant.
- Admin-managed withdrawal can also remove the participant from an active team, or dismantle the participant's team, when team invariants require that outcome.
- Admin-managed withdrawal is blocked when dismantling the participant's team would affect an active draft, submitted, or locked submission.
- The user cannot create a team.
- The user cannot join a team.
- The application record remains stored for auditability and exact-version terms acceptance history.

### Transitions

- `submitted -> approved`
  Actor: hackathon admin or platform admin applying staged decisions.
- `submitted -> rejected`
  Actor: hackathon admin or platform admin applying staged decisions.
- `submitted -> withdrawn`
  Actor: applicant, hackathon admin, or platform admin.
  Guard: applicant self-withdraw requires no active team membership in the hackathon.
  Guard: admin-managed withdrawal can remove an active team membership or dismantle the team when doing so does not affect an active draft, submitted, or locked submission.
- `approved -> withdrawn`
  Actor: participant, hackathon admin, or platform admin.
  Guard: participant self-withdraw requires no active team membership in the hackathon.
  Guard: admin-managed withdrawal can remove an active team membership or dismantle the team when doing so does not affect an active draft, submitted, or locked submission.

## Team Join Request

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
  Guard: the hackathon is in `registration_open` or `submission_open`, the user has an approved `UserApplication`, is not already on another team in the same hackathon, the team has available capacity, and the team is still open to join requests.
  Actor: team admin.
- `pending -> rejected`
  Actor: team admin.
- `pending -> canceled`
  Actor: requesting user.

## Submission

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
- A draft that is never submitted is treated as no submission when judging preparation begins.

#### `submitted`

The team has submitted its project.

Behavior:

- Team admins can continue editing the submission while the hackathon remains in `submission_open`.
- The submission remains eligible to be locked for judging unless it is withdrawn or disqualified.

#### `withdrawn`

The team chose to leave the competition before judging preparation began.

Behavior:

- The submission is no longer considered for judging.

#### `locked`

The submission is closed for editing and ready for judging.

Behavior:

- The submission cannot be edited.
- Judge assignments can be created and processed.

#### `disqualified`

The submission was removed from competition by admin action.

Behavior:

- The submission is no longer considered for judging or ranking.

### Transitions

- `draft -> submitted`
  Actor: team admin.
- `draft -> withdrawn`
  Actor: team admin, hackathon admin, or platform admin acting on the team's request.
- `submitted -> withdrawn`
  Actor: team admin, hackathon admin, or platform admin acting on the team's request.
  Guard: the hackathon has not yet entered `judging_preparation`.
- `submitted -> locked`
  Guard: the hackathon enters `judging_preparation`.
- `draft -> disqualified`
  Actor: hackathon admin or platform admin.
- `submitted -> disqualified`
  Actor: hackathon admin or platform admin.
- `locked -> disqualified`
  Actor: hackathon admin or platform admin.

### Notes

- A team with no submission is not part of this state machine.
- A team admin creates the first draft when the team moves from no submission into this state machine.
- `ineligible` is not a `Submission` state. Judge-level eligibility decisions live on `JudgeAssignment`.

## JudgeAssignment

### States

- `assigned`
- `judge_started`
- `judge_completed`
- `skipped`

### State Meanings

#### `assigned`

The submission is assigned to a judge and waiting for review.

Behavior:

- Hackathon admins can replace an unstarted blind-review assignment with another blind-review assignment.

#### `judge_started`

The judge has begun reviewing the submission.

Behavior:

- The assignment can no longer be manually reassigned by admins.
- A hackathon admin or platform admin can force the assignment to `skipped` if the judge cannot complete the review.

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
  Actor: assigned judge, hackathon admin, or platform admin.
- `judge_started -> judge_completed`
  Actor: assigned judge.

### Notes

- Blind review assignments belong to the `blind_review` stage and pitch assignments belong to the `pitch_review` stage.
- A skipped assignment remains part of the audit trail even after a new blind-review replacement assignment is created.

## Hackathon Credits

### Lifecycle Notes

- Hackathon credits are independent from winner prizes and do not require `winners_announced`.
- Approved participants can claim at most one uploaded value from each hackathon credit offer while inventory remains available.
