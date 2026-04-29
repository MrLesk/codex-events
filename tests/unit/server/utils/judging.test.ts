import { describe, expect, test } from 'vitest'

import { ApiError } from '../../../../server/http/api-error'
import {
  advancePitchPresentation,
  assertAdvancePitchPresentationAllowed,
  assertStartPitchAllowed,
  assertStartPitchReviewAllowed,
  assertStartJudgeReviewAllowed,
  assertStartJudgingPreparationAllowed,
  buildInitialJudgeAssignments,
  buildPitchReviewAssignments,
  calculateAveragePitchScore,
  prunePitchPresentationProgress
} from '../../../../server/utils/judging'

function createHackathon(
  state: 'submission_open' | 'judging_preparation' | 'blind_review' | 'shortlist' | 'pitch' | 'pitch_review',
  blindReviewCount: 0 | 1 | 2 = 1,
  pitchReviewEnabled: boolean = blindReviewCount === 0,
  overrides: Partial<{
    pitchFinalistSubmissionIdsJson: string
    activePitchPresentationSubmissionId: string | null
    pitchPresentationsCompletedAt: string | null
  }> = {}
) {
  return {
    id: 'hackathon_1',
    name: 'Judging Hackathon',
    slug: 'judging-hackathon',
    description: 'Judging Hackathon',
    discordServerUrl: null,
    city: 'Vienna',
    country: 'Austria',
    address: 'Fixture Address',
    registrationOpensAt: '2026-03-20T12:00:00.000Z',
    registrationClosesAt: '2026-03-23T12:00:00.000Z',
    submissionOpensAt: '2026-03-23T12:00:00.000Z',
    submissionClosesAt: '2026-03-25T12:00:00.000Z',
    state,
    blindReviewCount,
    pitchReviewEnabled,
    blindScoreWeightPercent: blindReviewCount === 0 ? 0 : 70,
    pitchScoreWeightPercent: pitchReviewEnabled ? (blindReviewCount === 0 ? 100 : 30) : 0,
    shortlistFinalistCount: 10,
    pitchFinalistSubmissionIdsJson: '[]',
    activePitchPresentationSubmissionId: null,
    pitchPresentationsCompletedAt: null,
    finalRankingSubmissionIdsJson: '[]',
    maxTeamMembers: 4,
    requireXProfile: false,
    requireLinkedinProfile: false,
    requireGithubProfile: false,
    currentApplicationTermsDocumentId: null,
    currentWinnerTermsDocumentId: null,
    createdByUserId: 'platform_admin',
    createdAt: '2026-03-20T12:00:00.000Z',
    updatedAt: '2026-03-20T12:00:00.000Z',
    ...overrides
  }
}

