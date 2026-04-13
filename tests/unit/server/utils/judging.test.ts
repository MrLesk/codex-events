import { describe, expect, test } from 'vitest'

import { ApiError } from '../../../../server/utils/api-error'
import {
  assertStartPitchReviewAllowed,
  assertStartJudgeReviewAllowed,
  assertStartJudgingPreparationAllowed,
  buildInitialJudgeAssignments,
  buildPitchReviewAssignments,
  calculateAveragePitchScore
} from '../../../../server/utils/judging'

function createHackathon(
  state: 'submission_open' | 'judging_preparation' | 'blind_review' | 'shortlist' | 'pitch_review',
  blindReviewCount: 0 | 1 | 2 = 1,
  pitchReviewEnabled: boolean = blindReviewCount === 0
) {
  return {
    id: 'hackathon_1',
    name: 'Judging Hackathon',
    slug: 'judging-hackathon',
    description: 'Judging Hackathon',
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
    pitchFinalistSubmissionIdsJson: '[]',
    finalRankingSubmissionIdsJson: '[]',
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

describe('judging utilities', () => {
  test('judging preparation requires closed submission editing, submitted work, and a judge pool', () => {
    const hackathon = createHackathon('submission_open', 1)
    const afterClose = new Date('2026-03-25T12:00:00.000Z')

    expect(() => assertStartJudgingPreparationAllowed(hackathon, {
      submittedSubmissionCount: 2,
      judgePoolCount: 1
    }, afterClose)).not.toThrow()

    expect(() => assertStartJudgingPreparationAllowed(hackathon, {
      submittedSubmissionCount: 2,
      judgePoolCount: 1
    }, new Date('2026-03-25T11:59:59.000Z'))).toThrowError(ApiError)

    expect(() => assertStartJudgingPreparationAllowed(hackathon, {
      submittedSubmissionCount: 0,
      judgePoolCount: 1
    }, afterClose)).toThrowError(ApiError)

    expect(() => assertStartJudgingPreparationAllowed(hackathon, {
      submittedSubmissionCount: 2,
      judgePoolCount: 0
    }, afterClose)).toThrowError(ApiError)

    expect(() => assertStartJudgingPreparationAllowed(createHackathon('submission_open', 2), {
      submittedSubmissionCount: 2,
      judgePoolCount: 1
    }, afterClose)).toThrowError(ApiError)

    expect(() => assertStartJudgingPreparationAllowed(createHackathon('submission_open', 0), {
      submittedSubmissionCount: 2,
      judgePoolCount: 0
    }, afterClose)).not.toThrow()
  })

  test('blind review readiness respects blindReviewCount 0, 1, and 2', () => {
    expect(() => assertStartJudgeReviewAllowed(createHackathon('judging_preparation', 0), {
      lockedSubmissionCount: 2,
      activeAssignmentCount: 0
    })).toThrowError(ApiError)

    expect(() => assertStartJudgeReviewAllowed(createHackathon('judging_preparation', 1), {
      lockedSubmissionCount: 2,
      activeAssignmentCount: 2
    })).not.toThrow()

    expect(() => assertStartJudgeReviewAllowed(createHackathon('blind_review', 1), {
      lockedSubmissionCount: 2,
      activeAssignmentCount: 2
    })).toThrowError(ApiError)

    expect(() => assertStartJudgeReviewAllowed(createHackathon('judging_preparation', 1), {
      lockedSubmissionCount: 0,
      activeAssignmentCount: 0
    })).toThrowError(ApiError)

    expect(() => assertStartJudgeReviewAllowed(createHackathon('judging_preparation', 1), {
      lockedSubmissionCount: 2,
      activeAssignmentCount: 1
    })).toThrowError(ApiError)

    expect(() => assertStartJudgeReviewAllowed(createHackathon('judging_preparation', 2), {
      lockedSubmissionCount: 2,
      activeAssignmentCount: 4
    })).not.toThrow()

    expect(() => assertStartJudgeReviewAllowed(createHackathon('judging_preparation', 2), {
      lockedSubmissionCount: 2,
      activeAssignmentCount: 3
    })).toThrowError(ApiError)
  })

  test('pitch review readiness supports pitch-only and shortlist-driven startups', () => {
    expect(() => assertStartPitchReviewAllowed(createHackathon('judging_preparation', 0, true), {
      lockedSubmissionCount: 2,
      finalistSubmissionCount: 2,
      judgePanelCount: 2
    })).not.toThrow()

    expect(() => assertStartPitchReviewAllowed(createHackathon('shortlist', 1, true), {
      lockedSubmissionCount: 3,
      finalistSubmissionCount: 2,
      judgePanelCount: 2
    })).not.toThrow()

    expect(() => assertStartPitchReviewAllowed(createHackathon('judging_preparation', 1, true), {
      lockedSubmissionCount: 3,
      finalistSubmissionCount: 2,
      judgePanelCount: 2
    })).toThrowError(ApiError)

    expect(() => assertStartPitchReviewAllowed(createHackathon('shortlist', 1, false), {
      lockedSubmissionCount: 3,
      finalistSubmissionCount: 2,
      judgePanelCount: 2
    })).toThrowError(ApiError)

    expect(() => assertStartPitchReviewAllowed(createHackathon('shortlist', 1, true), {
      lockedSubmissionCount: 3,
      finalistSubmissionCount: 0,
      judgePanelCount: 2
    })).toThrowError(ApiError)

    expect(() => assertStartPitchReviewAllowed(createHackathon('judging_preparation', 0, true), {
      lockedSubmissionCount: 2,
      finalistSubmissionCount: 2,
      judgePanelCount: 0
    })).toThrowError(ApiError)
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
        pitchScore: 8,
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
        pitchScore: 6,
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
    ])).toBe(7)

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
