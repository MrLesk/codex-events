# Lifecycle And State Machines

This document defines the canonical lifecycle states and transitions for the main workflows in the Codex hackathon platform.

## Hackathon

### States

- `draft`
- `registration_open`
- `submission_open`
- `judging_preparation`
- `judge_review`
- `shortlist`
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
- Submissions are distributed between the explicit judge pool as evenly as possible.
- Hackathon admins can reassign submissions only while the active assignment has not been started.

#### `judge_review`

Judges actively review assigned submissions.

Behavior:

- Judges can start, complete, or skip their active assignments.
- Skipped assignments are redistributed to the judge with the lowest assigned load.
- Hackathon admins can no longer withdraw submissions.
- If a submission must be removed from competition during or after review, the admin action is `disqualified`.

#### `shortlist`

The hackathon leaderboard is reviewed before winners are announced.

Behavior:

- Judges can review final scores.
- Hackathon admins can manually reorder the final ranking without changing the underlying judge scores.
- Shortlist order is computed hackathon data, not a separate persisted shortlist object.

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
  Actor: system.
  Guard: hackathon configuration is ready and the registration window is open.
- `registration_open -> submission_open`
  Actor: hackathon admin or platform admin.
  Guard: registration is closed, the submission window is open, and an admin starts submission manually.
- `submission_open -> judging_preparation`
  Guard: submission editing is closed and a hackathon admin starts judging preparation manually.
- `judging_preparation -> judge_review`
  Guard: judge assignments are ready and a hackathon admin starts judge review manually.
- `judge_review -> shortlist`
  Guard: all active submissions have a completed review outcome or have been removed from competition.
- `shortlist -> winners_announced`
  Guard: hackathon admins finalize the ranking and announce winners.
- `winners_announced -> completed`
  Guard: hackathon admins close the hackathon.

## UserApplication

### States

- `submitted`
- `approved`
- `rejected`

### State Meanings

#### `submitted`

The user has applied to the hackathon and is awaiting a decision.

Behavior:

- The user counts as an applicant.
- The user cannot create or join a team yet.

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

### Transitions

- `submitted -> approved`
  Actor: hackathon admin or platform admin.
- `submitted -> rejected`
  Actor: hackathon admin or platform admin.

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

- Hackathon admins can replace the assignment with another unstarted assignment.

#### `judge_started`

The judge has begun reviewing the submission.

Behavior:

- The assignment can no longer be manually reassigned by admins.
- A hackathon admin or platform admin can force the assignment to `skipped` if the judge cannot complete the review.

#### `judge_completed`

The judge finished the review.

Behavior:

- Criterion scores, comments, and eligibility decisions are final unless an admin explicitly reverts an eligibility decision.

#### `skipped`

The judge declined to review the submission.

Behavior:

- The assignment is closed.
- A new active assignment is created for another judge with the lowest assigned load.

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

- Each submission has one active judge assignment during normal judge review.
- A skipped assignment remains part of the audit trail even after a new assignment is created.
