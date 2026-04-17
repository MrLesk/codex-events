import { afterEach, describe, expect, test, vi } from 'vitest'

import { eq } from 'drizzle-orm'

import completeJudgeAssignmentHandler from '../../../../server/api/hackathons/[hackathonId]/judging/assignments/[assignmentId]/actions/complete.post'
import forceSkipJudgeAssignmentHandler from '../../../../server/api/hackathons/[hackathonId]/judging/assignments/[assignmentId]/actions/force-skip.post'
import markAssignmentIneligibleHandler from '../../../../server/api/hackathons/[hackathonId]/judging/assignments/[assignmentId]/actions/mark-ineligible.post'
import reassignJudgeAssignmentHandler from '../../../../server/api/hackathons/[hackathonId]/judging/assignments/[assignmentId]/actions/reassign.post'
import revertAssignmentIneligibilityHandler from '../../../../server/api/hackathons/[hackathonId]/judging/assignments/[assignmentId]/actions/revert-ineligibility.post'
import skipJudgeAssignmentHandler from '../../../../server/api/hackathons/[hackathonId]/judging/assignments/[assignmentId]/actions/skip.post'
import startJudgeAssignmentHandler from '../../../../server/api/hackathons/[hackathonId]/judging/assignments/[assignmentId]/actions/start.post'
import listJudgeAssignmentsHandler from '../../../../server/api/hackathons/[hackathonId]/judging/assignments/index.get'
import {
  auditLogs,
  evaluationCriteria,
  hackathonRoleAssignments,
  hackathonTermsDocuments,
  hackathons,
  judgeAssignments,
  judgeCriterionScores,
  submissions,
  teamMembers,
  teams,
  userApplications,
  users
} from '../../../../server/database/schema'
import { createApiRouteTestHarness } from '../../../support/backend/api-route'

