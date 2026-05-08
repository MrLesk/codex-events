import { afterEach, describe, expect, test, vi } from 'vitest'

import { eq } from 'drizzle-orm'

import completeJudgeAssignmentHandler from '../../../../server/api/events/[eventId]/judging/assignments/[assignmentId]/actions/complete.post'
import forceSkipJudgeAssignmentHandler from '../../../../server/api/events/[eventId]/judging/assignments/[assignmentId]/actions/force-skip.post'
import markAssignmentIneligibleHandler from '../../../../server/api/events/[eventId]/judging/assignments/[assignmentId]/actions/mark-ineligible.post'
import reassignJudgeAssignmentHandler from '../../../../server/api/events/[eventId]/judging/assignments/[assignmentId]/actions/reassign.post'
import revertAssignmentIneligibilityHandler from '../../../../server/api/events/[eventId]/judging/assignments/[assignmentId]/actions/revert-ineligibility.post'
import skipJudgeAssignmentHandler from '../../../../server/api/events/[eventId]/judging/assignments/[assignmentId]/actions/skip.post'
import startJudgeAssignmentHandler from '../../../../server/api/events/[eventId]/judging/assignments/[assignmentId]/actions/start.post'
import patchJudgeAssignmentHandler from '../../../../server/api/events/[eventId]/judging/assignments/[assignmentId]/index.patch'
import listJudgeAssignmentsHandler from '../../../../server/api/events/[eventId]/judging/assignments/index.get'
import {
  auditLogs,
  evaluationCriteria,
  eventRoleAssignments,
  eventTermsDocuments,
  events,
  judgeAssignments,
  judgeCriterionScores,
  submissions,
  teamMembers,
  teams,
  userApplications,
  users
} from '../../../../server/database/schema'
import { chunkRowsForD1 } from '../../../../server/domains/judging'
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
        id: 'event_admin',
        auth0Subject: 'auth0|event_admin',
        email: 'event-admin@example.com',
        displayName: 'Event Admin'
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

    await harness.database.insert(events).values({
      id: 'event_1',
      eventType: 'hackathon',
      name: 'Judging Event',
      slug: 'judging-event',
      description: 'Judging event',
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

    await harness.database.insert(eventTermsDocuments).values({
      id: 'terms_application_1',
      eventId: 'event_1',
      documentType: 'application_terms',
      version: 1,
      title: 'Application Terms',
      content: 'Application terms',
      publishedAt: '2026-03-18T12:00:00.000Z',
      createdAt: '2026-03-18T12:00:00.000Z'
    })

    await harness.database.insert(eventRoleAssignments).values([
      {
        id: 'role_admin',
        eventId: 'event_1',
        userId: 'event_admin',
        role: 'event_admin',
        isInJudgePool: false,
        createdAt: '2026-03-22T12:00:00.000Z'
      },
      {
        id: 'role_judge_a',
        eventId: 'event_1',
        userId: 'judge_a',
        role: 'judge',
        isInJudgePool: true,
        createdAt: '2026-03-22T12:01:00.000Z'
      },
      {
        id: 'role_judge_b',
        eventId: 'event_1',
        userId: 'judge_b',
        role: 'judge',
        isInJudgePool: true,
        createdAt: '2026-03-22T12:02:00.000Z'
      },
      {
        id: 'role_judge_c',
        eventId: 'event_1',
        userId: 'judge_c',
        role: 'judge',
        isInJudgePool: true,
        createdAt: '2026-03-22T12:03:00.000Z'
      }
    ])

    await harness.database.insert(teams).values([
      {
        id: 'team_1',
        eventId: 'event_1',
        name: 'Alpha Team',
        slug: 'alpha-team',
        isOpenToJoinRequests: false,
        createdByUserId: 'team_admin',
        createdAt: '2026-03-22T12:10:00.000Z',
        updatedAt: '2026-03-22T12:10:00.000Z'
      },
      {
        id: 'team_2',
        eventId: 'event_1',
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
        eventId: 'event_1',
        userId: 'team_admin',
        status: 'approved',
        submittedAt: '2026-03-20T12:00:00.000Z',
        reviewedAt: '2026-03-20T12:30:00.000Z',
        reviewedByUserId: 'event_admin',
        applicationTermsDocumentId: 'terms_application_1',
        applicationTermsAcceptedAt: '2026-03-20T12:00:00.000Z',
        createdAt: '2026-03-20T12:00:00.000Z',
        updatedAt: '2026-03-20T12:30:00.000Z'
      },
      {
        id: 'application_team_member',
        eventId: 'event_1',
        userId: 'team_member',
        status: 'approved',
        submittedAt: '2026-03-20T12:05:00.000Z',
        reviewedAt: '2026-03-20T12:30:00.000Z',
        reviewedByUserId: 'event_admin',
        applicationTermsDocumentId: 'terms_application_1',
        applicationTermsAcceptedAt: '2026-03-20T12:05:00.000Z',
        createdAt: '2026-03-20T12:05:00.000Z',
        updatedAt: '2026-03-20T12:30:00.000Z'
      },
      {
        id: 'application_other_team_admin',
        eventId: 'event_1',
        userId: 'other_team_admin',
        status: 'approved',
        submittedAt: '2026-03-20T12:10:00.000Z',
        reviewedAt: '2026-03-20T12:30:00.000Z',
        reviewedByUserId: 'event_admin',
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
          eventId: 'event_1',
          name: 'Novelty',
          description: 'Novelty description',
          weight: 50,
          displayOrder: 1,
          createdAt: '2026-03-22T12:00:00.000Z'
        },
        {
          id: 'criterion_2',
          eventId: 'event_1',
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
        { method: 'get', path: '/api/events/:eventId/judging/assignments', handler: listJudgeAssignmentsHandler }
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
        eventId: 'event_1',
        submissionId: 'submission_1',
        judgeUserId: 'judge_a',
        status: 'assigned',
        assignedAt: '2026-03-25T12:10:00.000Z',
        createdAt: '2026-03-25T12:10:00.000Z'
      },
      {
        id: 'assignment_2',
        eventId: 'event_1',
        submissionId: 'submission_2',
        judgeUserId: 'judge_b',
        status: 'judge_started',
        assignedAt: '2026-03-25T12:11:00.000Z',
        startedAt: '2026-03-25T12:12:00.000Z',
        createdAt: '2026-03-25T12:11:00.000Z'
      }
    ])

    const response = await harness.request('/api/events/event_1/judging/assignments')

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

  test('event admins can list active assignments without judge participation enabled', async () => {
    const harness = createApiRouteTestHarness({
      routes: [
        { method: 'get', path: '/api/events/:eventId/judging/assignments', handler: listJudgeAssignmentsHandler }
      ],
      sessionUser: {
        sub: 'auth0|event_admin',
        email: 'event-admin@example.com'
      }
    })
    harnesses.push(harness)

    await seedBaseJudgingRecords(harness)
    await harness.database.insert(judgeAssignments).values([
      {
        id: 'assignment_1',
        eventId: 'event_1',
        submissionId: 'submission_1',
        judgeUserId: 'judge_a',
        status: 'assigned',
        assignedAt: '2026-03-25T12:10:00.000Z',
        createdAt: '2026-03-25T12:10:00.000Z'
      },
      {
        id: 'assignment_2',
        eventId: 'event_1',
        submissionId: 'submission_2',
        judgeUserId: 'judge_b',
        status: 'judge_started',
        assignedAt: '2026-03-25T12:11:00.000Z',
        startedAt: '2026-03-25T12:12:00.000Z',
        createdAt: '2026-03-25T12:11:00.000Z'
      },
      {
        id: 'assignment_3',
        eventId: 'event_1',
        submissionId: 'submission_1',
        judgeUserId: 'judge_c',
        status: 'judge_completed',
        assignedAt: '2026-03-25T12:13:00.000Z',
        startedAt: '2026-03-25T12:14:00.000Z',
        completedAt: '2026-03-25T12:15:00.000Z',
        createdAt: '2026-03-25T12:13:00.000Z'
      },
      {
        id: 'assignment_4',
        eventId: 'event_1',
        submissionId: 'submission_2',
        judgeUserId: 'judge_c',
        status: 'skipped',
        assignedAt: '2026-03-25T12:16:00.000Z',
        skippedAt: '2026-03-25T12:17:00.000Z',
        skippedByUserId: 'platform_admin',
        createdAt: '2026-03-25T12:16:00.000Z'
      }
    ])

    const response = await harness.request('/api/events/event_1/judging/assignments')
    expect(response.status).toBe(200)
    expect(await response.json()).toMatchObject({
      data: expect.arrayContaining([
        expect.objectContaining({
          id: 'assignment_1'
        }),
        expect.objectContaining({
          id: 'assignment_2'
        })
      ]),
      meta: {
        page: 1,
        pageSize: 100,
        total: 2
      }
    })
  })

  test('event admins can page through more than 100 active blind assignments without hitting D1 bind limits', async () => {
    const harness = createApiRouteTestHarness({
      routes: [
        { method: 'get', path: '/api/events/:eventId/judging/assignments', handler: listJudgeAssignmentsHandler }
      ],
      sessionUser: {
        sub: 'auth0|event_admin',
        email: 'event-admin@example.com'
      }
    })
    harnesses.push(harness)

    await seedBaseJudgingRecords(harness)

    const assignedAtBase = Date.parse('2026-03-25T12:10:00.000Z')
    const teamRows = Array.from({ length: 101 }, (_, index) => ({
      id: `bulk_team_${index + 1}`,
      eventId: 'event_1',
      name: `Bulk Team ${index + 1}`,
      slug: `bulk-team-${index + 1}`,
      isOpenToJoinRequests: false,
      createdByUserId: 'team_admin',
      createdAt: '2026-03-22T12:30:00.000Z',
      updatedAt: '2026-03-22T12:30:00.000Z'
    }))
    const submissionRows = Array.from({ length: 101 }, (_, index) => ({
      id: `bulk_submission_${index + 1}`,
      teamId: `bulk_team_${index + 1}`,
      status: 'locked' as const,
      projectName: `Bulk Project ${index + 1}`,
      summary: `Bulk summary ${index + 1}`,
      repositoryUrl: `https://example.com/bulk-${index + 1}`,
      demoUrl: `https://example.com/bulk-${index + 1}/demo`,
      submittedAt: '2026-03-24T12:00:00.000Z',
      lockedAt: '2026-03-25T12:00:00.000Z',
      createdAt: '2026-03-24T12:00:00.000Z',
      updatedAt: '2026-03-25T12:00:00.000Z'
    }))
    const assignmentRows = Array.from({ length: 101 }, (_, index) => {
      const timestamp = new Date(assignedAtBase + index * 1000).toISOString()

      return {
        id: `assignment_${index + 1}`,
        eventId: 'event_1',
        submissionId: `bulk_submission_${index + 1}`,
        judgeUserId: index % 3 === 0 ? 'judge_a' : index % 3 === 1 ? 'judge_b' : 'judge_c',
        blindReviewSlot: 1,
        status: 'assigned' as const,
        assignedAt: timestamp,
        createdAt: timestamp
      }
    })

    for (const rows of chunkRowsForD1(teamRows, 20)) {
      await harness.database.insert(teams).values(rows)
    }

    for (const rows of chunkRowsForD1(submissionRows, 20)) {
      await harness.database.insert(submissions).values(rows)
    }

    for (const rows of chunkRowsForD1(assignmentRows, 9)) {
      await harness.database.insert(judgeAssignments).values(rows)
    }

    const response = await harness.request('/api/events/event_1/judging/assignments')

    expect(response.status).toBe(200)
    const payload = await response.json() as {
      data: Array<Record<string, unknown>>
      meta: {
        total: number
      }
    }

    expect(payload.data).toHaveLength(100)
    expect(payload.meta.total).toBe(101)
    expect(payload.data).toEqual(expect.arrayContaining([
      expect.objectContaining({
        id: 'assignment_1',
        status: 'assigned'
      }),
      expect.objectContaining({
        id: 'assignment_100',
        status: 'assigned'
      })
    ]))

    const secondPageResponse = await harness.request('/api/events/event_1/judging/assignments?page=2&page_size=100')

    expect(secondPageResponse.status).toBe(200)
    const secondPagePayload = await secondPageResponse.json() as {
      data: Array<Record<string, unknown>>
      meta: {
        total: number
      }
    }

    expect(secondPagePayload.data).toHaveLength(1)
    expect(secondPagePayload.meta.total).toBe(101)
    expect(secondPagePayload.data[0]).toMatchObject({
      id: 'assignment_99',
      status: 'assigned'
    })
  })

  test('judges list only their active pitch assignments in the open pitch view', async () => {
    const harness = createApiRouteTestHarness({
      routes: [
        { method: 'get', path: '/api/events/:eventId/judging/assignments', handler: listJudgeAssignmentsHandler }
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
        eventId: 'event_1',
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
        eventId: 'event_1',
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

    const response = await harness.request('/api/events/event_1/judging/assignments')

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
          path: '/api/events/:eventId/judging/assignments/:assignmentId/actions/start',
          handler: startJudgeAssignmentHandler
        },
        {
          method: 'patch',
          path: '/api/events/:eventId/judging/assignments/:assignmentId',
          handler: patchJudgeAssignmentHandler
        },
        {
          method: 'post',
          path: '/api/events/:eventId/judging/assignments/:assignmentId/actions/complete',
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
      eventId: 'event_1',
      submissionId: 'submission_1',
      judgeUserId: 'judge_a',
      status: 'assigned',
      assignedAt: '2026-03-25T12:10:00.000Z',
      createdAt: '2026-03-25T12:10:00.000Z'
    })

    const startResponse = await harness.request('/api/events/event_1/judging/assignments/assignment_1/actions/start', {
      method: 'POST'
    })

    expect(startResponse.status).toBe(200)
    expect(await startResponse.json()).toMatchObject({
      data: {
        id: 'assignment_1',
        status: 'judge_started'
      }
    })

    const completeResponse = await harness.request('/api/events/event_1/judging/assignments/assignment_1/actions/complete', {
      method: 'POST',
      body: JSON.stringify({
        criterionScores: [
          {
            evaluationCriterionId: 'criterion_1',
            score: 4,
            comment: 'Strong novelty'
          },
          {
            evaluationCriterionId: 'criterion_2',
            score: 5
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
            score: 4
          }),
          expect.objectContaining({
            evaluationCriterionId: 'criterion_2',
            score: 5
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

  test('started blind reviews can save criterion scores before completion', async () => {
    const harness = createApiRouteTestHarness({
      routes: [
        {
          method: 'post',
          path: '/api/events/:eventId/judging/assignments/:assignmentId/actions/start',
          handler: startJudgeAssignmentHandler
        },
        {
          method: 'patch',
          path: '/api/events/:eventId/judging/assignments/:assignmentId',
          handler: patchJudgeAssignmentHandler
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
      eventId: 'event_1',
      submissionId: 'submission_1',
      judgeUserId: 'judge_a',
      status: 'assigned',
      assignedAt: '2026-03-25T12:10:00.000Z',
      createdAt: '2026-03-25T12:10:00.000Z'
    })

    const startResponse = await harness.request('/api/events/event_1/judging/assignments/assignment_1/actions/start', {
      method: 'POST'
    })

    expect(startResponse.status).toBe(200)

    const firstSaveResponse = await harness.request('/api/events/event_1/judging/assignments/assignment_1', {
      method: 'PATCH',
      body: JSON.stringify({
        criterionScores: [
          {
            evaluationCriterionId: 'criterion_1',
            score: 4,
            comment: 'Strong novelty'
          }
        ]
      })
    })

    expect(firstSaveResponse.status).toBe(200)
    expect(await firstSaveResponse.json()).toMatchObject({
      data: {
        id: 'assignment_1',
        status: 'judge_started',
        criterionScores: [
          expect.objectContaining({
            evaluationCriterionId: 'criterion_1',
            score: 4,
            comment: 'Strong novelty'
          })
        ]
      }
    })

    const secondSaveResponse = await harness.request('/api/events/event_1/judging/assignments/assignment_1', {
      method: 'PATCH',
      body: JSON.stringify({
        criterionScores: [
          {
            evaluationCriterionId: 'criterion_1',
            score: 5,
            comment: 'Updated novelty'
          },
          {
            evaluationCriterionId: 'criterion_2',
            score: 4
          }
        ]
      })
    })

    expect(secondSaveResponse.status).toBe(200)
    expect(await secondSaveResponse.json()).toMatchObject({
      data: {
        id: 'assignment_1',
        status: 'judge_started',
        criterionScores: [
          expect.objectContaining({
            evaluationCriterionId: 'criterion_1',
            score: 5,
            comment: 'Updated novelty'
          }),
          expect.objectContaining({
            evaluationCriterionId: 'criterion_2',
            score: 4
          })
        ]
      }
    })

    const storedScores = await harness.database.select().from(judgeCriterionScores)
    const updatedAssignment = await harness.database.query.judgeAssignments.findFirst({
      where: eq(judgeAssignments.id, 'assignment_1')
    })

    expect(updatedAssignment?.status).toBe('judge_started')
    expect(storedScores).toEqual(expect.arrayContaining([
      expect.objectContaining({
        judgeAssignmentId: 'assignment_1',
        evaluationCriterionId: 'criterion_1',
        score: 5,
        comment: 'Updated novelty'
      }),
      expect.objectContaining({
        judgeAssignmentId: 'assignment_1',
        evaluationCriterionId: 'criterion_2',
        score: 4,
        comment: null
      })
    ]))
  })

  test('assigned judges can start and complete a pitch review with an open score', async () => {
    const harness = createApiRouteTestHarness({
      routes: [
        {
          method: 'post',
          path: '/api/events/:eventId/judging/assignments/:assignmentId/actions/start',
          handler: startJudgeAssignmentHandler
        },
        {
          method: 'post',
          path: '/api/events/:eventId/judging/assignments/:assignmentId/actions/complete',
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
      eventId: 'event_1',
      submissionId: 'submission_1',
      judgeUserId: 'judge_a',
      reviewStage: 'pitch_review',
      blindReviewSlot: null,
      status: 'assigned',
      assignedAt: '2026-03-26T12:10:00.000Z',
      createdAt: '2026-03-26T12:10:00.000Z'
    })

    const startResponse = await harness.request('/api/events/event_1/judging/assignments/assignment_pitch_1/actions/start', {
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

    const completeResponse = await harness.request('/api/events/event_1/judging/assignments/assignment_pitch_1/actions/complete', {
      method: 'POST',
      body: JSON.stringify({
        pitchScore: 5,
        pitchComment: 'Clear and confident demo.'
      })
    })

    expect(completeResponse.status).toBe(200)
    expect(await completeResponse.json()).toMatchObject({
      data: {
        id: 'assignment_pitch_1',
        reviewStage: 'pitch_review',
        status: 'judge_completed',
        pitchScore: 5,
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
      pitchScore: 5,
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
          path: '/api/events/:eventId/judging/assignments/:assignmentId/actions/skip',
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
        eventId: 'event_1',
        submissionId: 'submission_1',
        judgeUserId: 'judge_a',
        status: 'assigned',
        assignedAt: '2026-03-25T12:10:00.000Z',
        createdAt: '2026-03-25T12:10:00.000Z'
      },
      {
        id: 'assignment_existing_b',
        eventId: 'event_1',
        submissionId: 'submission_2',
        judgeUserId: 'judge_b',
        status: 'assigned',
        assignedAt: '2026-03-25T12:11:00.000Z',
        createdAt: '2026-03-25T12:11:00.000Z'
      }
    ])

    const response = await harness.request('/api/events/event_1/judging/assignments/assignment_1/actions/skip', {
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
          path: '/api/events/:eventId/judging/assignments/:assignmentId/actions/skip',
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
    await harness.database.delete(eventRoleAssignments).where(eq(eventRoleAssignments.id, 'role_judge_c'))
    await harness.database.insert(judgeAssignments).values([
      {
        id: 'assignment_1',
        eventId: 'event_1',
        submissionId: 'submission_1',
        judgeUserId: 'judge_a',
        blindReviewSlot: 1,
        status: 'assigned',
        assignedAt: '2026-03-25T12:10:00.000Z',
        createdAt: '2026-03-25T12:10:00.000Z'
      },
      {
        id: 'assignment_2',
        eventId: 'event_1',
        submissionId: 'submission_1',
        judgeUserId: 'judge_b',
        blindReviewSlot: 2,
        status: 'assigned',
        assignedAt: '2026-03-25T12:11:00.000Z',
        createdAt: '2026-03-25T12:11:00.000Z'
      }
    ])

    const response = await harness.request('/api/events/event_1/judging/assignments/assignment_1/actions/skip', {
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
          path: '/api/events/:eventId/judging/assignments/:assignmentId/actions/skip',
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
      eventId: 'event_1',
      submissionId: 'submission_1',
      judgeUserId: 'judge_a',
      reviewStage: 'pitch_review',
      blindReviewSlot: null,
      status: 'assigned',
      assignedAt: '2026-03-26T12:10:00.000Z',
      createdAt: '2026-03-26T12:10:00.000Z'
    })

    const response = await harness.request('/api/events/event_1/judging/assignments/assignment_pitch_1/actions/skip', {
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

  test('event admins can reassign unstarted assignments during blind review', async () => {
    const harness = createApiRouteTestHarness({
      routes: [
        {
          method: 'post',
          path: '/api/events/:eventId/judging/assignments/:assignmentId/actions/reassign',
          handler: reassignJudgeAssignmentHandler
        }
      ],
      sessionUser: {
        sub: 'auth0|event_admin',
        email: 'event-admin@example.com'
      }
    })
    harnesses.push(harness)

    await seedBaseJudgingRecords(harness, { state: 'blind_review' })
    await harness.database.insert(judgeAssignments).values({
      id: 'assignment_1',
      eventId: 'event_1',
      submissionId: 'submission_1',
      judgeUserId: 'judge_a',
      status: 'assigned',
      assignedAt: '2026-03-25T12:10:00.000Z',
      createdAt: '2026-03-25T12:10:00.000Z'
    })

    const response = await harness.request('/api/events/event_1/judging/assignments/assignment_1/actions/reassign', {
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
        actorUserId: 'event_admin',
        action: 'judge_assignment.reassigned'
      })
    ])
  })

  test('event admins cannot reassign unstarted assignments during judging preparation', async () => {
    const harness = createApiRouteTestHarness({
      routes: [
        {
          method: 'post',
          path: '/api/events/:eventId/judging/assignments/:assignmentId/actions/reassign',
          handler: reassignJudgeAssignmentHandler
        }
      ],
      sessionUser: {
        sub: 'auth0|event_admin',
        email: 'event-admin@example.com'
      }
    })
    harnesses.push(harness)

    await seedBaseJudgingRecords(harness, { state: 'judging_preparation' })
    await harness.database.insert(judgeAssignments).values({
      id: 'assignment_1',
      eventId: 'event_1',
      submissionId: 'submission_1',
      judgeUserId: 'judge_a',
      status: 'assigned',
      assignedAt: '2026-03-25T12:10:00.000Z',
      createdAt: '2026-03-25T12:10:00.000Z'
    })

    const response = await harness.request('/api/events/event_1/judging/assignments/assignment_1/actions/reassign', {
      method: 'POST',
      body: JSON.stringify({
        judgeUserId: 'judge_b',
        reason: 'Availability'
      })
    })

    expect(response.status).toBe(409)
    expect(await response.json()).toMatchObject({
      error: {
        code: 'event_state_invalid',
        message: 'This judging operation is not allowed in the current event state.'
      }
    })
  })

  test('event admins cannot auto-reassign a blind assignment onto the judge already assigned to the other slot', async () => {
    const harness = createApiRouteTestHarness({
      routes: [
        {
          method: 'post',
          path: '/api/events/:eventId/judging/assignments/:assignmentId/actions/reassign',
          handler: reassignJudgeAssignmentHandler
        }
      ],
      sessionUser: {
        sub: 'auth0|event_admin',
        email: 'event-admin@example.com'
      }
    })
    harnesses.push(harness)

    await seedBaseJudgingRecords(harness, {
      state: 'blind_review',
      blindReviewCount: 2
    })
    await harness.database.delete(eventRoleAssignments).where(eq(eventRoleAssignments.id, 'role_judge_c'))
    await harness.database.insert(judgeAssignments).values([
      {
        id: 'assignment_1',
        eventId: 'event_1',
        submissionId: 'submission_1',
        judgeUserId: 'judge_a',
        blindReviewSlot: 1,
        status: 'assigned',
        assignedAt: '2026-03-25T12:10:00.000Z',
        createdAt: '2026-03-25T12:10:00.000Z'
      },
      {
        id: 'assignment_2',
        eventId: 'event_1',
        submissionId: 'submission_1',
        judgeUserId: 'judge_b',
        blindReviewSlot: 2,
        status: 'assigned',
        assignedAt: '2026-03-25T12:11:00.000Z',
        createdAt: '2026-03-25T12:11:00.000Z'
      }
    ])

    const response = await harness.request('/api/events/event_1/judging/assignments/assignment_1/actions/reassign', {
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
          path: '/api/events/:eventId/judging/assignments/:assignmentId/actions/force-skip',
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
      eventId: 'event_1',
      submissionId: 'submission_1',
      judgeUserId: 'judge_a',
      status: 'judge_started',
      assignedAt: '2026-03-25T12:10:00.000Z',
      startedAt: '2026-03-25T12:12:00.000Z',
      createdAt: '2026-03-25T12:10:00.000Z'
    })

    const response = await harness.request('/api/events/event_1/judging/assignments/assignment_1/actions/force-skip', {
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
          path: '/api/events/:eventId/judging/assignments/:assignmentId/actions/force-skip',
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
      eventId: 'event_1',
      submissionId: 'submission_1',
      judgeUserId: 'judge_a',
      reviewStage: 'pitch_review',
      blindReviewSlot: null,
      status: 'judge_started',
      assignedAt: '2026-03-26T12:10:00.000Z',
      startedAt: '2026-03-26T12:12:00.000Z',
      createdAt: '2026-03-26T12:10:00.000Z'
    })

    const response = await harness.request('/api/events/event_1/judging/assignments/assignment_pitch_1/actions/force-skip', {
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
          path: '/api/events/:eventId/judging/assignments/:assignmentId/actions/mark-ineligible',
          handler: markAssignmentIneligibleHandler
        },
        {
          method: 'post',
          path: '/api/events/:eventId/judging/assignments/:assignmentId/actions/revert-ineligibility',
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
      eventId: 'event_1',
      submissionId: 'submission_1',
      judgeUserId: 'platform_admin',
      status: 'judge_started',
      assignedAt: '2026-03-25T12:10:00.000Z',
      startedAt: '2026-03-25T12:12:00.000Z',
      createdAt: '2026-03-25T12:10:00.000Z'
    })

    const markResponse = await harness.request('/api/events/event_1/judging/assignments/assignment_1/actions/mark-ineligible', {
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

    const revertResponse = await harness.request('/api/events/event_1/judging/assignments/assignment_1/actions/revert-ineligibility', {
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
          path: '/api/events/:eventId/judging/assignments/:assignmentId/actions/revert-ineligibility',
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
      eventId: 'event_1',
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

    const response = await harness.request('/api/events/event_1/judging/assignments/assignment_1/actions/revert-ineligibility', {
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
