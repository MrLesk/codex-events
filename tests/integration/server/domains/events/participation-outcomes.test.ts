import { afterEach, describe, expect, test } from 'vitest'

import { listOwnEventParticipation } from '../../../../../server/domains/events/participation'
import { apiData } from '../../../../../server/http/api-response'
import { defineApiHandler } from '../../../../../server/http/api-handler'
import {
  evaluationCriteria,
  events,
  judgeAssignments,
  judgeCriterionScores,
  platformDocuments,
  prizes,
  submissions,
  teamMembers,
  teams,
  userApplications,
  userPlatformDocumentAcceptances,
  users
} from '../../../../../server/database/schema'
import { createApiRouteTestHarness } from '../../../../support/backend/api-route'

describe('account participation outcome query plan', () => {
  const harnesses: Array<ReturnType<typeof createApiRouteTestHarness>> = []

  afterEach(async () => {
    while (harnesses.length > 0) {
      await harnesses.pop()?.d1Database.close()
    }
  })

  test('keeps outcome query count constant as completed events grow', async () => {
    const participationHandler = defineApiHandler(async event =>
      apiData(await listOwnEventParticipation(event))
    )
    const backend = createApiRouteTestHarness({
      routes: [
        { method: 'get', path: '/test/account/overview', handler: participationHandler }
      ],
      sessionUser: {
        sub: 'auth0|bulk-overview-user',
        email: 'bulk-overview-user@example.com',
        email_verified: true,
        name: 'Bulk Overview User'
      },
      autoAcceptCurrentPlatformDocuments: false
    })
    harnesses.push(backend)

    await backend.database.insert(users).values([
      {
        id: 'bulk-overview-user',
        auth0Subject: 'auth0|bulk-overview-user',
        email: 'bulk-overview-user@example.com',
        displayName: 'Bulk Overview User'
      },
      {
        id: 'bulk-overview-other',
        auth0Subject: 'auth0|bulk-overview-other',
        email: 'bulk-overview-other@example.com',
        displayName: 'Bulk Overview Other'
      }
    ])
    await backend.database.insert(platformDocuments).values([
      {
        id: 'bulk-overview-privacy',
        documentType: 'privacy_policy',
        version: 1,
        title: 'Privacy Policy',
        content: 'Privacy',
        publishedAt: '2026-08-19T00:00:00.000Z'
      },
      {
        id: 'bulk-overview-terms',
        documentType: 'platform_terms',
        version: 1,
        title: 'Platform Terms',
        content: 'Terms',
        publishedAt: '2026-08-19T00:00:00.000Z'
      }
    ])
    await backend.database.insert(userPlatformDocumentAcceptances).values([
      {
        id: 'bulk-overview-privacy-acceptance',
        userId: 'bulk-overview-user',
        platformDocumentId: 'bulk-overview-privacy',
        acceptedAt: '2026-08-19T00:00:00.000Z'
      },
      {
        id: 'bulk-overview-terms-acceptance',
        userId: 'bulk-overview-user',
        platformDocumentId: 'bulk-overview-terms',
        acceptedAt: '2026-08-19T00:00:00.000Z'
      }
    ])

    async function seedCompletedCompetition(index: number, primaryTeamWins: boolean) {
      const eventId = `bulk-outcome-event-${index}`
      const primaryTeamId = `bulk-outcome-team-${index}`
      const otherTeamId = `bulk-outcome-other-team-${index}`
      const primarySubmissionId = `bulk-outcome-submission-${index}`
      const otherSubmissionId = `bulk-outcome-other-submission-${index}`
      const criterionId = `bulk-outcome-criterion-${index}`
      const primaryAssignmentId = `bulk-outcome-assignment-${index}`
      const otherAssignmentId = `bulk-outcome-other-assignment-${index}`
      const eventTime = `2026-08-${String(10 + index).padStart(2, '0')}T12:00:00.000Z`
      const primaryScore = primaryTeamWins ? 5 : 4
      const otherScore = primaryTeamWins ? 4 : 5

      await backend.database.insert(events).values({
        id: eventId,
        eventType: 'hackathon',
        name: eventId,
        slug: eventId,
        description: eventId,
        city: 'Vienna',
        country: 'Austria',
        address: 'Event address',
        registrationOpensAt: '2026-08-01T00:00:00.000Z',
        registrationClosesAt: '2026-08-05T00:00:00.000Z',
        submissionOpensAt: '2026-08-06T00:00:00.000Z',
        submissionClosesAt: '2026-08-09T00:00:00.000Z',
        state: 'completed',
        blindReviewCount: 1,
        pitchReviewEnabled: false,
        blindScoreWeightPercent: 100,
        pitchScoreWeightPercent: 0,
        maxTeamMembers: 4,
        createdByUserId: 'bulk-overview-user',
        createdAt: eventTime,
        updatedAt: eventTime
      })
      await backend.database.insert(userApplications).values({
        id: `bulk-outcome-application-${index}`,
        eventId,
        userId: 'bulk-overview-user',
        status: 'approved',
        submittedAt: eventTime,
        updatedAt: eventTime
      })
      await backend.database.insert(teams).values([
        {
          id: primaryTeamId,
          eventId,
          name: `Primary ${index}`,
          slug: `primary-${index}`,
          createdByUserId: 'bulk-overview-user',
          createdAt: eventTime,
          updatedAt: eventTime
        },
        {
          id: otherTeamId,
          eventId,
          name: `Other ${index}`,
          slug: `other-${index}`,
          createdByUserId: 'bulk-overview-other',
          createdAt: eventTime,
          updatedAt: eventTime
        }
      ])
      await backend.database.insert(teamMembers).values([
        {
          id: `bulk-outcome-member-${index}`,
          teamId: primaryTeamId,
          userId: 'bulk-overview-user',
          role: 'admin',
          joinedAt: eventTime,
          createdAt: eventTime
        },
        {
          id: `bulk-outcome-other-member-${index}`,
          teamId: otherTeamId,
          userId: 'bulk-overview-other',
          role: 'admin',
          joinedAt: eventTime,
          createdAt: eventTime
        }
      ])
      await backend.database.insert(submissions).values([
        {
          id: primarySubmissionId,
          teamId: primaryTeamId,
          status: 'locked',
          projectName: `Primary project ${index}`,
          submittedAt: eventTime,
          lockedAt: eventTime,
          createdAt: eventTime,
          updatedAt: eventTime
        },
        {
          id: otherSubmissionId,
          teamId: otherTeamId,
          status: 'locked',
          projectName: `Other project ${index}`,
          submittedAt: eventTime,
          lockedAt: eventTime,
          createdAt: eventTime,
          updatedAt: eventTime
        }
      ])
      await backend.database.insert(evaluationCriteria).values({
        id: criterionId,
        eventId,
        name: 'Execution',
        description: 'Execution quality',
        weight: 100,
        displayOrder: 1,
        createdAt: eventTime
      })
      await backend.database.insert(judgeAssignments).values([
        {
          id: primaryAssignmentId,
          eventId,
          submissionId: primarySubmissionId,
          judgeUserId: 'bulk-overview-other',
          reviewStage: 'blind_review',
          blindReviewSlot: 1,
          status: 'judge_completed',
          ineligibilityStatus: 'eligible',
          assignedAt: eventTime,
          completedAt: eventTime,
          createdAt: eventTime
        },
        {
          id: otherAssignmentId,
          eventId,
          submissionId: otherSubmissionId,
          judgeUserId: 'bulk-overview-other',
          reviewStage: 'blind_review',
          blindReviewSlot: 1,
          status: 'judge_completed',
          ineligibilityStatus: 'eligible',
          assignedAt: eventTime,
          completedAt: eventTime,
          createdAt: eventTime
        }
      ])
      await backend.database.insert(judgeCriterionScores).values([
        {
          id: `bulk-outcome-score-${index}`,
          judgeAssignmentId: primaryAssignmentId,
          evaluationCriterionId: criterionId,
          score: primaryScore,
          createdAt: eventTime,
          updatedAt: eventTime
        },
        {
          id: `bulk-outcome-other-score-${index}`,
          judgeAssignmentId: otherAssignmentId,
          evaluationCriterionId: criterionId,
          score: otherScore,
          createdAt: eventTime,
          updatedAt: eventTime
        }
      ])
      await backend.database.insert(prizes).values({
        id: `bulk-outcome-prize-${index}`,
        eventId,
        name: `Prize ${index}`,
        description: 'Winner prize',
        rewardType: 'other',
        rewardValue: 'Reward',
        awardScope: 'team',
        rankStart: 1,
        rankEnd: 1,
        displayOrder: 1,
        createdAt: eventTime
      })

      return eventId
    }

    const firstEventId = await seedCompletedCompetition(1, true)
    const firstQueryOffset = backend.d1Database.queries.length
    const firstResponse = await backend.request('/test/account/overview')
    const firstPage = (await firstResponse.json() as {
      data: { current: Array<{ event: { id: string }, outcome: unknown }>, past: Array<{ event: { id: string }, outcome: unknown }> }
    }).data
    const firstQueryCount = backend.d1Database.queries.length - firstQueryOffset
    const firstRecord = [...firstPage.current, ...firstPage.past]
      .find(record => record.event.id === firstEventId)

    expect(firstRecord?.outcome).toMatchObject({
      finalRank: 1,
      rankedTeamCount: 2,
      isWinner: true,
      prizes: [{ id: 'bulk-outcome-prize-1', name: 'Prize 1' }]
    })

    const additionalEventIds = [
      await seedCompletedCompetition(2, false),
      await seedCompletedCompetition(3, true),
      await seedCompletedCompetition(4, false),
      await seedCompletedCompetition(5, true)
    ]
    const manyQueryOffset = backend.d1Database.queries.length
    const manyResponse = await backend.request('/test/account/overview')
    const manyPage = (await manyResponse.json() as {
      data: { current: Array<{ event: { id: string }, outcome: unknown }>, past: Array<{ event: { id: string }, outcome: unknown }> }
    }).data
    const manyQueryCount = backend.d1Database.queries.length - manyQueryOffset
    const manyRecords = [...manyPage.current, ...manyPage.past]

    expect(firstResponse.status).toBe(200)
    expect(manyResponse.status).toBe(200)
    expect(manyQueryCount).toBe(firstQueryCount)
    const manyQueries = backend.d1Database.queries.slice(manyQueryOffset)
    expect(new Set(manyQueries.map(query => query.sessionId))).toHaveLength(1)
    expect(manyQueries.some(query => /\bIN\s*\(/i.test(query.sql))).toBe(false)
    expect(manyRecords).toHaveLength(5)
    expect(manyRecords.map(record => record.event.id)).toEqual(
      expect.arrayContaining([firstEventId, ...additionalEventIds])
    )
    expect(manyRecords.find(record => record.event.id === 'bulk-outcome-event-2')?.outcome).toMatchObject({
      finalRank: 2,
      rankedTeamCount: 2,
      isWinner: false,
      prizes: []
    })
    expect(manyQueries.filter(query => query.sql.includes('judge_assignments'))).toHaveLength(2)
  })
})
