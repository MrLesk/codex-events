import { describe, expect, test } from 'vitest'

import { ApiError } from '../../../../server/utils/api-error'
import {
  assertHackathonCompletionAllowed,
  assertShortlistReorderMatchesEntries,
  assertStartShortlistAllowed,
  assertWinnersAnnouncementAllowed
} from '../../../../server/utils/shortlist'

function createHackathon(state: 'judge_review' | 'shortlist' | 'winners_announced' | 'completed') {
  return {
    id: 'hackathon_1',
    name: 'Outcome Hackathon',
    slug: 'outcome-hackathon',
    description: 'Outcome Hackathon',
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
    currentWinnerTermsDocumentId: 'terms_winner_1',
    createdByUserId: 'platform_admin',
    createdAt: '2026-03-20T12:00:00.000Z',
    updatedAt: '2026-03-20T12:00:00.000Z'
  }
}

function createLeaderboardEntry(status: 'judge_completed' | 'judge_started' = 'judge_completed') {
  return {
    team: {
      id: 'team_1',
      hackathonId: 'hackathon_1',
      name: 'Alpha Team',
      slug: 'alpha-team',
      isOpenToJoinRequests: false,
      createdByUserId: 'team_admin',
      createdAt: '2026-03-22T12:00:00.000Z',
      updatedAt: '2026-03-22T12:00:00.000Z'
    },
    submission: {
      id: 'submission_1',
      teamId: 'team_1',
      status: 'locked',
      projectName: 'Project One',
      summary: 'Summary',
      repositoryUrl: null,
      demoUrl: null,
      submittedAt: '2026-03-24T12:00:00.000Z',
      lockedAt: '2026-03-25T12:00:00.000Z',
      withdrawnAt: null,
      disqualifiedAt: null,
      createdAt: '2026-03-24T12:00:00.000Z',
      updatedAt: '2026-03-25T12:00:00.000Z'
    },
    assignment: {
      id: 'assignment_1',
      hackathonId: 'hackathon_1',
      submissionId: 'submission_1',
      judgeUserId: 'judge_a',
      status,
      assignedAt: '2026-03-25T12:05:00.000Z',
      startedAt: status === 'judge_started' ? '2026-03-25T12:06:00.000Z' : '2026-03-25T12:06:00.000Z',
      completedAt: status === 'judge_completed' ? '2026-03-25T12:08:00.000Z' : null,
      skippedAt: null,
      skippedByUserId: null,
      skipReason: null,
      ineligibilityStatus: 'eligible',
      ineligibilityReason: null,
      ineligibilityMarkedAt: null,
      ineligibilityMarkedByUserId: null,
      createdAt: '2026-03-25T12:05:00.000Z'
    },
    weightedScore: 900,
    criterionScores: [],
    baseRank: 1,
    isRanked: true
  } as const
}

describe('shortlist utilities', () => {
  test('start-shortlist requires judge_review and completed reviews for locked submissions', () => {
    expect(() => assertStartShortlistAllowed(createHackathon('judge_review'), [
      createLeaderboardEntry('judge_completed')
    ])).not.toThrow()

    expect(() => assertStartShortlistAllowed(createHackathon('shortlist'), [
      createLeaderboardEntry('judge_completed')
    ])).toThrowError(ApiError)

    expect(() => assertStartShortlistAllowed(createHackathon('judge_review'), [
      createLeaderboardEntry('judge_started')
    ])).toThrowError(ApiError)
  })

  test('shortlist reorder must include every ranked submission exactly once', () => {
    expect(() => assertShortlistReorderMatchesEntries(
      ['submission_1', 'submission_2'],
      [{ submissionId: 'submission_1' }, { submissionId: 'submission_2' }]
    )).not.toThrow()

    expect(() => assertShortlistReorderMatchesEntries(
      ['submission_1'],
      [{ submissionId: 'submission_1' }, { submissionId: 'submission_2' }]
    )).toThrowError(ApiError)

    expect(() => assertShortlistReorderMatchesEntries(
      ['submission_1', 'submission_3'],
      [{ submissionId: 'submission_1' }, { submissionId: 'submission_2' }]
    )).toThrowError(ApiError)
  })

  test('winner announcement and completion guard the documented lifecycle states', () => {
    expect(() => assertWinnersAnnouncementAllowed(createHackathon('shortlist'))).not.toThrow()
    expect(() => assertWinnersAnnouncementAllowed(createHackathon('judge_review'))).toThrowError(ApiError)

    expect(() => assertHackathonCompletionAllowed(createHackathon('winners_announced'))).not.toThrow()
    expect(() => assertHackathonCompletionAllowed(createHackathon('shortlist'))).toThrowError(ApiError)
  })
})
