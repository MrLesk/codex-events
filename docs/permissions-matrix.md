# Permissions Matrix

This document defines the canonical permissions for the Codex hackathon platform.

## Actor Definitions

- `user`: an authenticated platform user with no special team or hackathon authority
- `approved_user`: a user whose `UserApplication` for a specific hackathon is approved
- `team_member`: a user with an active `TeamMember` record on a team
- `team_admin`: a `team_member` whose team role is `admin`
- `judge`: a user assigned to review through a `JudgeAssignment`
- `hackathon_admin`: a user with explicit `hackathon_admin` access in a hackathon
- `platform_admin`: a user with `is_platform_admin = true`
- `prize_recipient`: a user with a `PrizeRedemption` record to complete, or an active team admin acting on a pending team-scoped redemption
- `system`: automatic platform behavior driven by configured windows

## Permission Inheritance

- `platform_admin` includes all `hackathon_admin` permissions in every hackathon.
- `hackathon_admin` includes judge permissions when acting through a `JudgeAssignment`.
- The automatic judge distribution pool is controlled by `HackathonRoleAssignment.is_in_judge_pool`.
- A `judge` role must be in the automatic judge distribution pool.
- A user acting through a `JudgeAssignment` uses the blind judging view even if that user is also an admin.
- Admin visibility outside the judge review flow is not restricted by the blind judging view.

## Global Platform Actions

| Action | User | Platform Admin |
| --- | --- | --- |
| Create account and authenticate | Yes | Yes |
| Delete own account | Yes | Yes |
| Create hackathon | No | Yes |
| Assign hackathon admins | No | Yes |

## Hackathon Lifecycle Actions

| Action | Approved User | Judge | Hackathon Admin | Platform Admin | System |
| --- | --- | --- | --- | --- | --- |
| Open registration | No | No | No | No | Yes |
| Open submission | No | No | Yes | Yes | No |
| Start judging preparation | No | No | Yes | Yes | No |
| Start judge review | No | No | Yes | Yes | No |
| Move to shortlist | No | No | Yes | Yes | No |
| Announce winners | No | No | Yes | Yes | No |
| Complete hackathon | No | No | Yes | Yes | No |

## Application Permissions

| Action | User | Approved User | Hackathon Admin | Platform Admin |
| --- | --- | --- | --- | --- |
| Submit `UserApplication` | Yes, if no application exists for the hackathon and the hackathon is `registration_open` | No | No | No |
| View own application | Yes | Yes | No | No |
| View hackathon application records | No | No | Yes | Yes |
| Approve application | No | No | Yes | Yes |
| Reject application | No | No | Yes | Yes |

## Team Permissions

| Action | User | Approved User | Team Member | Team Admin | Hackathon Admin | Platform Admin |
| --- | --- | --- | --- | --- | --- | --- |
| Create team | No | Yes, during `registration_open` or `submission_open` | No | No | No | No |
| Search teams | No | Yes, during `registration_open` or `submission_open` | Yes | Yes | Yes | Yes |
| Request to join open team | No | Yes, during `registration_open` or `submission_open` | No | No | No | No |
| Cancel own pending join request | No | Yes | No | No | No | No |
| Rename team | No | No | No | Yes | No | No |
| Approve join request | No | No | No | Yes, only while team remains open and capacity is available | No | No |
| Reject join request | No | No | No | Yes | No | No |
| Remove team member | No | No | No | Yes, only if at least one active team admin remains | No | No |
| Leave team during `registration_open` or `submission_open` | No | No | Yes, only if at least one active team admin remains | Yes, only if at least one active team admin remains | No | No |
| Leave team after submission closes | No | No | Yes, only if at least one active team admin remains and at least one active team member remains | Yes, only if at least one active team admin remains and at least one active team member remains | No | No |

## Submission Permissions

| Action | Team Member | Team Admin | Hackathon Admin | Platform Admin |
| --- | --- | --- | --- | --- |
| Create submission draft | No | Yes, during `submission_open` | No | No |
| Edit submission draft | No | Yes, during `submission_open` | No | No |
| Submit project | No | Yes, during `submission_open` | No | No |
| Withdraw submission before `judging_preparation` | No | Yes | Yes, only on team request | Yes, only on team request |
| View own team submission | Yes | Yes | Yes | Yes |
| Disqualify submission | No | No | Yes | Yes |

## Judging Permissions

| Action | Judge | Hackathon Admin | Platform Admin |
| --- | --- | --- | --- |
| View assigned submission in blind judging view | Yes | Yes, when acting through a `JudgeAssignment` | Yes, when acting through a `JudgeAssignment` |
| Start assigned review | Yes | Yes, when acting through a `JudgeAssignment` | Yes, when acting through a `JudgeAssignment` |
| Complete assigned review | Yes | Yes, when acting through a `JudgeAssignment` | Yes, when acting through a `JudgeAssignment` |
| Skip assigned review | Yes | Yes, when acting through a `JudgeAssignment` | Yes, when acting through a `JudgeAssignment` |
| Mark assignment ineligible and provide reason | Yes | Yes, when acting through a `JudgeAssignment` | Yes, when acting through a `JudgeAssignment` |
| Reassign an unstarted assignment | No | Yes | Yes |
| Force an in-progress assignment to `skipped` | No | Yes | Yes |
| Revert an ineligibility decision | No | Yes | Yes |

## Shortlist And Winners

| Action | Judge | Hackathon Admin | Platform Admin |
| --- | --- | --- | --- |
| Review final scores in shortlist | Yes | Yes | Yes |
| Reorder final ranking in shortlist | No | Yes | Yes |
| Change underlying judge scores in shortlist | No | No | No |
| Announce winners | No | Yes | Yes |

## Prize Redemption

| Action | Prize Recipient | Hackathon Admin | Platform Admin |
| --- | --- | --- | --- |
| Submit legal name and accept winner terms | Yes | No | No |
| View prize redemption records | No | Yes | Yes |

## Visibility Rules

- Users can view only their own application records.
- Team members can view their own team membership and submission data.
- Team admins can view team join requests and manage team membership.
- Judges see only the blind judging view for assigned submissions.
- Hackathon admins and platform admins can view hackathon-wide operational data.

## Operational Notes

- Team formation is allowed during `registration_open` and `submission_open`.
- Submission creation and editing are allowed only during `submission_open`.
- When a judge assignment is skipped, the system creates a new active assignment for the judge with the lowest assigned load.
