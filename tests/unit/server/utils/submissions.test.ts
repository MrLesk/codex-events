import { describe, expect, test } from 'vitest'

import { ApiError } from '../../../../server/utils/api-error'
import {
  assertHackathonAllowsSubmissionEditing,
  assertNoSubmissionExists,
  assertSubmissionDisqualifiable,
  assertSubmissionMutable,
  assertSubmissionSubmittable,
  assertSubmissionWithdrawable,
  buildSubmissionWritePayload,
  isNoSubmissionStatus
} from '../../../../server/utils/submissions'

function createHackathon(
  state: 'registration_open' | 'submission_open' | 'judging_preparation' | 'judge_review' | 'shortlist' | 'winners_announced' | 'completed'
) {
  return {
    id: 'hackathon_1',
    name: 'Submission Hackathon',
    slug: 'submission-hackathon',
    description: 'Submission Hackathon',
    city: 'Vienna',
    address: 'Fixture Address',
    registrationOpensAt: '2026-03-20T12:00:00.000Z',
    registrationClosesAt: '2026-03-23T12:00:00.000Z',
    submissionOpensAt: '2026-03-23T12:00:00.000Z',
    submissionClosesAt: '2026-03-25T12:00:00.000Z',
    state,
    maxTeamMembers: 4,
    requireXProfile: false,
    requireLinkedinProfile: false,
    requireGithubProfile: false,
    currentApplicationTermsDocumentId: null,
    currentWinnerTermsDocumentId: null,
    createdByUserId: 'platform_admin',
    createdAt: '2026-03-20T12:00:00.000Z',
    updatedAt: '2026-03-20T12:00:00.000Z'
  }
}

function createSubmission(status: 'draft' | 'submitted' | 'withdrawn' | 'locked' | 'disqualified') {
  return {
    id: 'submission_1',
    teamId: 'team_1',
    status,
    projectName: 'Project',
    summary: 'Summary',
    repositoryUrl: 'https://github.com/example/project',
    demoUrl: 'https://demo.example.com',
    submittedAt: status === 'submitted' || status === 'locked' ? '2026-03-24T12:00:00.000Z' : null,
    lockedAt: status === 'locked' ? '2026-03-25T12:00:00.000Z' : null,
    withdrawnAt: status === 'withdrawn' ? '2026-03-25T12:00:00.000Z' : null,
    disqualifiedAt: status === 'disqualified' ? '2026-03-25T12:00:00.000Z' : null,
    createdAt: '2026-03-24T12:00:00.000Z',
    updatedAt: '2026-03-24T12:00:00.000Z'
  }
}

describe('TASK-3.7 submission helpers', () => {
  test('submission editing is limited to submission_open', () => {
    expect(() => assertHackathonAllowsSubmissionEditing(createHackathon('submission_open'))).not.toThrow()
    expect(() => assertHackathonAllowsSubmissionEditing(createHackathon('judging_preparation'))).toThrowError(ApiError)
  })

  test('submission creation requires the team to have no prior submission record', () => {
    expect(() => assertNoSubmissionExists(null, 'team_1')).not.toThrow()
    expect(() => assertNoSubmissionExists(createSubmission('withdrawn'), 'team_1')).toThrowError(ApiError)
  })

  test('submission mutation and submit guards follow the documented state machine', () => {
    expect(() => assertSubmissionMutable(createSubmission('draft'))).not.toThrow()
    expect(() => assertSubmissionMutable(createSubmission('submitted'))).not.toThrow()
    expect(() => assertSubmissionMutable(createSubmission('locked'))).toThrowError(ApiError)

    expect(() => assertSubmissionSubmittable(createSubmission('draft'))).not.toThrow()
    expect(() => assertSubmissionSubmittable(createSubmission('submitted'))).toThrowError(ApiError)
  })

  test('withdrawal is allowed only before judging preparation and only for draft or submitted submissions', () => {
    expect(() => assertSubmissionWithdrawable(createHackathon('submission_open'), createSubmission('draft'))).not.toThrow()
    expect(() => assertSubmissionWithdrawable(createHackathon('submission_open'), createSubmission('submitted'))).not.toThrow()
    expect(() => assertSubmissionWithdrawable(createHackathon('judging_preparation'), createSubmission('submitted'))).toThrowError(ApiError)
    expect(() => assertSubmissionWithdrawable(createHackathon('submission_open'), createSubmission('locked'))).toThrowError(ApiError)
  })

  test('disqualification applies only to locked submissions during or after judge review', () => {
    expect(() => assertSubmissionDisqualifiable(createHackathon('judge_review'), createSubmission('locked'))).not.toThrow()
    expect(() => assertSubmissionDisqualifiable(createHackathon('shortlist'), createSubmission('locked'))).not.toThrow()
    expect(() => assertSubmissionDisqualifiable(createHackathon('submission_open'), createSubmission('locked'))).toThrowError(ApiError)
    expect(() => assertSubmissionDisqualifiable(createHackathon('judge_review'), createSubmission('draft'))).toThrowError(ApiError)
    expect(() => assertSubmissionDisqualifiable(createHackathon('judge_review'), createSubmission('submitted'))).toThrowError(ApiError)
    expect(() => assertSubmissionDisqualifiable(createHackathon('judge_review'), createSubmission('withdrawn'))).toThrowError(ApiError)

    expect(isNoSubmissionStatus('draft')).toBe(true)
    expect(isNoSubmissionStatus('withdrawn')).toBe(true)
    expect(isNoSubmissionStatus('disqualified')).toBe(true)
    expect(isNoSubmissionStatus('submitted')).toBe(false)
    expect(isNoSubmissionStatus('locked')).toBe(false)
  })

  test('submission write payloads preserve explicit nulls for clearable fields', () => {
    expect(buildSubmissionWritePayload({
      projectName: 'Updated Project',
      summary: null,
      repositoryUrl: null
    }, '2026-03-24T13:00:00.000Z')).toEqual({
      projectName: 'Updated Project',
      summary: null,
      repositoryUrl: null,
      updatedAt: '2026-03-24T13:00:00.000Z'
    })
  })
})
