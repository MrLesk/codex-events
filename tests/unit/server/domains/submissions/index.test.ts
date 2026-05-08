import { afterEach, describe, expect, test } from 'vitest'

import {
  events,
  submissions,
  teams,
  users
} from '../../../../../server/database/schema'
import { ApiError } from '../../../../../server/http/api-error'
import {
  assertSubmissionBodyMatchesEventRequirements,
  assertEventAllowsSubmissionCreation,
  assertEventAllowsSubmissionEditing,
  assertNoSubmissionExists,
  assertSubmissionDisqualifiable,
  assertSubmissionMutable,
  assertSubmissionSubmittable,
  assertSubmissionWithdrawable,
  buildSubmissionWritePayload,
  getEventSubmissionSummary,
  isNoSubmissionStatus,
  resolveValidatedSubmissionTrackId
} from '../../../../../server/domains/submissions'
import { createApiRouteTestHarness } from '../../../../support/backend/api-route'

function createEvent(
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
    id: 'event_1',
    eventType: 'hackathon',
    name: 'Submission Event',
    slug: 'submission-event',
    description: 'Submission Event',
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
      eventTracks: {
        findMany: async () => trackIds.map(id => ({ id }))
      }
    }
  } as never
}

describe('TASK-3.7 submission helpers', () => {
  const harnesses: Array<ReturnType<typeof createApiRouteTestHarness>> = []

  afterEach(async () => {
    while (harnesses.length > 0) {
      await harnesses.pop()?.d1Database.close()
    }
  })

  test('submission creation remains limited to submission_open', () => {
    expect(() => assertEventAllowsSubmissionCreation(createEvent('submission_open'))).not.toThrow()
    expect(() => assertEventAllowsSubmissionCreation(createEvent('judging_preparation'))).toThrowError(ApiError)
  })

  test('submission editing remains available until judging starts', () => {
    expect(() => assertEventAllowsSubmissionEditing(createEvent('submission_open'))).not.toThrow()
    expect(() => assertEventAllowsSubmissionEditing(createEvent('judging_preparation'))).not.toThrow()
    expect(() => assertEventAllowsSubmissionEditing(createEvent('blind_review'))).toThrowError(ApiError)
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
      createEvent('submission_open'),
      createSubmission('draft')
    )).resolves.toBeUndefined()
    await expect(assertSubmissionSubmittable(
      createDatabase(),
      createEvent('submission_open'),
      createSubmission('submitted')
    )).rejects.toThrowError(ApiError)
    await expect(assertSubmissionSubmittable(
      createDatabase(),
      {
        ...createEvent('submission_open'),
        requireSubmissionRepositoryUrl: true
      },
      createIncompleteSubmission('draft')
    )).rejects.toThrowError(ApiError)
  })

  test('submission create and update requirements follow event configuration', () => {
    expect(() => assertSubmissionBodyMatchesEventRequirements(createEvent('submission_open'), {
      projectName: 'Project',
      summary: '',
      repositoryUrl: '',
      demoUrl: '',
      trackId: null
    })).not.toThrow()

    expect(() => assertSubmissionBodyMatchesEventRequirements({
      ...createEvent('submission_open'),
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

  test('submission track validation follows the configured event tracks', async () => {
    await expect(resolveValidatedSubmissionTrackId(
      createDatabase(),
      'event_1',
      null
    )).resolves.toBeNull()

    await expect(resolveValidatedSubmissionTrackId(
      createDatabase(),
      'event_1',
      'track_1'
    )).rejects.toThrowError(ApiError)

    await expect(resolveValidatedSubmissionTrackId(
      createDatabase(['track_1']),
      'event_1',
      null
    )).rejects.toThrowError(ApiError)

    await expect(resolveValidatedSubmissionTrackId(
      createDatabase(['track_1']),
      'event_1',
      'track_2'
    )).rejects.toThrowError(ApiError)

    await expect(resolveValidatedSubmissionTrackId(
      createDatabase(['track_1']),
      'event_1',
      'track_1'
    )).resolves.toBe('track_1')
  })

  test('withdrawal is allowed until judging starts and only for draft or submitted submissions', () => {
    expect(() => assertSubmissionWithdrawable(createEvent('submission_open'), createSubmission('draft'))).not.toThrow()
    expect(() => assertSubmissionWithdrawable(createEvent('submission_open'), createSubmission('submitted'))).not.toThrow()
    expect(() => assertSubmissionWithdrawable(createEvent('judging_preparation'), createSubmission('submitted'))).not.toThrow()
    expect(() => assertSubmissionWithdrawable(createEvent('submission_open'), createSubmission('locked'))).toThrowError(ApiError)
    expect(() => assertSubmissionWithdrawable(createEvent('blind_review'), createSubmission('submitted'))).toThrowError(ApiError)
  })

  test('disqualification applies only to locked submissions during the judging and outcomes lifecycle', () => {
    expect(() => assertSubmissionDisqualifiable(createEvent('blind_review'), createSubmission('locked'))).not.toThrow()
    expect(() => assertSubmissionDisqualifiable(createEvent('shortlist'), createSubmission('locked'))).not.toThrow()
    expect(() => assertSubmissionDisqualifiable(createEvent('pitch'), createSubmission('locked'))).not.toThrow()
    expect(() => assertSubmissionDisqualifiable(createEvent('pitch_review'), createSubmission('locked'))).not.toThrow()
    expect(() => assertSubmissionDisqualifiable(createEvent('final_deliberation'), createSubmission('locked'))).not.toThrow()
    expect(() => assertSubmissionDisqualifiable(createEvent('winners_announced'), createSubmission('locked'))).not.toThrow()
    expect(() => assertSubmissionDisqualifiable(createEvent('completed'), createSubmission('locked'))).not.toThrow()
    expect(() => assertSubmissionDisqualifiable(createEvent('submission_open'), createSubmission('locked'))).toThrowError(ApiError)
    expect(() => assertSubmissionDisqualifiable(createEvent('shortlist'), createSubmission('draft'))).toThrowError(ApiError)
    expect(() => assertSubmissionDisqualifiable(createEvent('shortlist'), createSubmission('submitted'))).toThrowError(ApiError)
    expect(() => assertSubmissionDisqualifiable(createEvent('shortlist'), createSubmission('withdrawn'))).toThrowError(ApiError)

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

  test('submission summary reports status counts without returning submission rows', async () => {
    const harness = createApiRouteTestHarness({
      routes: []
    })
    harnesses.push(harness)

    await harness.database.insert(users).values({
      id: 'platform_admin',
      auth0Subject: 'auth0|platform_admin',
      email: 'platform-admin@example.com',
      displayName: 'Platform Admin'
    })

    await harness.database.insert(events).values({
      ...createEvent('submission_open'),
      id: 'event_1',
      eventType: 'hackathon',
      createdByUserId: 'platform_admin'
    })

    await harness.database.insert(teams).values([
      {
        id: 'team_none',
        eventId: 'event_1',
        name: 'No Submission',
        slug: 'no-submission',
        createdByUserId: 'platform_admin'
      },
      {
        id: 'team_draft',
        eventId: 'event_1',
        name: 'Draft Team',
        slug: 'draft-team',
        createdByUserId: 'platform_admin'
      },
      {
        id: 'team_submitted',
        eventId: 'event_1',
        name: 'Submitted Team',
        slug: 'submitted-team',
        createdByUserId: 'platform_admin'
      },
      {
        id: 'team_locked',
        eventId: 'event_1',
        name: 'Locked Team',
        slug: 'locked-team',
        createdByUserId: 'platform_admin'
      },
      {
        id: 'team_withdrawn',
        eventId: 'event_1',
        name: 'Withdrawn Team',
        slug: 'withdrawn-team',
        createdByUserId: 'platform_admin'
      },
      {
        id: 'team_disqualified',
        eventId: 'event_1',
        name: 'Disqualified Team',
        slug: 'disqualified-team',
        createdByUserId: 'platform_admin'
      }
    ])

    await harness.database.insert(submissions).values([
      {
        id: 'submission_draft',
        teamId: 'team_draft',
        status: 'draft',
        projectName: 'Draft Project'
      },
      {
        id: 'submission_submitted',
        teamId: 'team_submitted',
        status: 'submitted',
        projectName: 'Submitted Project',
        submittedAt: '2026-03-24T12:00:00.000Z'
      },
      {
        id: 'submission_locked',
        teamId: 'team_locked',
        status: 'locked',
        projectName: 'Locked Project',
        submittedAt: '2026-03-24T12:00:00.000Z',
        lockedAt: '2026-03-25T12:00:00.000Z'
      },
      {
        id: 'submission_withdrawn',
        teamId: 'team_withdrawn',
        status: 'withdrawn',
        projectName: 'Withdrawn Project',
        withdrawnAt: '2026-03-25T12:00:00.000Z'
      },
      {
        id: 'submission_disqualified',
        teamId: 'team_disqualified',
        status: 'disqualified',
        projectName: 'Disqualified Project',
        disqualifiedAt: '2026-03-25T12:00:00.000Z'
      }
    ])

    await expect(getEventSubmissionSummary(harness.database, 'event_1')).resolves.toEqual({
      totalTeams: 6,
      noSubmissionTeamCount: 4,
      submittedOrLaterTeamCount: 2,
      statusCounts: {
        none: 1,
        draft: 1,
        submitted: 1,
        locked: 1,
        withdrawn: 1,
        disqualified: 1
      }
    })
  })
})
