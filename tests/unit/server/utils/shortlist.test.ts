import { describe, expect, test } from 'vitest'

import { ApiError } from '../../../../server/utils/api-error'
import {
  assertFinalDeliberationReorderAllowed,
  assertFinalDeliberationReorderMatchesEntries,
  assertFinalDeliberationViewAllowed,
  assertHackathonCompletionAllowed,
  assertSelectedFinalistsMatchEntries,
  assertSelectFinalistsAllowed,
  assertShortlistViewAllowed,
  assertStartFinalDeliberationAllowed,
  assertStartShortlistAllowed,
  assertWinnersAnnouncementAllowed,
  calculateFinalScore
} from '../../../../server/utils/shortlist'

function createHackathon(
  state:
    | 'blind_review'
    | 'shortlist'
    | 'pitch_review'
    | 'final_deliberation'
    | 'winners_announced'
    | 'completed'
) {
  return {
    id: 'hackathon_1',
    name: 'Outcome Hackathon',
    slug: 'outcome-hackathon',
    description: 'Outcome Hackathon',
    city: 'Vienna',
    country: 'Austria',
    address: 'Fixture Address',
    registrationOpensAt: '2026-03-20T12:00:00.000Z',
    registrationClosesAt: '2026-03-23T12:00:00.000Z',
    submissionOpensAt: '2026-03-23T12:00:00.000Z',
    submissionClosesAt: '2026-03-25T12:00:00.000Z',
    state,
    blindReviewCount: 2,
    pitchReviewEnabled: true,
    blindScoreWeightPercent: 70,
    pitchScoreWeightPercent: 30,
    maxTeamMembers: 4,
    finalRankingSubmissionIdsJson: '[]',
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
    reviewStatus: status,
    ineligibilityStatus: 'eligible',
    scoreTotal: 9,
    criterionScores: [],
    baseRank: 1,
    isRanked: true
  } as const
}