describe('TASK-3.7 judging assignment routes', () => {
  const harnesses: Array<ReturnType<typeof createApiRouteTestHarness>> = []

  afterEach(async () => {
    vi.unstubAllGlobals()

    while (harnesses.length > 0) {
      await harnesses.pop()?.d1Database.close()
    }
  })

  async function seedBaseJudgingRecords(
    harness: ReturnType<typeof createApiRouteTestHarness>,
    options?: {
      state?: 'judging_preparation' | 'blind_review' | 'pitch' | 'pitch_review' | 'final_deliberation'
      includeCriteria?: boolean
      blindReviewCount?: 0 | 1 | 2
      pitchReviewEnabled?: boolean
      pitchFinalistSubmissionIdsJson?: string
    }
  ) {
    const state = options?.state ?? 'blind_review'

    await harness.database.insert(users).values([
      {
        id: 'platform_admin',
        auth0Subject: 'auth0|platform_admin',
        email: 'platform-admin@example.com',
        displayName: 'Platform Admin',
        isPlatformAdmin: true
      },
      {
        id: 'hackathon_admin',
        auth0Subject: 'auth0|hackathon_admin',
        email: 'hackathon-admin@example.com',
        displayName: 'Hackathon Admin'
      },
      {
        id: 'judge_a',
        auth0Subject: 'auth0|judge_a',
        email: 'judge-a@example.com',
        displayName: 'Judge A'
      },
      {
        id: 'judge_b',
        auth0Subject: 'auth0|judge_b',
        email: 'judge-b@example.com',
        displayName: 'Judge B'
      },
      {
        id: 'judge_c',
        auth0Subject: 'auth0|judge_c',
        email: 'judge-c@example.com',
        displayName: 'Judge C'
      },
      {
        id: 'team_admin',
        auth0Subject: 'auth0|team_admin',
        email: 'team-admin@example.com',
        displayName: 'Team Admin'
      },
      {
        id: 'team_member',
        auth0Subject: 'auth0|team_member',
        email: 'team-member@example.com',
        displayName: 'Team Member'
      },
      {
        id: 'other_team_admin',
        auth0Subject: 'auth0|other_team_admin',
        email: 'other-team-admin@example.com',
        displayName: 'Other Team Admin'
      }
    ])

    await harness.database.insert(hackathons).values({
      id: 'hackathon_1',
      name: 'Judging Hackathon',
      slug: 'judging-hackathon',
      description: 'Judging hackathon',
      city: 'Vienna',
      country: 'Austria',
      address: 'Address',
      registrationOpensAt: '2026-03-18T12:00:00.000Z',
      registrationClosesAt: '2026-03-19T12:00:00.000Z',
      submissionOpensAt: '2026-03-19T12:00:00.000Z',
      submissionClosesAt: '2026-03-21T12:00:00.000Z',
      state,
      blindReviewCount: options?.blindReviewCount ?? 1,
      pitchReviewEnabled: options?.pitchReviewEnabled ?? false,
      pitchFinalistSubmissionIdsJson: options?.pitchFinalistSubmissionIdsJson ?? '[]',
      maxTeamMembers: 5,
      createdByUserId: 'platform_admin'
    })

    await harness.database.insert(hackathonTermsDocuments).values({
      id: 'terms_application_1',
      hackathonId: 'hackathon_1',
      documentType: 'application_terms',
      version: 1,
      title: 'Application Terms',
      content: 'Application terms',
      publishedAt: '2026-03-18T12:00:00.000Z',
      createdAt: '2026-03-18T12:00:00.000Z'
    })

    await harness.database.insert(hackathonRoleAssignments).values([
      {
        id: 'role_admin',
        hackathonId: 'hackathon_1',
        userId: 'hackathon_admin',
        role: 'hackathon_admin',
        isInJudgePool: false,
        createdAt: '2026-03-22T12:00:00.000Z'
      },
      {
        id: 'role_judge_a',
        hackathonId: 'hackathon_1',
        userId: 'judge_a',
        role: 'judge',
        isInJudgePool: true,
        createdAt: '2026-03-22T12:01:00.000Z'
      },
      {
        id: 'role_judge_b',
        hackathonId: 'hackathon_1',
        userId: 'judge_b',
        role: 'judge',
        isInJudgePool: true,
        createdAt: '2026-03-22T12:02:00.000Z'
      },
      {
        id: 'role_judge_c',
        hackathonId: 'hackathon_1',
        userId: 'judge_c',
        role: 'judge',
        isInJudgePool: true,
        createdAt: '2026-03-22T12:03:00.000Z'
      }
    ])

    await harness.database.insert(teams).values([
      {
        id: 'team_1',
        hackathonId: 'hackathon_1',
        name: 'Alpha Team',
        slug: 'alpha-team',
        isOpenToJoinRequests: false,
        createdByUserId: 'team_admin',
        createdAt: '2026-03-22T12:10:00.000Z',
        updatedAt: '2026-03-22T12:10:00.000Z'
      },
      {
        id: 'team_2',
        hackathonId: 'hackathon_1',
        name: 'Beta Team',
        slug: 'beta-team',
        isOpenToJoinRequests: false,
        createdByUserId: 'other_team_admin',
        createdAt: '2026-03-22T12:20:00.000Z',
        updatedAt: '2026-03-22T12:20:00.000Z'
      }
    ])

    await harness.database.insert(teamMembers).values([
      {
        id: 'membership_admin',
        teamId: 'team_1',
        userId: 'team_admin',
        role: 'admin',
        joinedAt: '2026-03-22T12:10:00.000Z',
        createdAt: '2026-03-22T12:10:00.000Z'
      },
      {
        id: 'membership_member',
        teamId: 'team_1',
        userId: 'team_member',
        role: 'member',
        joinedAt: '2026-03-22T12:11:00.000Z',
        createdAt: '2026-03-22T12:11:00.000Z'
      },
      {
        id: 'membership_other_admin',
        teamId: 'team_2',
        userId: 'other_team_admin',
        role: 'admin',
        joinedAt: '2026-03-22T12:20:00.000Z',
        createdAt: '2026-03-22T12:20:00.000Z'
      }
    ])

    await harness.database.insert(userApplications).values([
      {
        id: 'application_team_admin',
        hackathonId: 'hackathon_1',
        userId: 'team_admin',
        status: 'approved',
        submittedAt: '2026-03-20T12:00:00.000Z',
        reviewedAt: '2026-03-20T12:30:00.000Z',
        reviewedByUserId: 'hackathon_admin',
        applicationTermsDocumentId: 'terms_application_1',
        applicationTermsAcceptedAt: '2026-03-20T12:00:00.000Z',
        createdAt: '2026-03-20T12:00:00.000Z',
        updatedAt: '2026-03-20T12:30:00.000Z'
      },
      {
        id: 'application_team_member',
        hackathonId: 'hackathon_1',
        userId: 'team_member',
        status: 'approved',
        submittedAt: '2026-03-20T12:05:00.000Z',
        reviewedAt: '2026-03-20T12:30:00.000Z',
        reviewedByUserId: 'hackathon_admin',
        applicationTermsDocumentId: 'terms_application_1',
        applicationTermsAcceptedAt: '2026-03-20T12:05:00.000Z',
        createdAt: '2026-03-20T12:05:00.000Z',
        updatedAt: '2026-03-20T12:30:00.000Z'
      },
      {
        id: 'application_other_team_admin',
        hackathonId: 'hackathon_1',
        userId: 'other_team_admin',
        status: 'approved',
        submittedAt: '2026-03-20T12:10:00.000Z',
        reviewedAt: '2026-03-20T12:30:00.000Z',
        reviewedByUserId: 'hackathon_admin',
        applicationTermsDocumentId: 'terms_application_1',
        applicationTermsAcceptedAt: '2026-03-20T12:10:00.000Z',
        createdAt: '2026-03-20T12:10:00.000Z',
        updatedAt: '2026-03-20T12:30:00.000Z'
      }
    ])

    await harness.database.insert(submissions).values([
      {
        id: 'submission_1',
        teamId: 'team_1',
        status: 'locked',
        projectName: 'Project One',
        summary: 'Blind summary',
        repositoryUrl: 'https://example.com/repo-1',
        demoUrl: 'https://example.com/demo-1',
        submittedAt: '2026-03-24T12:00:00.000Z',
        lockedAt: '2026-03-25T12:00:00.000Z',
        createdAt: '2026-03-24T12:00:00.000Z',
        updatedAt: '2026-03-25T12:00:00.000Z'
      },
      {
        id: 'submission_2',
        teamId: 'team_2',
        status: 'locked',
        projectName: 'Project Two',
        summary: 'Other summary',
        repositoryUrl: 'https://example.com/repo-2',
        demoUrl: 'https://example.com/demo-2',
        submittedAt: '2026-03-24T12:05:00.000Z',
        lockedAt: '2026-03-25T12:00:00.000Z',
        createdAt: '2026-03-24T12:05:00.000Z',
        updatedAt: '2026-03-25T12:00:00.000Z'
      }
    ])

    if (options?.includeCriteria) {
      await harness.database.insert(evaluationCriteria).values([
        {
          id: 'criterion_1',
          hackathonId: 'hackathon_1',
          name: 'Novelty',
          description: 'Novelty description',
          weight: 50,
          displayOrder: 1,
          createdAt: '2026-03-22T12:00:00.000Z'
        },
        {
          id: 'criterion_2',
          hackathonId: 'hackathon_1',
          name: 'Execution',
          description: 'Execution description',
          weight: 50,
          displayOrder: 2,
          createdAt: '2026-03-22T12:01:00.000Z'
        }
      ])
    }
  }

  test('judges list only their active assignments in blind view', async () => {
    const harness = createApiRouteTestHarness({
      routes: [
        { method: 'get', path: '/api/hackathons/:hackathonId/judging/assignments', handler: listJudgeAssignmentsHandler }
      ],
      sessionUser: {
        sub: 'auth0|judge_a',
        email: 'judge-a@example.com'
      }
    })
    harnesses.push(harness)

    await seedBaseJudgingRecords(harness)
    await harness.database.insert(judgeAssignments).values([
      {
        id: 'assignment_1',
        hackathonId: 'hackathon_1',
        submissionId: 'submission_1',
        judgeUserId: 'judge_a',
        status: 'assigned',
        assignedAt: '2026-03-25T12:10:00.000Z',
        createdAt: '2026-03-25T12:10:00.000Z'
      },
      {
        id: 'assignment_2',
        hackathonId: 'hackathon_1',
        submissionId: 'submission_2',
        judgeUserId: 'judge_b',
        status: 'judge_started',
        assignedAt: '2026-03-25T12:11:00.000Z',
        startedAt: '2026-03-25T12:12:00.000Z',
        createdAt: '2026-03-25T12:11:00.000Z'
      }
    ])

    const response = await harness.request('/api/hackathons/hackathon_1/judging/assignments')

    expect(response.status).toBe(200)
    const payload = await response.json() as {
      data: Array<{ blindSubmission?: Record<string, unknown> }>
      meta: {
        total: number
      }
    }

    expect(payload).toMatchObject({
      data: [
        {
          id: 'assignment_1',
          status: 'assigned',
          blindSubmission: {
            id: 'submission_1',
            projectName: 'Project One',
            applications: [
              expect.objectContaining({ id: 'application_team_admin' }),
              expect.objectContaining({ id: 'application_team_member' })
            ]
          }
        }
      ],
      meta: {
        total: 1
      }
    })

    expect(payload.data[0]?.blindSubmission).not.toHaveProperty('teamId')
    expect(payload.data[0]?.blindSubmission).not.toHaveProperty('teamName')
  })

  test('hackathon admins can list all active assignments without judge participation enabled', async () => {
    const harness = createApiRouteTestHarness({
      routes: [
        { method: 'get', path: '/api/hackathons/:hackathonId/judging/assignments', handler: listJudgeAssignmentsHandler }
      ],
      sessionUser: {
        sub: 'auth0|hackathon_admin',
        email: 'hackathon-admin@example.com'
      }
    })
    harnesses.push(harness)

    await seedBaseJudgingRecords(harness)
    await harness.database.insert(judgeAssignments).values([
      {
        id: 'assignment_1',
        hackathonId: 'hackathon_1',
        submissionId: 'submission_1',
        judgeUserId: 'judge_a',
        status: 'assigned',
        assignedAt: '2026-03-25T12:10:00.000Z',
        createdAt: '2026-03-25T12:10:00.000Z'
      },
      {
        id: 'assignment_2',
        hackathonId: 'hackathon_1',
        submissionId: 'submission_2',
        judgeUserId: 'judge_b',
        status: 'judge_started',
        assignedAt: '2026-03-25T12:11:00.000Z',
        startedAt: '2026-03-25T12:12:00.000Z',
        createdAt: '2026-03-25T12:11:00.000Z'
      }
    ])

    const response = await harness.request('/api/hackathons/hackathon_1/judging/assignments')
    expect(response.status).toBe(200)
    expect(await response.json()).toMatchObject({
      data: [
        expect.objectContaining({
          id: 'assignment_1'
        }),
        expect.objectContaining({
          id: 'assignment_2'
        })
      ],
      meta: {
        total: 2
      }
    })
  })

  test('judges list only their active pitch assignments in the open pitch view', async () => {
    const harness = createApiRouteTestHarness({
      routes: [
        { method: 'get', path: '/api/hackathons/:hackathonId/judging/assignments', handler: listJudgeAssignmentsHandler }
      ],
      sessionUser: {
        sub: 'auth0|judge_a',
        email: 'judge-a@example.com'
      }
    })
    harnesses.push(harness)

    await seedBaseJudgingRecords(harness, {
      state: 'pitch_review',
      pitchReviewEnabled: true
    })
    await harness.database.insert(judgeAssignments).values([
      {
        id: 'assignment_pitch_1',
        hackathonId: 'hackathon_1',
        submissionId: 'submission_1',
        judgeUserId: 'judge_a',
        reviewStage: 'pitch_review',
        blindReviewSlot: null,
        status: 'assigned',
        assignedAt: '2026-03-26T12:10:00.000Z',
        createdAt: '2026-03-26T12:10:00.000Z'
      },
      {
        id: 'assignment_pitch_2',
        hackathonId: 'hackathon_1',
        submissionId: 'submission_2',
        judgeUserId: 'judge_b',
        reviewStage: 'pitch_review',
        blindReviewSlot: null,
        status: 'judge_started',
        assignedAt: '2026-03-26T12:11:00.000Z',
        startedAt: '2026-03-26T12:12:00.000Z',
        createdAt: '2026-03-26T12:11:00.000Z'
      }
    ])

    const response = await harness.request('/api/hackathons/hackathon_1/judging/assignments')

    expect(response.status).toBe(200)
    const payload = await response.json() as {
      data: Array<Record<string, unknown>>
      meta: {
        total: number
      }
    }

    expect(payload).toMatchObject({
      data: [
        {
          id: 'assignment_pitch_1',
          reviewStage: 'pitch_review',
          pitchSubmission: {
            id: 'submission_1',
            projectName: 'Project One',
            teamName: 'Alpha Team'
          }
        }
      ],
      meta: {
        total: 1
      }
    })
    expect(payload.data[0]).not.toHaveProperty('blindSubmission')
  })

  test('assigned judges can start and complete a review with criterion scores', async () => {
    const harness = createApiRouteTestHarness({
      routes: [
        {
          method: 'post',
          path: '/api/hackathons/:hackathonId/judging/assignments/:assignmentId/actions/start',
          handler: startJudgeAssignmentHandler
        },
        {
          method: 'post',
          path: '/api/hackathons/:hackathonId/judging/assignments/:assignmentId/actions/complete',
          handler: completeJudgeAssignmentHandler
        }
      ],
      sessionUser: {
        sub: 'auth0|judge_a',
        email: 'judge-a@example.com'
      }
    })
    harnesses.push(harness)

    await seedBaseJudgingRecords(harness, { includeCriteria: true })
    await harness.database.insert(judgeAssignments).values({
      id: 'assignment_1',
      hackathonId: 'hackathon_1',
      submissionId: 'submission_1',
      judgeUserId: 'judge_a',
      status: 'assigned',
      assignedAt: '2026-03-25T12:10:00.000Z',
      createdAt: '2026-03-25T12:10:00.000Z'
    })

    const startResponse = await harness.request('/api/hackathons/hackathon_1/judging/assignments/assignment_1/actions/start', {
      method: 'POST'
    })

    expect(startResponse.status).toBe(200)
    expect(await startResponse.json()).toMatchObject({
      data: {
        id: 'assignment_1',
        status: 'judge_started'
      }
    })

    const completeResponse = await harness.request('/api/hackathons/hackathon_1/judging/assignments/assignment_1/actions/complete', {
      method: 'POST',
      body: JSON.stringify({
        criterionScores: [
          {
            evaluationCriterionId: 'criterion_1',
            score: 8,
            comment: 'Strong novelty'
          },
          {
            evaluationCriterionId: 'criterion_2',
            score: 9
          }
        ]
      })
    })

    expect(completeResponse.status).toBe(200)
    expect(await completeResponse.json()).toMatchObject({
      data: {
        id: 'assignment_1',
        status: 'judge_completed',
        criterionScores: [
          expect.objectContaining({
            evaluationCriterionId: 'criterion_1',
            score: 8
          }),
          expect.objectContaining({
            evaluationCriterionId: 'criterion_2',
            score: 9
          })
        ]
      }
    })

    const updatedAssignment = await harness.database.query.judgeAssignments.findFirst({
      where: eq(judgeAssignments.id, 'assignment_1')
    })
    const storedScores = await harness.database.select().from(judgeCriterionScores)
    const auditEntries = await harness.database.select().from(auditLogs)

    expect(updatedAssignment?.status).toBe('judge_completed')
    expect(storedScores).toHaveLength(2)
    expect(auditEntries).toEqual(expect.arrayContaining([
      expect.objectContaining({ action: 'judge_assignment.review_started' }),
      expect.objectContaining({ action: 'judge_assignment.review_completed' })
    ]))
  })

  test('assigned judges can start and complete a pitch review with an open score', async () => {
    const harness = createApiRouteTestHarness({
      routes: [
        {
          method: 'post',
          path: '/api/hackathons/:hackathonId/judging/assignments/:assignmentId/actions/start',
          handler: startJudgeAssignmentHandler
        },
        {
          method: 'post',
          path: '/api/hackathons/:hackathonId/judging/assignments/:assignmentId/actions/complete',
          handler: completeJudgeAssignmentHandler
        }
      ],
      sessionUser: {
        sub: 'auth0|judge_a',
        email: 'judge-a@example.com'
      }
    })
    harnesses.push(harness)

    await seedBaseJudgingRecords(harness, {
      state: 'pitch_review',
      pitchReviewEnabled: true
    })
    await harness.database.insert(judgeAssignments).values({
      id: 'assignment_pitch_1',
      hackathonId: 'hackathon_1',
      submissionId: 'submission_1',
      judgeUserId: 'judge_a',
      reviewStage: 'pitch_review',
      blindReviewSlot: null,
      status: 'assigned',
      assignedAt: '2026-03-26T12:10:00.000Z',
      createdAt: '2026-03-26T12:10:00.000Z'
    })

    const startResponse = await harness.request('/api/hackathons/hackathon_1/judging/assignments/assignment_pitch_1/actions/start', {
      method: 'POST'
    })

    expect(startResponse.status).toBe(200)
    expect(await startResponse.json()).toMatchObject({
      data: {
        id: 'assignment_pitch_1',
        reviewStage: 'pitch_review',
        status: 'judge_started',
        pitchSubmission: {
          teamName: 'Alpha Team'
        }
      }
    })

    const completeResponse = await harness.request('/api/hackathons/hackathon_1/judging/assignments/assignment_pitch_1/actions/complete', {
      method: 'POST',
      body: JSON.stringify({
        pitchScore: 9,
        pitchComment: 'Clear and confident demo.'
      })
    })

    expect(completeResponse.status).toBe(200)
    expect(await completeResponse.json()).toMatchObject({
      data: {
        id: 'assignment_pitch_1',
        reviewStage: 'pitch_review',
        status: 'judge_completed',
        pitchScore: 9,
        pitchComment: 'Clear and confident demo.'
      }
    })

    const updatedAssignment = await harness.database.query.judgeAssignments.findFirst({
      where: eq(judgeAssignments.id, 'assignment_pitch_1')
    })
    const storedScores = await harness.database.select().from(judgeCriterionScores)
    const auditEntries = await harness.database.select().from(auditLogs)

    expect(updatedAssignment).toMatchObject({
      status: 'judge_completed',
      pitchScore: 9,
      pitchComment: 'Clear and confident demo.'
    })
    expect(storedScores).toHaveLength(0)
    expect(auditEntries).toEqual(expect.arrayContaining([
      expect.objectContaining({ action: 'judge_assignment.review_started' }),
      expect.objectContaining({ action: 'judge_assignment.review_completed' })
    ]))
  })

  test('skipping an assignment reassigns it to the lowest-load eligible judge', async () => {
    const harness = createApiRouteTestHarness({
      routes: [
        {
          method: 'post',
          path: '/api/hackathons/:hackathonId/judging/assignments/:assignmentId/actions/skip',
          handler: skipJudgeAssignmentHandler
        }
      ],
      sessionUser: {
        sub: 'auth0|judge_a',
        email: 'judge-a@example.com'
      }
    })
    harnesses.push(harness)

    await seedBaseJudgingRecords(harness)
    await harness.database.insert(judgeAssignments).values([
      {
        id: 'assignment_1',
        hackathonId: 'hackathon_1',
        submissionId: 'submission_1',
        judgeUserId: 'judge_a',
        status: 'assigned',
        assignedAt: '2026-03-25T12:10:00.000Z',
        createdAt: '2026-03-25T12:10:00.000Z'
      },
      {
        id: 'assignment_existing_b',
        hackathonId: 'hackathon_1',
        submissionId: 'submission_2',
        judgeUserId: 'judge_b',
        status: 'assigned',
        assignedAt: '2026-03-25T12:11:00.000Z',
        createdAt: '2026-03-25T12:11:00.000Z'
      }
    ])

    const response = await harness.request('/api/hackathons/hackathon_1/judging/assignments/assignment_1/actions/skip', {
      method: 'POST',
      body: JSON.stringify({
        reason: 'Conflict'
      })
    })

    expect(response.status).toBe(200)
    expect(await response.json()).toMatchObject({
      data: {
        submissionId: 'submission_1',
        judgeUserId: 'judge_c',
        status: 'assigned'
      }
    })

    const assignmentRows = await harness.database.select().from(judgeAssignments)
    const skippedAssignment = assignmentRows.find(row => row.id === 'assignment_1')
    const replacementAssignment = assignmentRows.find(row => row.submissionId === 'submission_1' && row.id !== 'assignment_1')

    expect(skippedAssignment).toMatchObject({
      status: 'skipped',
      skippedByUserId: 'judge_a',
      skipReason: 'Conflict'
    })
    expect(replacementAssignment).toMatchObject({
      judgeUserId: 'judge_c',
      status: 'assigned'
    })
  })

  test('skipping a blind assignment fails when the only remaining judge already owns the other blind-review slot', async () => {
    const harness = createApiRouteTestHarness({
      routes: [
        {
          method: 'post',
          path: '/api/hackathons/:hackathonId/judging/assignments/:assignmentId/actions/skip',
          handler: skipJudgeAssignmentHandler
        }
      ],
      sessionUser: {
        sub: 'auth0|judge_a',
        email: 'judge-a@example.com'
      }
    })
    harnesses.push(harness)

    await seedBaseJudgingRecords(harness, {
      blindReviewCount: 2
    })
    await harness.database.delete(hackathonRoleAssignments).where(eq(hackathonRoleAssignments.id, 'role_judge_c'))
    await harness.database.insert(judgeAssignments).values([
      {
        id: 'assignment_1',
        hackathonId: 'hackathon_1',
        submissionId: 'submission_1',
        judgeUserId: 'judge_a',
        blindReviewSlot: 1,
        status: 'assigned',
        assignedAt: '2026-03-25T12:10:00.000Z',
        createdAt: '2026-03-25T12:10:00.000Z'
      },
      {
        id: 'assignment_2',
        hackathonId: 'hackathon_1',
        submissionId: 'submission_1',
        judgeUserId: 'judge_b',
        blindReviewSlot: 2,
        status: 'assigned',
        assignedAt: '2026-03-25T12:11:00.000Z',
        createdAt: '2026-03-25T12:11:00.000Z'
      }
    ])

    const response = await harness.request('/api/hackathons/hackathon_1/judging/assignments/assignment_1/actions/skip', {
      method: 'POST',
      body: JSON.stringify({
        reason: 'Conflict'
      })
    })

    expect(response.status).toBe(409)
    expect(await response.json()).toMatchObject({
      error: {
        code: 'eligible_replacement_judge_required'
      }
    })
  })

  test('skipping a pitch assignment records a skipped vote without creating a replacement', async () => {
    const harness = createApiRouteTestHarness({
      routes: [
        {
          method: 'post',
          path: '/api/hackathons/:hackathonId/judging/assignments/:assignmentId/actions/skip',
          handler: skipJudgeAssignmentHandler
        }
      ],
      sessionUser: {
        sub: 'auth0|judge_a',
        email: 'judge-a@example.com'
      }
    })
    harnesses.push(harness)

    await seedBaseJudgingRecords(harness, {
      state: 'pitch_review',
      pitchReviewEnabled: true
    })
    await harness.database.insert(judgeAssignments).values({
      id: 'assignment_pitch_1',
      hackathonId: 'hackathon_1',
      submissionId: 'submission_1',
      judgeUserId: 'judge_a',
      reviewStage: 'pitch_review',
      blindReviewSlot: null,
      status: 'assigned',
      assignedAt: '2026-03-26T12:10:00.000Z',
      createdAt: '2026-03-26T12:10:00.000Z'
    })

    const response = await harness.request('/api/hackathons/hackathon_1/judging/assignments/assignment_pitch_1/actions/skip', {
      method: 'POST',
      body: JSON.stringify({
        reason: 'Missed the live presentation'
      })
    })

    expect(response.status).toBe(200)
    expect(await response.json()).toMatchObject({
      data: {
        id: 'assignment_pitch_1',
        reviewStage: 'pitch_review',
        status: 'skipped',
        skipReason: 'Missed the live presentation'
      }
    })

    const assignmentRows = await harness.database.select().from(judgeAssignments)

    expect(assignmentRows).toHaveLength(1)
    expect(assignmentRows[0]).toMatchObject({
      id: 'assignment_pitch_1',
      status: 'skipped',
      skippedByUserId: 'judge_a',
      skipReason: 'Missed the live presentation'
    })
  })

  test('hackathon admins can reassign unstarted assignments during blind review', async () => {
    const harness = createApiRouteTestHarness({
      routes: [
        {
          method: 'post',
          path: '/api/hackathons/:hackathonId/judging/assignments/:assignmentId/actions/reassign',
          handler: reassignJudgeAssignmentHandler
        }
      ],
      sessionUser: {
        sub: 'auth0|hackathon_admin',
        email: 'hackathon-admin@example.com'
      }
    })
    harnesses.push(harness)

    await seedBaseJudgingRecords(harness, { state: 'blind_review' })
    await harness.database.insert(judgeAssignments).values({
      id: 'assignment_1',
      hackathonId: 'hackathon_1',
      submissionId: 'submission_1',
      judgeUserId: 'judge_a',
      status: 'assigned',
      assignedAt: '2026-03-25T12:10:00.000Z',
      createdAt: '2026-03-25T12:10:00.000Z'
    })

    const response = await harness.request('/api/hackathons/hackathon_1/judging/assignments/assignment_1/actions/reassign', {
      method: 'POST',
      body: JSON.stringify({
        judgeUserId: 'judge_b',
        reason: 'Availability'
      })
    })

    expect(response.status).toBe(200)
    expect(await response.json()).toMatchObject({
      data: {
        submissionId: 'submission_1',
        judgeUserId: 'judge_b',
        status: 'assigned'
      }
    })

    const auditEntries = await harness.database.select().from(auditLogs)
    expect(auditEntries).toEqual([
      expect.objectContaining({
        actorUserId: 'hackathon_admin',
        action: 'judge_assignment.reassigned'
      })
    ])
  })

  test('hackathon admins cannot reassign unstarted assignments during judging preparation', async () => {
    const harness = createApiRouteTestHarness({
      routes: [
        {
          method: 'post',
          path: '/api/hackathons/:hackathonId/judging/assignments/:assignmentId/actions/reassign',
          handler: reassignJudgeAssignmentHandler
        }
      ],
      sessionUser: {
        sub: 'auth0|hackathon_admin',
        email: 'hackathon-admin@example.com'
      }
    })
    harnesses.push(harness)

    await seedBaseJudgingRecords(harness, { state: 'judging_preparation' })
    await harness.database.insert(judgeAssignments).values({
      id: 'assignment_1',
      hackathonId: 'hackathon_1',
      submissionId: 'submission_1',
      judgeUserId: 'judge_a',
      status: 'assigned',
      assignedAt: '2026-03-25T12:10:00.000Z',
      createdAt: '2026-03-25T12:10:00.000Z'
    })

    const response = await harness.request('/api/hackathons/hackathon_1/judging/assignments/assignment_1/actions/reassign', {
      method: 'POST',
      body: JSON.stringify({
        judgeUserId: 'judge_b',
        reason: 'Availability'
      })
    })

    expect(response.status).toBe(409)
    expect(await response.json()).toMatchObject({
      error: {
        code: 'hackathon_state_invalid',
        message: 'This judging operation is not allowed in the current hackathon state.'
      }
    })
  })

  test('hackathon admins cannot auto-reassign a blind assignment onto the judge already assigned to the other slot', async () => {
    const harness = createApiRouteTestHarness({
      routes: [
        {
          method: 'post',
          path: '/api/hackathons/:hackathonId/judging/assignments/:assignmentId/actions/reassign',
          handler: reassignJudgeAssignmentHandler
        }
      ],
      sessionUser: {
        sub: 'auth0|hackathon_admin',
        email: 'hackathon-admin@example.com'
      }
    })
    harnesses.push(harness)

    await seedBaseJudgingRecords(harness, {
      state: 'blind_review',
      blindReviewCount: 2
    })
    await harness.database.delete(hackathonRoleAssignments).where(eq(hackathonRoleAssignments.id, 'role_judge_c'))
    await harness.database.insert(judgeAssignments).values([
      {
        id: 'assignment_1',
        hackathonId: 'hackathon_1',
        submissionId: 'submission_1',
        judgeUserId: 'judge_a',
        blindReviewSlot: 1,
        status: 'assigned',
        assignedAt: '2026-03-25T12:10:00.000Z',
        createdAt: '2026-03-25T12:10:00.000Z'
      },
      {
        id: 'assignment_2',
        hackathonId: 'hackathon_1',
        submissionId: 'submission_1',
        judgeUserId: 'judge_b',
        blindReviewSlot: 2,
        status: 'assigned',
        assignedAt: '2026-03-25T12:11:00.000Z',
        createdAt: '2026-03-25T12:11:00.000Z'
      }
    ])

    const response = await harness.request('/api/hackathons/hackathon_1/judging/assignments/assignment_1/actions/reassign', {
      method: 'POST',
      body: JSON.stringify({
        reason: 'Availability'
      })
    })

    expect(response.status).toBe(409)
    expect(await response.json()).toMatchObject({
      error: {
        code: 'eligible_replacement_judge_required'
      }
    })
  })

  test('platform admins can force-skip started assignments and reopen them for another judge', async () => {
    const harness = createApiRouteTestHarness({
      routes: [
        {
          method: 'post',
          path: '/api/hackathons/:hackathonId/judging/assignments/:assignmentId/actions/force-skip',
          handler: forceSkipJudgeAssignmentHandler
        }
      ],
      sessionUser: {
        sub: 'auth0|platform_admin',
        email: 'platform-admin@example.com'
      }
    })
    harnesses.push(harness)

    await seedBaseJudgingRecords(harness)
    await harness.database.insert(judgeAssignments).values({
      id: 'assignment_1',
      hackathonId: 'hackathon_1',
      submissionId: 'submission_1',
      judgeUserId: 'judge_a',
      status: 'judge_started',
      assignedAt: '2026-03-25T12:10:00.000Z',
      startedAt: '2026-03-25T12:12:00.000Z',
      createdAt: '2026-03-25T12:10:00.000Z'
    })

    const response = await harness.request('/api/hackathons/hackathon_1/judging/assignments/assignment_1/actions/force-skip', {
      method: 'POST',
      body: JSON.stringify({
        reason: 'Judge unavailable'
      })
    })

    expect(response.status).toBe(200)
    expect(await response.json()).toMatchObject({
      data: {
        submissionId: 'submission_1',
        status: 'assigned'
      }
    })

    const assignmentRows = await harness.database.select().from(judgeAssignments)
    expect(assignmentRows).toEqual(expect.arrayContaining([
      expect.objectContaining({
        id: 'assignment_1',
        status: 'skipped',
        skippedByUserId: 'platform_admin'
      })
    ]))
    expect(assignmentRows.find(row => row.id !== 'assignment_1' && row.submissionId === 'submission_1')?.judgeUserId).toBe('judge_b')
  })

  test('platform admins can force-skip started pitch assignments without creating a replacement', async () => {
    const harness = createApiRouteTestHarness({
      routes: [
        {
          method: 'post',
          path: '/api/hackathons/:hackathonId/judging/assignments/:assignmentId/actions/force-skip',
          handler: forceSkipJudgeAssignmentHandler
        }
      ],
      sessionUser: {
        sub: 'auth0|platform_admin',
        email: 'platform-admin@example.com'
      }
    })
    harnesses.push(harness)

    await seedBaseJudgingRecords(harness, {
      state: 'pitch_review',
      pitchReviewEnabled: true
    })
    await harness.database.insert(judgeAssignments).values({
      id: 'assignment_pitch_1',
      hackathonId: 'hackathon_1',
      submissionId: 'submission_1',
      judgeUserId: 'judge_a',
      reviewStage: 'pitch_review',
      blindReviewSlot: null,
      status: 'judge_started',
      assignedAt: '2026-03-26T12:10:00.000Z',
      startedAt: '2026-03-26T12:12:00.000Z',
      createdAt: '2026-03-26T12:10:00.000Z'
    })

    const response = await harness.request('/api/hackathons/hackathon_1/judging/assignments/assignment_pitch_1/actions/force-skip', {
      method: 'POST',
      body: JSON.stringify({
        reason: 'Judge left the panel'
      })
    })

    expect(response.status).toBe(200)
    expect(await response.json()).toMatchObject({
      data: {
        id: 'assignment_pitch_1',
        reviewStage: 'pitch_review',
        status: 'skipped',
        skipReason: 'Judge left the panel'
      }
    })

    const assignmentRows = await harness.database.select().from(judgeAssignments)

    expect(assignmentRows).toHaveLength(1)
    expect(assignmentRows[0]).toMatchObject({
      id: 'assignment_pitch_1',
      status: 'skipped',
      skippedByUserId: 'platform_admin',
      skipReason: 'Judge left the panel'
    })
  })

  test('admins can mark an assignment ineligible when assigned and later revert that decision', async () => {
    const harness = createApiRouteTestHarness({
      routes: [
        {
          method: 'post',
          path: '/api/hackathons/:hackathonId/judging/assignments/:assignmentId/actions/mark-ineligible',
          handler: markAssignmentIneligibleHandler
        },
        {
          method: 'post',
          path: '/api/hackathons/:hackathonId/judging/assignments/:assignmentId/actions/revert-ineligibility',
          handler: revertAssignmentIneligibilityHandler
        }
      ],
      sessionUser: {
        sub: 'auth0|platform_admin',
        email: 'platform-admin@example.com'
      }
    })
    harnesses.push(harness)

    await seedBaseJudgingRecords(harness)
    await harness.database.insert(judgeAssignments).values({
      id: 'assignment_1',
      hackathonId: 'hackathon_1',
      submissionId: 'submission_1',
      judgeUserId: 'platform_admin',
      status: 'judge_started',
      assignedAt: '2026-03-25T12:10:00.000Z',
      startedAt: '2026-03-25T12:12:00.000Z',
      createdAt: '2026-03-25T12:10:00.000Z'
    })

    const markResponse = await harness.request('/api/hackathons/hackathon_1/judging/assignments/assignment_1/actions/mark-ineligible', {
      method: 'POST',
      body: JSON.stringify({
        reason: 'Rule violation'
      })
    })

    expect(markResponse.status).toBe(200)
    expect(await markResponse.json()).toMatchObject({
      data: {
        id: 'assignment_1',
        ineligibilityStatus: 'ineligible',
        ineligibilityReason: 'Rule violation'
      }
    })

    const revertResponse = await harness.request('/api/hackathons/hackathon_1/judging/assignments/assignment_1/actions/revert-ineligibility', {
      method: 'POST'
    })

    expect(revertResponse.status).toBe(200)
    expect(await revertResponse.json()).toMatchObject({
      data: {
        id: 'assignment_1',
        ineligibilityStatus: 'eligible',
        ineligibilityReason: null
      }
    })
  })

  test('admins can revert ineligibility during final deliberation', async () => {
    const harness = createApiRouteTestHarness({
      routes: [
        {
          method: 'post',
          path: '/api/hackathons/:hackathonId/judging/assignments/:assignmentId/actions/revert-ineligibility',
          handler: revertAssignmentIneligibilityHandler
        }
      ],
      sessionUser: {
        sub: 'auth0|platform_admin',
        email: 'platform-admin@example.com'
      }
    })
    harnesses.push(harness)

    await seedBaseJudgingRecords(harness, {
      state: 'final_deliberation',
      pitchReviewEnabled: true
    })
    await harness.database.insert(judgeAssignments).values({
      id: 'assignment_1',
      hackathonId: 'hackathon_1',
      submissionId: 'submission_1',
      judgeUserId: 'platform_admin',
      status: 'judge_started',
      ineligibilityStatus: 'ineligible',
      ineligibilityReason: 'Rule violation',
      ineligibilityMarkedAt: '2026-03-25T12:13:00.000Z',
      ineligibilityMarkedByUserId: 'platform_admin',
      assignedAt: '2026-03-25T12:10:00.000Z',
      startedAt: '2026-03-25T12:12:00.000Z',
      createdAt: '2026-03-25T12:10:00.000Z'
    })

    const response = await harness.request('/api/hackathons/hackathon_1/judging/assignments/assignment_1/actions/revert-ineligibility', {
      method: 'POST'
    })

    expect(response.status).toBe(200)
    expect(await response.json()).toMatchObject({
      data: {
        id: 'assignment_1',
        ineligibilityStatus: 'eligible',
        ineligibilityReason: null
      }
    })
  })
})
