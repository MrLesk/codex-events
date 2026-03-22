import { describe, expect, test } from 'vitest'

import { ApiError } from '../../../../server/utils/api-error'
import {
  assertStartJudgeReviewAllowed,
  assertStartJudgingPreparationAllowed,
  buildInitialJudgeAssignments
} from '../../../../server/utils/judging'

function createHackathon(
  state: 'submission_open' | 'judging_preparation' | 'judge_review'
) {
  return {
    id: 'hackathon_1',
    name: 'Judging Hackathon',
    slug: 'judging-hackathon',
    description: 'Judging Hackathon',
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

describe('judging utilities', () => {
  test('judging preparation requires closed submission editing, submitted work, and a judge pool', () => {
    const hackathon = createHackathon('submission_open')
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
  })

  test('judge review requires judging_preparation and ready active assignments for locked submissions', () => {
    expect(() => assertStartJudgeReviewAllowed(createHackathon('judging_preparation'), {
      lockedSubmissionCount: 2,
      activeAssignmentCount: 2
    })).not.toThrow()

    expect(() => assertStartJudgeReviewAllowed(createHackathon('judge_review'), {
      lockedSubmissionCount: 2,
      activeAssignmentCount: 2
    })).toThrowError(ApiError)

    expect(() => assertStartJudgeReviewAllowed(createHackathon('judging_preparation'), {
      lockedSubmissionCount: 0,
      activeAssignmentCount: 0
    })).toThrowError(ApiError)

    expect(() => assertStartJudgeReviewAllowed(createHackathon('judging_preparation'), {
      lockedSubmissionCount: 2,
      activeAssignmentCount: 1
    })).toThrowError(ApiError)
  })

  test('initial judging assignments distribute submissions to the lowest-load judge pool members', () => {
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
      '2026-03-25T12:30:00.000Z'
    )

    expect(assignments).toHaveLength(3)
    expect(assignments[0]?.judgeUserId).toBe('judge_a')
    expect(assignments[1]?.judgeUserId).toBe('judge_b')
    expect(assignments[2]?.judgeUserId).toBe('judge_a')
  })
})
