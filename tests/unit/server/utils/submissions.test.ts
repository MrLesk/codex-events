import { describe, expect, test } from 'vitest'

import { ApiError } from '../../../../server/utils/api-error'
import {
  assertSubmissionBodyMatchesHackathonRequirements,
  assertHackathonAllowsSubmissionEditing,
  assertNoSubmissionExists,
  assertSubmissionDisqualifiable,
  assertSubmissionMutable,
  assertSubmissionSubmittable,
  assertSubmissionWithdrawable,
  buildSubmissionWritePayload,
  isNoSubmissionStatus,
  resolveValidatedSubmissionTrackId
} from '../../../../server/utils/submissions'

function createHackathon(
  state:
    | 'registration_open'
    | 'submission_open'
    | 'judging_preparation'
    | 'blind_review'
    | 'shortlist'
    | 'pitch'
    | 'pitch_review'
    | 'final_deliberation'
    | 'winners_announced'
    | 'completed'
) {
  return {
    id: 'hackathon_1',
    name: 'Submission Hackathon',
    slug: 'submission-hackathon',
    description: 'Submission Hackathon',
    discordServerUrl: null,
    city: 'Vienna',
    country: 'Austria',
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
    requireSubmissionSummary: false,
    requireSubmissionRepositoryUrl: false,
    requireSubmissionDemoUrl: false,
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
    trackId: null,
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

function createIncompleteSubmission(status: 'draft' | 'submitted' | 'withdrawn' | 'locked' | 'disqualified') {
  return {
    ...createSubmission(status),
    repositoryUrl: null,
    demoUrl: null
  }
}

function createDatabase(trackIds: string[] = []) {
  return {
    query: {
      hackathonTracks: {
        findMany: async () => trackIds.map(id => ({ id }))
      }
    }
  } as never
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

  test('submission mutation and submit guards follow the documented state machine', async () => {
    expect(() => assertSubmissionMutable(createSubmission('draft'))).not.toThrow()
    expect(() => assertSubmissionMutable(createSubmission('submitted'))).not.toThrow()
    expect(() => assertSubmissionMutable(createSubmission('locked'))).toThrowError(ApiError)

    await expect(assertSubmissionSubmittable(
      createDatabase(),
      createHackathon('submission_open'),
      createSubmission('draft')
    )).resolves.toBeUndefined()
    await expect(assertSubmissionSubmittable(
      createDatabase(),
      createHackathon('submission_open'),
      createSubmission('submitted')
    )).rejects.toThrowError(ApiError)
    await expect(assertSubmissionSubmittable(
      createDatabase(),
      {
        ...createHackathon('submission_open'),
        requireSubmissionRepositoryUrl: true
      },
      createIncompleteSubmission('draft')
    )).rejects.toThrowError(ApiError)
  })

  test('submission create and update requirements follow hackathon configuration', () => {
    expect(() => assertSubmissionBodyMatchesHackathonRequirements(createHackathon('submission_open'), {
      projectName: 'Project',
      summary: '',
      repositoryUrl: '',
      demoUrl: '',
      trackId: null
    })).not.toThrow()

    expect(() => assertSubmissionBodyMatchesHackathonRequirements({
      ...createHackathon('submission_open'),
      requireSubmissionSummary: true,
      requireSubmissionDemoUrl: true
    }, {
      projectName: 'Project',
      summary: '',
      repositoryUrl: '',
      demoUrl: '',
      trackId: null
    })).toThrowError(ApiError)
  })

  test('submission track validation follows the configured hackathon tracks', async () => {
    await expect(resolveValidatedSubmissionTrackId(
      createDatabase(),
      'hackathon_1',
      null
    )).resolves.toBeNull()

    await expect(resolveValidatedSubmissionTrackId(
      createDatabase(),
      'hackathon_1',
      'track_1'
    )).rejects.toThrowError(ApiError)

    await expect(resolveValidatedSubmissionTrackId(
      createDatabase(['track_1']),
      'hackathon_1',
      null
    )).rejects.toThrowError(ApiError)

    await expect(resolveValidatedSubmissionTrackId(
      createDatabase(['track_1']),
      'hackathon_1',
      'track_2'
    )).rejects.toThrowError(ApiError)

    await expect(resolveValidatedSubmissionTrackId(
      createDatabase(['track_1']),
      'hackathon_1',
      'track_1'
    )).resolves.toBe('track_1')
  })

  test('withdrawal is allowed only before judging preparation and only for draft or submitted submissions', () => {
    expect(() => assertSubmissionWithdrawable(createHackathon('submission_open'), createSubmission('draft'))).not.toThrow()
    expect(() => assertSubmissionWithdrawable(createHackathon('submission_open'), createSubmission('submitted'))).not.toThrow()
    expect(() => assertSubmissionWithdrawable(createHackathon('judging_preparation'), createSubmission('submitted'))).toThrowError(ApiError)
    expect(() => assertSubmissionWithdrawable(createHackathon('submission_open'), createSubmission('locked'))).toThrowError(ApiError)
  })

  test('disqualification applies only to locked submissions during the judging and outcomes lifecycle', () => {
    expect(() => assertSubmissionDisqualifiable(createHackathon('blind_review'), createSubmission('locked'))).not.toThrow()
    expect(() => assertSubmissionDisqualifiable(createHackathon('shortlist'), createSubmission('locked'))).not.toThrow()
    expect(() => assertSubmissionDisqualifiable(createHackathon('pitch'), createSubmission('locked'))).not.toThrow()
    expect(() => assertSubmissionDisqualifiable(createHackathon('pitch_review'), createSubmission('locked'))).not.toThrow()
    expect(() => assertSubmissionDisqualifiable(createHackathon('final_deliberation'), createSubmission('locked'))).not.toThrow()
    expect(() => assertSubmissionDisqualifiable(createHackathon('winners_announced'), createSubmission('locked'))).not.toThrow()
    expect(() => assertSubmissionDisqualifiable(createHackathon('completed'), createSubmission('locked'))).not.toThrow()
    expect(() => assertSubmissionDisqualifiable(createHackathon('submission_open'), createSubmission('locked'))).toThrowError(ApiError)
    expect(() => assertSubmissionDisqualifiable(createHackathon('shortlist'), createSubmission('draft'))).toThrowError(ApiError)
    expect(() => assertSubmissionDisqualifiable(createHackathon('shortlist'), createSubmission('submitted'))).toThrowError(ApiError)
    expect(() => assertSubmissionDisqualifiable(createHackathon('shortlist'), createSubmission('withdrawn'))).toThrowError(ApiError)

    expect(isNoSubmissionStatus('draft')).toBe(true)
    expect(isNoSubmissionStatus('withdrawn')).toBe(true)
    expect(isNoSubmissionStatus('disqualified')).toBe(true)
    expect(isNoSubmissionStatus('submitted')).toBe(false)
    expect(isNoSubmissionStatus('locked')).toBe(false)
  })

  test('submission write payloads persist the canonical required fields', () => {
    expect(buildSubmissionWritePayload({
      projectName: 'Updated Project',
      summary: '',
      repositoryUrl: '',
      demoUrl: 'https://example.com/updated-project',
      trackId: 'track_1'
    }, '2026-03-24T13:00:00.000Z')).toEqual({
      projectName: 'Updated Project',
      summary: null,
      repositoryUrl: null,
      demoUrl: 'https://example.com/updated-project',
      trackId: 'track_1',
      updatedAt: '2026-03-24T13:00:00.000Z'
    })
  })
})
