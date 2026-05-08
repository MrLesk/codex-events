import { describe, expect, test } from 'vitest'

import { ApiError } from '../../../../../server/http/api-error'
import {
  assertFinalDeliberationReorderAllowed,
  assertFinalDeliberationReorderMatchesEntries,
  assertFinalDeliberationViewAllowed,
  assertEventCompletionAllowed,
  assertWinnersVisible,
  hasSavedShortlistSelection,
  assertSelectedFinalistsRespectOrder,
  assertSelectedFinalistsMatchEntries,
  assertSelectedShortlistOrderMatchesEntries,
  assertSelectFinalistsAllowed,
  assertShortlistViewAllowed,
  assertStartFinalDeliberationAllowed,
  assertStartShortlistAllowed,
  assertWinnersAnnouncementAllowed,
  calculateFinalScore
} from '../../../../../server/domains/outcomes'

function createEvent(
  state:
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
    name: 'Outcome Event',
    slug: 'outcome-event',
    description: 'Outcome Event',
    discordServerUrl: null,
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
    shortlistFinalistCount: 10,
    pitchFinalistSubmissionIdsJson: '[]',
    activePitchPresentationSubmissionId: null,
    pitchPresentationsCompletedAt: null,
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
      eventId: 'event_1',
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
    expect(() => assertStartShortlistAllowed(createEvent('blind_review'), [
      createLeaderboardEntry('judge_completed')
    ])).not.toThrow()

    expect(() => assertStartShortlistAllowed(createEvent('shortlist'), [
      createLeaderboardEntry('judge_completed')
    ])).toThrowError(ApiError)

    expect(() => assertStartShortlistAllowed(createEvent('blind_review'), [
      createLeaderboardEntry('judge_started')
    ])).toThrowError(ApiError)

    expect(() => assertStartShortlistAllowed({
      ...createEvent('blind_review'),
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

  test('shortlist save order must cover every ranked submission exactly once and keep finalists first', () => {
    expect(() => assertSelectedShortlistOrderMatchesEntries(
      ['submission_2', 'submission_1'],
      [{ submissionId: 'submission_1' }, { submissionId: 'submission_2' }]
    )).not.toThrow()

    expect(() => assertSelectedShortlistOrderMatchesEntries(
      ['submission_1', 'submission_1'],
      [{ submissionId: 'submission_1' }, { submissionId: 'submission_2' }]
    )).toThrowError(ApiError)

    expect(() => assertSelectedShortlistOrderMatchesEntries(
      ['submission_1'],
      [{ submissionId: 'submission_1' }, { submissionId: 'submission_2' }]
    )).toThrowError(ApiError)

    expect(() => assertSelectedFinalistsRespectOrder(
      ['submission_2'],
      ['submission_2', 'submission_1']
    )).not.toThrow()

    expect(() => assertSelectedFinalistsRespectOrder(
      ['submission_1'],
      ['submission_2', 'submission_1']
    )).toThrowError(ApiError)
  })

  test('shortlist views and finalist selection stay scoped to shortlist state', () => {
    expect(() => assertShortlistViewAllowed(createEvent('shortlist'))).not.toThrow()
    expect(() => assertShortlistViewAllowed(createEvent('winners_announced'))).toThrowError(ApiError)

    expect(() => assertSelectFinalistsAllowed(createEvent('shortlist'))).not.toThrow()
    expect(() => assertSelectFinalistsAllowed(createEvent('blind_review'))).toThrowError(ApiError)
  })

  test('saved shortlist selection is determined by the persisted shortlist order', () => {
    expect(hasSavedShortlistSelection(createEvent('shortlist'))).toBe(false)
    expect(hasSavedShortlistSelection({
      ...createEvent('shortlist'),
      finalRankingSubmissionIdsJson: JSON.stringify(['submission_1'])
    })).toBe(true)
  })

  test('final score calculation supports blind-only, pitch-only, and combined events', () => {
    expect(calculateFinalScore({
      blindReviewCount: 1,
      pitchReviewEnabled: false,
      blindScoreWeightPercent: 100,
      pitchScoreWeightPercent: 0
    }, {
      blindScore: 4.5,
      pitchScore: null
    })).toBe(4.5)

    expect(calculateFinalScore({
      blindReviewCount: 0,
      pitchReviewEnabled: true,
      blindScoreWeightPercent: 0,
      pitchScoreWeightPercent: 100
    }, {
      blindScore: null,
      pitchScore: 4.25
    })).toBe(4.25)

    expect(calculateFinalScore({
      blindReviewCount: 1,
      pitchReviewEnabled: true,
      blindScoreWeightPercent: 70,
      pitchScoreWeightPercent: 30
    }, {
      blindScore: 4,
      pitchScore: 3
    })).toBeCloseTo(3.7)

    expect(calculateFinalScore({
      blindReviewCount: 1,
      pitchReviewEnabled: true,
      blindScoreWeightPercent: 70,
      pitchScoreWeightPercent: 30
    }, {
      blindScore: 4,
      pitchScore: null
    })).toBeNull()
  })

  test('final deliberation start and view guards follow the documented lifecycle', () => {
    expect(() => assertStartFinalDeliberationAllowed({
      ...createEvent('blind_review'),
      pitchReviewEnabled: false
    }, [
      createLeaderboardEntry('judge_completed')
    ])).not.toThrow()

    expect(() => assertStartFinalDeliberationAllowed({
      ...createEvent('blind_review'),
      pitchReviewEnabled: false
    }, [
      createLeaderboardEntry('judge_started')
    ])).toThrowError(ApiError)

    expect(() => assertStartFinalDeliberationAllowed(createEvent('blind_review'), [
      createLeaderboardEntry('judge_completed')
    ])).toThrowError(ApiError)

    expect(() => assertStartFinalDeliberationAllowed(
      createEvent('pitch_review'),
      [createLeaderboardEntry('judge_completed')],
      { completedPitchReviewCount: 1 }
    )).not.toThrow()

    expect(() => assertStartFinalDeliberationAllowed(
      createEvent('pitch_review'),
      [createLeaderboardEntry('judge_completed')],
      { completedPitchReviewCount: 0 }
    )).toThrowError(ApiError)

    expect(() => assertFinalDeliberationViewAllowed(createEvent('final_deliberation'))).not.toThrow()
    expect(() => assertFinalDeliberationReorderAllowed(createEvent('final_deliberation'))).not.toThrow()
    expect(() => assertFinalDeliberationViewAllowed(createEvent('shortlist'))).toThrowError(ApiError)
    expect(() => assertFinalDeliberationReorderAllowed(createEvent('pitch_review'))).toThrowError(ApiError)
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
    expect(() => assertWinnersAnnouncementAllowed(createEvent('final_deliberation'))).not.toThrow()
    expect(() => assertWinnersAnnouncementAllowed(createEvent('shortlist'))).toThrowError(ApiError)

    expect(() => assertWinnersVisible(createEvent('completed'))).not.toThrow()
    expect(() => assertWinnersVisible(createEvent('winners_announced'))).toThrowError(ApiError)

    expect(() => assertEventCompletionAllowed(createEvent('winners_announced'))).not.toThrow()
    expect(() => assertEventCompletionAllowed(createEvent('shortlist'))).toThrowError(ApiError)
  })
})
