import { describe, expect, test, vi } from 'vitest'

import type {
  EvaluationCriterion,
  HackathonRecord,
  SessionActor
} from '../../../../app/utils/admin-workspace'
import type { JudgeAssignmentDetail } from '../../../../app/utils/judging-workspace'

import {
  buildCompletionCriterionScoresPayload,
  buildJudgeWorkspaceCacheKey,
  canCompleteJudgeAssignment,
  canMarkJudgeAssignmentIneligible,
  canSkipJudgeAssignment,
  canStartJudgeAssignment,
  createCriterionScoreDrafts,
  filterExplicitJudgeHackathons,
  filterAssignmentsForActor,
  filterReviewableHackathons,
  formatJudgeTimestamp,
  getJudgeWorkspaceSubjectKey,
  hasIncompleteCriterionScores,
  listAllVisibleHackathons,
  sortJudgeAssignments
} from '../../../../app/utils/judging-workspace'

function createHackathon(overrides: Partial<HackathonRecord> = {}): HackathonRecord {
  return {
    id: 'hackathon-1',
    name: 'Codex Judges',
    slug: 'codex-judges',
    description: 'Judge workspace fixture.',
    agendaItems: [],
    backgroundImageUrl: null,
    bannerImageUrl: null,
    city: 'Vienna',
    country: 'Austria',
    address: 'Operngasse 20',
    registrationOpensAt: '2026-03-20T10:00:00.000Z',
    registrationClosesAt: '2026-03-22T10:00:00.000Z',
    submissionOpensAt: '2026-03-22T10:00:00.000Z',
    submissionClosesAt: '2026-03-24T10:00:00.000Z',
    state: 'judge_review',
    maxTeamMembers: 5,
    inPersonEvent: false,
    requireXProfile: false,
    requireLinkedinProfile: false,
    requireGithubProfile: true,
    requireChatgptEmail: false,
    requireOpenaiOrgId: false,
    requireLumaEmail: false,
    requireWhyThisHackathon: false,
    requireProofOfExecution: false,
    currentApplicationTermsDocumentId: null,
    currentWinnerTermsDocumentId: null,
    createdByUserId: 'platform-admin',
    createdAt: '2026-03-01T00:00:00.000Z',
    updatedAt: '2026-03-01T00:00:00.000Z',
    ...overrides
  }
}

function createActor(overrides: Partial<SessionActor> = {}): SessionActor {
  return {
    kind: 'platform_user',
    isAuthenticated: true,
    hasPlatformAccount: true,
    sessionUser: {
      sub: 'auth0|judge',
      email: 'judge@example.com',
      name: 'Judge'
    },
    platformUser: {
      id: 'judge-1',
      email: 'judge@example.com',
      displayName: 'Judge One',
      firstName: 'Judge',
      familyName: 'One',
      isPlatformAdmin: false
    },
    isPlatformAdmin: false,
    hackathonRoles: [{
      hackathonId: 'hackathon-1',
      role: 'judge',
      isInJudgePool: true,
      isStaff: false,
      createdAt: '2026-03-01T00:00:00.000Z'
    }],
    ...overrides
  }
}

function createAssignment(overrides: Partial<JudgeAssignmentDetail> = {}): JudgeAssignmentDetail {
  return {
    id: 'assignment-1',
    hackathonId: 'hackathon-1',
    submissionId: 'submission-1',
    judgeUserId: 'judge-1',
    status: 'assigned',
    assignedAt: '2026-03-24T10:00:00.000Z',
    startedAt: null,
    completedAt: null,
    skippedAt: null,
    skippedByUserId: null,
    skipReason: null,
    ineligibilityStatus: 'eligible',
    ineligibilityReason: null,
    ineligibilityMarkedAt: null,
    ineligibilityMarkedByUserId: null,
    createdAt: '2026-03-24T10:00:00.000Z',
    blindSubmission: {
      id: 'submission-1',
      projectName: 'Blind Build',
      summary: 'Anonymous summary',
      repositoryUrl: 'https://example.com/repo',
      demoUrl: 'https://example.com/demo',
      track: null,
      status: 'locked',
      submittedAt: '2026-03-23T10:00:00.000Z',
      lockedAt: '2026-03-24T10:00:00.000Z',
      applications: [{
        id: 'application-1',
        status: 'approved',
        submittedAt: '2026-03-21T10:00:00.000Z',
        reviewedAt: '2026-03-21T12:00:00.000Z',
        applicationTermsDocumentId: 'terms-1'
      }]
    },
    criterionScores: [],
    ...overrides
  }
}