describe('shortlist utilities', () => {
  test('start-shortlist requires blind_review and completed reviews for locked submissions', () => {
    expect(() => assertStartShortlistAllowed(createHackathon('blind_review'), [
      createLeaderboardEntry('judge_completed')
    ])).not.toThrow()

    expect(() => assertStartShortlistAllowed(createHackathon('shortlist'), [
      createLeaderboardEntry('judge_completed')
    ])).toThrowError(ApiError)

    expect(() => assertStartShortlistAllowed(createHackathon('blind_review'), [
      createLeaderboardEntry('judge_started')
    ])).toThrowError(ApiError)

    expect(() => assertStartShortlistAllowed({
      ...createHackathon('blind_review'),
      pitchReviewEnabled: false
    }, [
      createLeaderboardEntry('judge_completed')
    ])).toThrowError(ApiError)
  })

  test('finalist selection must be a duplicate-free ordered subset of ranked submissions', () => {
    expect(() => assertSelectedFinalistsMatchEntries(
      ['submission_2'],
      [{ submissionId: 'submission_1' }, { submissionId: 'submission_2' }]
    )).not.toThrow()

    expect(() => assertSelectedFinalistsMatchEntries(
      ['submission_1', 'submission_1'],
      [{ submissionId: 'submission_1' }, { submissionId: 'submission_2' }]
    )).toThrowError(ApiError)

    expect(() => assertSelectedFinalistsMatchEntries(
      [],
      [{ submissionId: 'submission_1' }, { submissionId: 'submission_2' }]
    )).not.toThrow()

    expect(() => assertSelectedFinalistsMatchEntries(
      ['submission_1', 'submission_3'],
      [{ submissionId: 'submission_1' }, { submissionId: 'submission_2' }]
    )).toThrowError(ApiError)
  })

  test('shortlist views and finalist selection stay scoped to shortlist state', () => {
    expect(() => assertShortlistViewAllowed(createHackathon('shortlist'))).not.toThrow()
    expect(() => assertShortlistViewAllowed(createHackathon('winners_announced'))).toThrowError(ApiError)

    expect(() => assertSelectFinalistsAllowed(createHackathon('shortlist'))).not.toThrow()
    expect(() => assertSelectFinalistsAllowed(createHackathon('blind_review'))).toThrowError(ApiError)
  })

  test('final score calculation supports blind-only, pitch-only, and combined hackathons', () => {
    expect(calculateFinalScore({
      blindReviewCount: 1,
      pitchReviewEnabled: false,
      blindScoreWeightPercent: 100,
      pitchScoreWeightPercent: 0
    }, {
      blindScore: 8.5,
      pitchScore: null
    })).toBe(8.5)

    expect(calculateFinalScore({
      blindReviewCount: 0,
      pitchReviewEnabled: true,
      blindScoreWeightPercent: 0,
      pitchScoreWeightPercent: 100
    }, {
      blindScore: null,
      pitchScore: 7.25
    })).toBe(7.25)

    expect(calculateFinalScore({
      blindReviewCount: 1,
      pitchReviewEnabled: true,
      blindScoreWeightPercent: 70,
      pitchScoreWeightPercent: 30
    }, {
      blindScore: 8,
      pitchScore: 6
    })).toBeCloseTo(7.4)

    expect(calculateFinalScore({
      blindReviewCount: 1,
      pitchReviewEnabled: true,
      blindScoreWeightPercent: 70,
      pitchScoreWeightPercent: 30
    }, {
      blindScore: 8,
      pitchScore: null
    })).toBeNull()
  })

  test('final deliberation start and view guards follow the documented lifecycle', () => {
    expect(() => assertStartFinalDeliberationAllowed({
      ...createHackathon('blind_review'),
      pitchReviewEnabled: false
    }, [
      createLeaderboardEntry('judge_completed')
    ])).not.toThrow()

    expect(() => assertStartFinalDeliberationAllowed({
      ...createHackathon('blind_review'),
      pitchReviewEnabled: false
    }, [
      createLeaderboardEntry('judge_started')
    ])).toThrowError(ApiError)

    expect(() => assertStartFinalDeliberationAllowed(createHackathon('blind_review'), [
      createLeaderboardEntry('judge_completed')
    ])).toThrowError(ApiError)

    expect(() => assertStartFinalDeliberationAllowed(createHackathon('pitch_review'), [
      createLeaderboardEntry('judge_completed')
    ])).not.toThrow()

    expect(() => assertFinalDeliberationViewAllowed(createHackathon('final_deliberation'))).not.toThrow()
    expect(() => assertFinalDeliberationReorderAllowed(createHackathon('final_deliberation'))).not.toThrow()
    expect(() => assertFinalDeliberationViewAllowed(createHackathon('shortlist'))).toThrowError(ApiError)
    expect(() => assertFinalDeliberationReorderAllowed(createHackathon('pitch_review'))).toThrowError(ApiError)
  })

  test('final deliberation reorder must include every ranked submission exactly once', () => {
    expect(() => assertFinalDeliberationReorderMatchesEntries(
      ['submission_2', 'submission_1'],
      [{ submissionId: 'submission_1' }, { submissionId: 'submission_2' }]
    )).not.toThrow()

    expect(() => assertFinalDeliberationReorderMatchesEntries(
      ['submission_1', 'submission_1'],
      [{ submissionId: 'submission_1' }, { submissionId: 'submission_2' }]
    )).toThrowError(ApiError)

    expect(() => assertFinalDeliberationReorderMatchesEntries(
      ['submission_1'],
      [{ submissionId: 'submission_1' }, { submissionId: 'submission_2' }]
    )).toThrowError(ApiError)

    expect(() => assertFinalDeliberationReorderMatchesEntries(
      ['submission_1', 'submission_3'],
      [{ submissionId: 'submission_1' }, { submissionId: 'submission_2' }]
    )).toThrowError(ApiError)
  })

  test('winner announcement and completion guard the documented lifecycle states', () => {
    expect(() => assertWinnersAnnouncementAllowed(createHackathon('final_deliberation'))).not.toThrow()
    expect(() => assertWinnersAnnouncementAllowed(createHackathon('shortlist'))).toThrowError(ApiError)

    expect(() => assertHackathonCompletionAllowed(createHackathon('winners_announced'))).not.toThrow()
    expect(() => assertHackathonCompletionAllowed(createHackathon('shortlist'))).toThrowError(ApiError)
  })
})
