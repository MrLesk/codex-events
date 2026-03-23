import { describe, expect, test } from 'vitest'

import {
  formatTeamSubmissionStatus,
  getCreateSubmissionAvailability,
  getTeamSubmissionStateSummary,
  getTeamSubmissionStatusColor,
  getSubmitSubmissionAvailability,
  getUpdateSubmissionAvailability,
  getWithdrawSubmissionAvailability,
  type TeamSubmissionRecord
} from '../../../../app/utils/team-submission'

function createSubmission(status: TeamSubmissionRecord['status']): TeamSubmissionRecord {
  return {
    id: 'submission_fixture',
    teamId: 'team_fixture',
    status,
    projectName: 'Launch Console',
    summary: 'Fixture summary',
    repositoryUrl: 'https://github.com/example/launch-console',
    demoUrl: 'https://example.com/launch-console',
    submittedAt: status === 'submitted' || status === 'locked' ? '2026-03-24T12:00:00.000Z' : null,
    lockedAt: status === 'locked' ? '2026-03-25T12:00:00.000Z' : null,
    withdrawnAt: status === 'withdrawn' ? '2026-03-24T14:00:00.000Z' : null,
    disqualifiedAt: status === 'disqualified' ? '2026-03-24T14:00:00.000Z' : null,
    createdAt: '2026-03-24T12:00:00.000Z',
    updatedAt: '2026-03-24T12:00:00.000Z'
  }
}

describe('team submission helpers', () => {
  test('allows creating the first draft only for team admins during submission_open', () => {
    expect(getCreateSubmissionAvailability({
      state: 'submission_open'
    }, null, true)).toEqual({
      isAllowed: true
    })

    expect(getCreateSubmissionAvailability({
      state: 'registration_open'
    }, null, true)).toEqual({
      isAllowed: false,
      reason: 'The first submission draft can be created only while submission is open.'
    })

    expect(getCreateSubmissionAvailability({
      state: 'submission_open'
    }, null, false)).toEqual({
      isAllowed: false,
      reason: 'Only team admins can manage the project submission.'
    })
  })

  test('limits edits, submit, and withdraw to the canonical mutable states', () => {
    expect(getUpdateSubmissionAvailability({
      state: 'submission_open'
    }, createSubmission('draft'), true)).toEqual({
      isAllowed: true
    })

    expect(getUpdateSubmissionAvailability({
      state: 'submission_open'
    }, createSubmission('submitted'), true)).toEqual({
      isAllowed: true
    })

    expect(getUpdateSubmissionAvailability({
      state: 'judging_preparation'
    }, createSubmission('submitted'), true)).toEqual({
      isAllowed: false,
      reason: 'Project edits are available only while submission is open.'
    })

    expect(getSubmitSubmissionAvailability({
      state: 'submission_open'
    }, createSubmission('draft'), true)).toEqual({
      isAllowed: true
    })

    expect(getSubmitSubmissionAvailability({
      state: 'submission_open'
    }, createSubmission('submitted'), true)).toEqual({
      isAllowed: false,
      reason: 'This project is already submitted.'
    })

    expect(getWithdrawSubmissionAvailability({
      state: 'submission_open'
    }, createSubmission('submitted'), true)).toEqual({
      isAllowed: true
    })

    expect(getWithdrawSubmissionAvailability({
      state: 'judge_review'
    }, createSubmission('locked'), true)).toEqual({
      isAllowed: false,
      reason: 'Submissions can be withdrawn only before judging preparation begins.'
    })
  })

  test('returns stable state summaries and labels for participant UI', () => {
    expect(getTeamSubmissionStateSummary({
      state: 'submission_open'
    }, null)).toContain('has not started a project submission yet')

    expect(getTeamSubmissionStateSummary({
      state: 'submission_open'
    }, createSubmission('locked'))).toBe('This project is locked for judging and can no longer be edited or withdrawn.')

    expect(formatTeamSubmissionStatus('none')).toBe('No submission')
    expect(formatTeamSubmissionStatus('withdrawn')).toBe('Withdrawn')
    expect(getTeamSubmissionStatusColor('submitted')).toBe('primary')
    expect(getTeamSubmissionStatusColor('disqualified')).toBe('error')
  })
})