describe('judging utilities', () => {
  test('stopping submissions requires a closed submission window and submitted work', () => {
    const hackathon = createHackathon('submission_open', 1)
    const afterClose = new Date('2026-03-25T12:00:00.000Z')

    expect(() => assertStartJudgingPreparationAllowed(hackathon, {
      submittedSubmissionCount: 2
    }, afterClose)).not.toThrow()

    expect(() => assertStartJudgingPreparationAllowed(hackathon, {
      submittedSubmissionCount: 2
    }, new Date('2026-03-25T11:59:59.000Z'))).toThrowError(ApiError)

    expect(() => assertStartJudgingPreparationAllowed(hackathon, {
      submittedSubmissionCount: 0
    }, afterClose)).toThrowError(ApiError)
  })

  test('blind review readiness requires submitted work and enough distinct judges', () => {
    expect(() => assertStartJudgeReviewAllowed(createHackathon('judging_preparation', 0), {
      submittedSubmissionCount: 2,
      judgePoolCount: 1
    })).toThrowError(ApiError)

    expect(() => assertStartJudgeReviewAllowed(createHackathon('judging_preparation', 1), {
      submittedSubmissionCount: 2,
      judgePoolCount: 1
    })).not.toThrow()

    expect(() => assertStartJudgeReviewAllowed(createHackathon('blind_review', 1), {
      submittedSubmissionCount: 2,
      judgePoolCount: 1
    })).toThrowError(ApiError)

    expect(() => assertStartJudgeReviewAllowed(createHackathon('judging_preparation', 1), {
      submittedSubmissionCount: 0,
      judgePoolCount: 1
    })).toThrowError(ApiError)

    expect(() => assertStartJudgeReviewAllowed(createHackathon('judging_preparation', 1), {
      submittedSubmissionCount: 2,
      judgePoolCount: 0
    })).toThrowError(ApiError)

    expect(() => assertStartJudgeReviewAllowed(createHackathon('judging_preparation', 2), {
      submittedSubmissionCount: 2,
      judgePoolCount: 2
    })).not.toThrow()

    expect(() => assertStartJudgeReviewAllowed(createHackathon('judging_preparation', 2), {
      submittedSubmissionCount: 2,
      judgePoolCount: 1
    })).toThrowError(ApiError)
  })

  test('pitch readiness supports pitch-only and shortlist-driven startups', () => {
    expect(() => assertStartPitchAllowed(createHackathon('judging_preparation', 0, true), {
      competitionSubmissionCount: 2,
      finalistSubmissionCount: 2
    })).not.toThrow()

    expect(() => assertStartPitchAllowed(createHackathon('shortlist', 1, true), {
      competitionSubmissionCount: 3,
      finalistSubmissionCount: 2
    })).not.toThrow()

    expect(() => assertStartPitchAllowed(createHackathon('judging_preparation', 1, true), {
      competitionSubmissionCount: 3,
      finalistSubmissionCount: 2
    })).toThrowError(ApiError)

    expect(() => assertStartPitchAllowed(createHackathon('shortlist', 1, false), {
      competitionSubmissionCount: 3,
      finalistSubmissionCount: 2
    })).toThrowError(ApiError)

    expect(() => assertStartPitchAllowed(createHackathon('shortlist', 1, true), {
      competitionSubmissionCount: 3,
      finalistSubmissionCount: 0
    })).toThrowError(ApiError)
  })

  test('pitch review readiness requires the live pitch stage and an active judge panel', () => {
    expect(() => assertStartPitchReviewAllowed(createHackathon('pitch', 0, true, {
      pitchFinalistSubmissionIdsJson: JSON.stringify(['submission_1', 'submission_2']),
      pitchPresentationsCompletedAt: '2026-03-26T12:15:00.000Z'
    }), {
      lockedSubmissionCount: 2,
      finalistSubmissionCount: 2,
      judgePanelCount: 2
    })).not.toThrow()

    expect(() => assertStartPitchReviewAllowed(createHackathon('pitch', 1, true, {
      pitchFinalistSubmissionIdsJson: JSON.stringify(['submission_1', 'submission_2']),
      pitchPresentationsCompletedAt: '2026-03-26T12:15:00.000Z'
    }), {
      lockedSubmissionCount: 3,
      finalistSubmissionCount: 2,
      judgePanelCount: 2
    })).not.toThrow()

    expect(() => assertStartPitchReviewAllowed(createHackathon('shortlist', 1, true), {
      lockedSubmissionCount: 3,
      finalistSubmissionCount: 2,
      judgePanelCount: 2
    })).toThrowError(ApiError)

    expect(() => assertStartPitchReviewAllowed(createHackathon('pitch', 0, true), {
      lockedSubmissionCount: 2,
      finalistSubmissionCount: 2,
      judgePanelCount: 0
    })).toThrowError(ApiError)

    expect(() => assertStartPitchReviewAllowed(createHackathon('pitch', 0, true, {
      pitchFinalistSubmissionIdsJson: JSON.stringify(['submission_1', 'submission_2'])
    }), {
      lockedSubmissionCount: 2,
      finalistSubmissionCount: 2,
      judgePanelCount: 2
    })).toThrowError(ApiError)
  })

  test('pitch presentation control only advances while the live lineup is still active', () => {
    expect(() => assertAdvancePitchPresentationAllowed(createHackathon('pitch', 0, true, {
      pitchFinalistSubmissionIdsJson: JSON.stringify(['submission_1'])
    }), {
      finalistSubmissionCount: 1
    })).not.toThrow()

    expect(() => assertAdvancePitchPresentationAllowed(createHackathon('pitch', 0, true, {
      pitchFinalistSubmissionIdsJson: JSON.stringify(['submission_1']),
      pitchPresentationsCompletedAt: '2026-03-26T12:15:00.000Z'
    }), {
      finalistSubmissionCount: 1
    })).toThrowError(ApiError)
  })

  test('pitch presentation control walks the saved lineup and marks completion after the last team', () => {
    const firstAdvance = advancePitchPresentation(
      createHackathon('pitch', 0, true, {
        pitchFinalistSubmissionIdsJson: JSON.stringify(['submission_1', 'submission_2'])
      }),
      ['submission_1', 'submission_2'],
      '2026-03-26T12:10:00.000Z'
    )

    expect(firstAdvance).toMatchObject({
      activePitchPresentationSubmissionId: 'submission_1',
      pitchPresentationsCompletedAt: null
    })

    const secondAdvance = advancePitchPresentation(
      createHackathon('pitch', 0, true, {
        pitchFinalistSubmissionIdsJson: JSON.stringify(['submission_1', 'submission_2']),
        activePitchPresentationSubmissionId: 'submission_1'
      }),
      ['submission_1', 'submission_2'],
      '2026-03-26T12:20:00.000Z'
    )

    expect(secondAdvance).toMatchObject({
      activePitchPresentationSubmissionId: 'submission_2',
      pitchPresentationsCompletedAt: null
    })

    const finalAdvance = advancePitchPresentation(
      createHackathon('pitch', 0, true, {
        pitchFinalistSubmissionIdsJson: JSON.stringify(['submission_1', 'submission_2']),
        activePitchPresentationSubmissionId: 'submission_2'
      }),
      ['submission_1', 'submission_2'],
      '2026-03-26T12:30:00.000Z'
    )

    expect(finalAdvance).toMatchObject({
      activePitchPresentationSubmissionId: null,
      pitchPresentationsCompletedAt: '2026-03-26T12:30:00.000Z'
    })
  })

  test('pruning the active pitch presenter advances to the next lineup entry', () => {
    expect(prunePitchPresentationProgress(
      createHackathon('pitch', 0, true, {
        pitchFinalistSubmissionIdsJson: JSON.stringify(['submission_1', 'submission_2']),
        activePitchPresentationSubmissionId: 'submission_1'
      }),
      ['submission_1', 'submission_2'],
      ['submission_2'],
      'submission_1',
      '2026-03-26T12:25:00.000Z'
    )).toEqual({
      activePitchPresentationSubmissionId: 'submission_2',
      pitchPresentationsCompletedAt: null
    })

    expect(prunePitchPresentationProgress(
      createHackathon('pitch', 0, true, {
        pitchFinalistSubmissionIdsJson: JSON.stringify(['submission_1']),
        activePitchPresentationSubmissionId: 'submission_1'
      }),
      ['submission_1'],
      [],
      'submission_1',
      '2026-03-26T12:25:00.000Z'
    )).toEqual({
      activePitchPresentationSubmissionId: null,
      pitchPresentationsCompletedAt: '2026-03-26T12:25:00.000Z'
    })
  })

  test('initial judging assignments fan out two assignments per submission with distinct judges when possible', () => {
    const assignments = buildInitialJudgeAssignments(
      'hackathon_1',
      [
        {
          id: 'submission_1',
          teamId: 'team_1',
          status: 'submitted',
          projectName: null,
          summary: null,
          repositoryUrl: null,
          demoUrl: null,
          submittedAt: '2026-03-24T12:00:00.000Z',
          lockedAt: null,
          withdrawnAt: null,
          disqualifiedAt: null,
          createdAt: '2026-03-24T12:00:00.000Z',
          updatedAt: '2026-03-24T12:00:00.000Z'
        },
        {
          id: 'submission_2',
          teamId: 'team_2',
          status: 'submitted',
          projectName: null,
          summary: null,
          repositoryUrl: null,
          demoUrl: null,
          submittedAt: '2026-03-24T12:05:00.000Z',
          lockedAt: null,
          withdrawnAt: null,
          disqualifiedAt: null,
          createdAt: '2026-03-24T12:05:00.000Z',
          updatedAt: '2026-03-24T12:05:00.000Z'
        },
        {
          id: 'submission_3',
          teamId: 'team_3',
          status: 'submitted',
          projectName: null,
          summary: null,
          repositoryUrl: null,
          demoUrl: null,
          submittedAt: '2026-03-24T12:10:00.000Z',
          lockedAt: null,
          withdrawnAt: null,
          disqualifiedAt: null,
          createdAt: '2026-03-24T12:10:00.000Z',
          updatedAt: '2026-03-24T12:10:00.000Z'
        }
      ],
      [
        {
          id: 'role_judge_a',
          hackathonId: 'hackathon_1',
          userId: 'judge_a',
          role: 'judge',
          isInJudgePool: true,
          createdAt: '2026-03-22T12:00:00.000Z'
        },
        {
          id: 'role_judge_b',
          hackathonId: 'hackathon_1',
          userId: 'judge_b',
          role: 'judge',
          isInJudgePool: true,
          createdAt: '2026-03-22T12:01:00.000Z'
        }
      ],
      2,
      '2026-03-25T12:30:00.000Z'
    )

    expect(assignments).toHaveLength(6)
    expect(assignments[0]?.judgeUserId).toBe('judge_a')
    expect(assignments[1]?.judgeUserId).toBe('judge_b')
    expect(assignments[2]?.judgeUserId).toBe('judge_a')
    expect(assignments[3]?.judgeUserId).toBe('judge_b')
    expect(assignments[4]?.judgeUserId).toBe('judge_a')
    expect(assignments[5]?.judgeUserId).toBe('judge_b')

    expect(assignments.filter(assignment => assignment.submissionId === 'submission_1')).toHaveLength(2)
    expect(new Set(
      assignments
        .filter(assignment => assignment.submissionId === 'submission_1')
        .map(assignment => assignment.judgeUserId)
    )).toEqual(new Set(['judge_a', 'judge_b']))
    expect(new Set(
      assignments
        .filter(assignment => assignment.submissionId === 'submission_2')
        .map(assignment => assignment.judgeUserId)
    )).toEqual(new Set(['judge_a', 'judge_b']))
    expect(new Set(
      assignments
        .filter(assignment => assignment.submissionId === 'submission_3')
        .map(assignment => assignment.judgeUserId)
    )).toEqual(new Set(['judge_a', 'judge_b']))
  })

  test('initial judging assignments reject two-slot blind review when the pool lacks distinct judges', () => {
    expect(() => buildInitialJudgeAssignments(
      'hackathon_1',
      [
        {
          id: 'submission_1',
          teamId: 'team_1',
          status: 'submitted',
          projectName: null,
          summary: null,
          repositoryUrl: null,
          demoUrl: null,
          submittedAt: '2026-03-24T12:00:00.000Z',
          lockedAt: null,
          withdrawnAt: null,
          disqualifiedAt: null,
          createdAt: '2026-03-24T12:00:00.000Z',
          updatedAt: '2026-03-24T12:00:00.000Z'
        }
      ],
      [
        {
          id: 'role_judge_a',
          hackathonId: 'hackathon_1',
          userId: 'judge_a',
          role: 'judge',
          isInJudgePool: true,
          createdAt: '2026-03-22T12:00:00.000Z'
        }
      ],
      2,
      '2026-03-25T12:30:00.000Z'
    )).toThrowError(ApiError)
  })

  test('pitch review assignments fan out one open vote per finalist submission and panel judge', () => {
    const assignments = buildPitchReviewAssignments(
      'hackathon_1',
      [
        {
          id: 'submission_1',
          teamId: 'team_1',
          status: 'locked',
          projectName: 'Project One',
          summary: null,
          repositoryUrl: null,
          demoUrl: null,
          submittedAt: '2026-03-24T12:00:00.000Z',
          lockedAt: '2026-03-25T12:00:00.000Z',
          withdrawnAt: null,
          disqualifiedAt: null,
          createdAt: '2026-03-24T12:00:00.000Z',
          updatedAt: '2026-03-25T12:00:00.000Z'
        },
        {
          id: 'submission_2',
          teamId: 'team_2',
          status: 'locked',
          projectName: 'Project Two',
          summary: null,
          repositoryUrl: null,
          demoUrl: null,
          submittedAt: '2026-03-24T12:05:00.000Z',
          lockedAt: '2026-03-25T12:00:00.000Z',
          withdrawnAt: null,
          disqualifiedAt: null,
          createdAt: '2026-03-24T12:05:00.000Z',
          updatedAt: '2026-03-25T12:00:00.000Z'
        }
      ],
      [
        {
          id: 'role_judge_a',
          hackathonId: 'hackathon_1',
          userId: 'judge_a',
          role: 'judge',
          isInJudgePool: true,
          createdAt: '2026-03-22T12:00:00.000Z'
        },
        {
          id: 'role_judge_b',
          hackathonId: 'hackathon_1',
          userId: 'judge_b',
          role: 'judge',
          isInJudgePool: true,
          createdAt: '2026-03-22T12:01:00.000Z'
        }
      ],
      '2026-03-26T12:30:00.000Z'
    )

    expect(assignments).toHaveLength(4)
    expect(assignments.every(assignment => assignment.reviewStage === 'pitch_review')).toBe(true)
    expect(assignments.every(assignment => assignment.blindReviewSlot === null)).toBe(true)
    expect(assignments.every(assignment => assignment.pitchScore === null)).toBe(true)
    expect(assignments.filter(assignment => assignment.submissionId === 'submission_1')).toMatchObject([
      expect.objectContaining({ judgeUserId: 'judge_a' }),
      expect.objectContaining({ judgeUserId: 'judge_b' })
    ])
  })

  test('pitch score aggregation averages only submitted completed pitch votes', () => {
    expect(calculateAveragePitchScore([
      {
        id: 'blind_assignment',
        hackathonId: 'hackathon_1',
        submissionId: 'submission_1',
        judgeUserId: 'judge_a',
        reviewStage: 'blind_review',
        blindReviewSlot: 1,
        status: 'judge_completed',
        pitchScore: null,
        pitchComment: null,
        assignedAt: '2026-03-25T12:00:00.000Z',
        startedAt: '2026-03-25T12:01:00.000Z',
        completedAt: '2026-03-25T12:02:00.000Z',
        skippedAt: null,
        skippedByUserId: null,
        skipReason: null,
        ineligibilityStatus: 'eligible',
        ineligibilityReason: null,
        ineligibilityMarkedAt: null,
        ineligibilityMarkedByUserId: null,
        createdAt: '2026-03-25T12:00:00.000Z'
      },
      {
        id: 'pitch_assignment_1',
        hackathonId: 'hackathon_1',
        submissionId: 'submission_1',
        judgeUserId: 'judge_a',
        reviewStage: 'pitch_review',
        blindReviewSlot: null,
        status: 'judge_completed',
        pitchScore: 5,
        pitchComment: 'Strong pitch',
        assignedAt: '2026-03-26T12:00:00.000Z',
        startedAt: '2026-03-26T12:01:00.000Z',
        completedAt: '2026-03-26T12:03:00.000Z',
        skippedAt: null,
        skippedByUserId: null,
        skipReason: null,
        ineligibilityStatus: 'eligible',
        ineligibilityReason: null,
        ineligibilityMarkedAt: null,
        ineligibilityMarkedByUserId: null,
        createdAt: '2026-03-26T12:00:00.000Z'
      },
      {
        id: 'pitch_assignment_2',
        hackathonId: 'hackathon_1',
        submissionId: 'submission_1',
        judgeUserId: 'judge_b',
        reviewStage: 'pitch_review',
        blindReviewSlot: null,
        status: 'judge_completed',
        pitchScore: 4,
        pitchComment: null,
        assignedAt: '2026-03-26T12:00:00.000Z',
        startedAt: '2026-03-26T12:02:00.000Z',
        completedAt: '2026-03-26T12:04:00.000Z',
        skippedAt: null,
        skippedByUserId: null,
        skipReason: null,
        ineligibilityStatus: 'eligible',
        ineligibilityReason: null,
        ineligibilityMarkedAt: null,
        ineligibilityMarkedByUserId: null,
        createdAt: '2026-03-26T12:00:00.000Z'
      },
      {
        id: 'pitch_assignment_3',
        hackathonId: 'hackathon_1',
        submissionId: 'submission_1',
        judgeUserId: 'judge_c',
        reviewStage: 'pitch_review',
        blindReviewSlot: null,
        status: 'judge_started',
        pitchScore: null,
        pitchComment: null,
        assignedAt: '2026-03-26T12:00:00.000Z',
        startedAt: '2026-03-26T12:03:00.000Z',
        completedAt: null,
        skippedAt: null,
        skippedByUserId: null,
        skipReason: null,
        ineligibilityStatus: 'eligible',
        ineligibilityReason: null,
        ineligibilityMarkedAt: null,
        ineligibilityMarkedByUserId: null,
        createdAt: '2026-03-26T12:00:00.000Z'
      },
      {
        id: 'pitch_assignment_4',
        hackathonId: 'hackathon_1',
        submissionId: 'submission_1',
        judgeUserId: 'judge_d',
        reviewStage: 'pitch_review',
        blindReviewSlot: null,
        status: 'skipped',
        pitchScore: null,
        pitchComment: null,
        assignedAt: '2026-03-26T12:00:00.000Z',
        startedAt: null,
        completedAt: null,
        skippedAt: '2026-03-26T12:05:00.000Z',
        skippedByUserId: 'judge_d',
        skipReason: 'Conflict',
        ineligibilityStatus: 'eligible',
        ineligibilityReason: null,
        ineligibilityMarkedAt: null,
        ineligibilityMarkedByUserId: null,
        createdAt: '2026-03-26T12:00:00.000Z'
      }
    ])).toBe(4.5)

    expect(calculateAveragePitchScore([
      {
        id: 'pitch_assignment_missing',
        hackathonId: 'hackathon_1',
        submissionId: 'submission_1',
        judgeUserId: 'judge_a',
        reviewStage: 'pitch_review',
        blindReviewSlot: null,
        status: 'assigned',
        pitchScore: null,
        pitchComment: null,
        assignedAt: '2026-03-26T12:00:00.000Z',
        startedAt: null,
        completedAt: null,
        skippedAt: null,
        skippedByUserId: null,
        skipReason: null,
        ineligibilityStatus: 'eligible',
        ineligibilityReason: null,
        ineligibilityMarkedAt: null,
        ineligibilityMarkedByUserId: null,
        createdAt: '2026-03-26T12:00:00.000Z'
      }
    ])).toBeNull()
  })
})