function createCriterion(overrides: Partial<EvaluationCriterion> = {}): EvaluationCriterion {
  return {
    id: 'criterion-1',
    hackathonId: 'hackathon-1',
    name: 'Novelty',
    description: 'How original the project is.',
    weight: 5,
    displayOrder: 1,
    createdAt: '2026-03-01T00:00:00.000Z',
    ...overrides
  }
}

describe('judging-workspace filters', () => {
  test('formats judge timestamps with the shared operational timestamp style', () => {
    const value = '2026-03-24T10:00:00.000Z'

    expect(formatJudgeTimestamp(value)).toBe(new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit'
    }).format(new Date(value)))

    expect(formatJudgeTimestamp(null)).toBe('Not recorded')
  })

  test('limits reviewable hackathons to judge-enabled roles for non-platform admins', () => {
    const actor = createActor({
      hackathonRoles: [
        {
          hackathonId: 'hackathon-1',
          role: 'judge',
          isInJudgePool: true,
          isStaff: false,
          createdAt: '2026-03-01T00:00:00.000Z'
        },
        {
          hackathonId: 'hackathon-2',
          role: 'hackathon_admin',
          isInJudgePool: true,
          isStaff: false,
          createdAt: '2026-03-01T00:00:00.000Z'
        }
      ]
    })
    const hackathons = [
      createHackathon({ id: 'hackathon-1' }),
      createHackathon({ id: 'hackathon-2', slug: 'admin-hackathon', name: 'Admin Hackathon' }),
      createHackathon({ id: 'hackathon-3', slug: 'hidden-hackathon', name: 'Hidden Hackathon' })
    ]

    expect(filterReviewableHackathons(hackathons, actor).map(hackathon => hackathon.id)).toEqual([
      'hackathon-1',
      'hackathon-2'
    ])
  })

  test('includes judge-enabled admin assignments in the judging workspace', () => {
    const actor = createActor({
      hackathonRoles: [
        {
          hackathonId: 'hackathon-1',
          role: 'judge',
          isInJudgePool: true,
          isStaff: false,
          createdAt: '2026-03-01T00:00:00.000Z'
        },
        {
          hackathonId: 'hackathon-2',
          role: 'hackathon_admin',
          isInJudgePool: true,
          isStaff: true,
          createdAt: '2026-03-01T00:00:00.000Z'
        }
      ]
    })
    const hackathons = [
      createHackathon({ id: 'hackathon-1' }),
      createHackathon({ id: 'hackathon-2', slug: 'admin-hackathon', name: 'Admin Hackathon' })
    ]

    expect(filterExplicitJudgeHackathons(hackathons, actor).map(hackathon => hackathon.id)).toEqual([
      'hackathon-1',
      'hackathon-2'
    ])
  })

  test('filters assignment lists to the current actor even when other assignments are visible upstream', () => {
    const actor = createActor()
    const assignments = [
      createAssignment({ id: 'assignment-1', judgeUserId: 'judge-1' }),
      createAssignment({ id: 'assignment-2', judgeUserId: 'judge-2' })
    ]

    expect(filterAssignmentsForActor(assignments, actor).map(assignment => assignment.id)).toEqual(['assignment-1'])
  })

  test('loads every visible hackathon page before the inbox filters reviewable roles', async () => {
    const fetchPage = vi.fn(async (page: number, pageSize: number) => {
      expect(pageSize).toBe(2)

      if (page === 1) {
        return {
          data: [
            createHackathon({ id: 'hackathon-1' }),
            createHackathon({ id: 'hackathon-2', slug: 'hackathon-2', name: 'Hackathon 2' })
          ],
          meta: {
            total: 3
          }
        }
      }

      return {
        data: [
          createHackathon({ id: 'hackathon-3', slug: 'hackathon-3', name: 'Hackathon 3' })
        ],
        meta: {
          total: 3
        }
      }
    })

    await expect(listAllVisibleHackathons(fetchPage, 2)).resolves.toEqual([
      expect.objectContaining({ id: 'hackathon-1' }),
      expect.objectContaining({ id: 'hackathon-2' }),
      expect.objectContaining({ id: 'hackathon-3' })
    ])
    expect(fetchPage).toHaveBeenNthCalledWith(1, 1, 2)
    expect(fetchPage).toHaveBeenNthCalledWith(2, 2, 2)
  })
})

describe('judging-workspace actions', () => {
  test('matches canonical judge action guards', () => {
    const assigned = createAssignment({ status: 'assigned' })
    const started = createAssignment({ status: 'judge_started', startedAt: '2026-03-24T10:10:00.000Z' })
    const completed = createAssignment({ status: 'judge_completed', completedAt: '2026-03-24T10:20:00.000Z' })

    expect(canStartJudgeAssignment(assigned)).toBe(true)
    expect(canCompleteJudgeAssignment(assigned)).toBe(false)
    expect(canSkipJudgeAssignment(assigned)).toBe(true)
    expect(canMarkJudgeAssignmentIneligible(assigned)).toBe(false)

    expect(canStartJudgeAssignment(started)).toBe(false)
    expect(canCompleteJudgeAssignment(started)).toBe(true)
    expect(canSkipJudgeAssignment(started)).toBe(true)
    expect(canMarkJudgeAssignmentIneligible(started)).toBe(true)

    expect(canCompleteJudgeAssignment(completed)).toBe(false)
    expect(canSkipJudgeAssignment(completed)).toBe(false)
    expect(canMarkJudgeAssignmentIneligible(completed)).toBe(true)
    expect(canMarkJudgeAssignmentIneligible({
      ...completed,
      ineligibilityStatus: 'ineligible'
    })).toBe(false)
  })

  test('sorts in-progress reviews ahead of newly assigned work', () => {
    const assignments = [
      createAssignment({ id: 'assignment-2', status: 'assigned', assignedAt: '2026-03-24T11:00:00.000Z' }),
      createAssignment({ id: 'assignment-1', status: 'judge_started', startedAt: '2026-03-24T10:30:00.000Z' }),
      createAssignment({ id: 'assignment-3', status: 'assigned', assignedAt: '2026-03-24T09:00:00.000Z' })
    ]

    expect(sortJudgeAssignments(assignments).map(assignment => assignment.id)).toEqual([
      'assignment-1',
      'assignment-3',
      'assignment-2'
    ])
  })
})

describe('judging-workspace scoring drafts', () => {
  test('creates score drafts from criteria and existing saved scores', () => {
    const criteria = [
      createCriterion({ id: 'criterion-1', name: 'Novelty', weight: 5 }),
      createCriterion({ id: 'criterion-2', name: 'Execution', weight: 3, displayOrder: 2 })
    ]
    const assignment = createAssignment({
      criterionScores: [{
        id: 'score-1',
        evaluationCriterionId: 'criterion-2',
        criterionName: 'Execution',
        criterionDescription: 'How well the team executed.',
        criterionWeight: 3,
        score: 9,
        comment: 'Strong finish',
        createdAt: '2026-03-24T10:20:00.000Z',
        updatedAt: '2026-03-24T10:20:00.000Z'
      }]
    })

    expect(createCriterionScoreDrafts(criteria, assignment)).toEqual([
      expect.objectContaining({
        evaluationCriterionId: 'criterion-1',
        score: '',
        comment: ''
      }),
      expect.objectContaining({
        evaluationCriterionId: 'criterion-2',
        score: '9',
        comment: 'Strong finish'
      })
    ])
  })

  test('detects incomplete scores and builds the completion payload', () => {
    const drafts = [
      {
        evaluationCriterionId: 'criterion-1',
        criterionName: 'Novelty',
        criterionDescription: 'How original the project is.',
        criterionWeight: 5,
        score: '8',
        comment: 'Fresh idea'
      },
      {
        evaluationCriterionId: 'criterion-2',
        criterionName: 'Execution',
        criterionDescription: 'How well the project is executed.',
        criterionWeight: 3,
        score: ' ',
        comment: ''
      }
    ]

    expect(hasIncompleteCriterionScores(drafts)).toBe(true)
    expect(hasIncompleteCriterionScores([
      {
        ...drafts[0]
      },
      {
        ...drafts[1],
        score: '7'
      }
    ])).toBe(false)
    expect(buildCompletionCriterionScoresPayload([
      {
        ...drafts[0]
      },
      {
        ...drafts[1],
        score: '7'
      }
    ])).toEqual([
      {
        evaluationCriterionId: 'criterion-1',
        score: 8,
        comment: 'Fresh idea'
      },
      {
        evaluationCriterionId: 'criterion-2',
        score: 7,
        comment: undefined
      }
    ])
  })
})

describe('judging-workspace cache keys', () => {
  test('normalizes subjects and cache key parts', () => {
    expect(getJudgeWorkspaceSubjectKey('  auth0|judge  ')).toBe('auth0|judge')
    expect(getJudgeWorkspaceSubjectKey('')).toBe('anonymous')
    expect(buildJudgeWorkspaceCacheKey('judge-workspace', 'auth0|judge', 'hackathon-1')).toBe(
      'judge-workspace:auth0|judge:hackathon-1'
    )
  })
})
