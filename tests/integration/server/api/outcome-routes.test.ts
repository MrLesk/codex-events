import { afterEach, describe, expect, test, vi } from 'vitest'

import { eq } from 'drizzle-orm'

import listPlatformAuditHandler from '../../../../server/api/audit/index.get'
import announceWinnersHandler from '../../../../server/api/hackathons/[hackathonId]/actions/announce-winners.post'
import completeHackathonHandler from '../../../../server/api/hackathons/[hackathonId]/actions/complete.post'
import startShortlistHandler from '../../../../server/api/hackathons/[hackathonId]/actions/start-shortlist.post'
import listHackathonAuditHandler from '../../../../server/api/hackathons/[hackathonId]/audit/index.get'
import listLeaderboardHandler from '../../../../server/api/hackathons/[hackathonId]/leaderboard/index.get'
import reorderShortlistHandler from '../../../../server/api/hackathons/[hackathonId]/shortlist/actions/reorder.post'
import listShortlistHandler from '../../../../server/api/hackathons/[hackathonId]/shortlist/index.get'
import listWinnersHandler from '../../../../server/api/hackathons/[hackathonId]/winners/index.get'
import redeemPrizeRedemptionHandler from '../../../../server/api/prize-redemptions/[redemptionId]/actions/redeem.post'
import listOwnPrizeRedemptionsHandler from '../../../../server/api/prize-redemptions/me.get'
import {
  auditLogs,
  evaluationCriteria,
  hackathonRoleAssignments,
  hackathonTermsDocuments,
  hackathons,
  judgeAssignments,
  judgeCriterionScores,
  prizeEligibilitySnapshots,
  prizeRedemptions,
  prizes,
  submissions,
  teamMembers,
  teams,
  users
} from '../../../../server/database/schema'
import { createApiRouteTestHarness } from '../../../support/backend/api-route'

describe('TASK-3.8 shortlist, winner, redemption, and audit routes', () => {
  const harnesses: Array<ReturnType<typeof createApiRouteTestHarness>> = []

  afterEach(async () => {
    vi.unstubAllGlobals()

    while (harnesses.length > 0) {
      await harnesses.pop()?.d1Database.close()
    }
  })

  async function seedOutcomeHackathon(
    harness: ReturnType<typeof createApiRouteTestHarness>,
    options?: {
      state?: 'judge_review' | 'shortlist' | 'winners_announced'
      withPrizes?: boolean
    }
  ) {
    const state = options?.state ?? 'judge_review'

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
        id: 'team_admin_one',
        auth0Subject: 'auth0|team_admin_one',
        email: 'team-admin-one@example.com',
        displayName: 'Team Admin One'
      },
      {
        id: 'team_admin_two',
        auth0Subject: 'auth0|team_admin_two',
        email: 'team-admin-two@example.com',
        displayName: 'Team Admin Two'
      }
    ])

    await harness.database.insert(hackathons).values({
      id: 'hackathon_1',
      name: 'Outcome Hackathon',
      slug: 'outcome-hackathon',
      description: 'Outcome hackathon',
      city: 'Vienna',
      address: 'Address',
      registrationOpensAt: '2026-03-10T12:00:00.000Z',
      registrationClosesAt: '2026-03-12T12:00:00.000Z',
      submissionOpensAt: '2026-03-12T12:00:00.000Z',
      submissionClosesAt: '2026-03-14T12:00:00.000Z',
      state,
      maxTeamMembers: 5,
      createdByUserId: 'platform_admin'
    })

    await harness.database.insert(hackathonTermsDocuments).values({
      id: 'terms_winner_1',
      hackathonId: 'hackathon_1',
      documentType: 'winner_terms',
      version: 1,
      title: 'Winner Terms',
      content: 'Winner terms',
      publishedAt: '2026-03-10T12:00:00.000Z',
      createdAt: '2026-03-10T12:00:00.000Z'
    })

    await harness.database
      .update(hackathons)
      .set({
        currentWinnerTermsDocumentId: 'terms_winner_1'
      })
      .where(eq(hackathons.id, 'hackathon_1'))

    await harness.database.insert(hackathonRoleAssignments).values([
      {
        id: 'role_admin',
        hackathonId: 'hackathon_1',
        userId: 'hackathon_admin',
        role: 'hackathon_admin',
        isInJudgePool: false,
        createdAt: '2026-03-15T12:00:00.000Z'
      },
      {
        id: 'role_judge',
        hackathonId: 'hackathon_1',
        userId: 'judge_a',
        role: 'judge',
        isInJudgePool: true,
        createdAt: '2026-03-15T12:05:00.000Z'
      }
    ])

    await harness.database.insert(teams).values([
      {
        id: 'team_1',
        hackathonId: 'hackathon_1',
        name: 'Alpha Team',
        slug: 'alpha-team',
        isOpenToJoinRequests: false,
        createdByUserId: 'team_admin_one',
        createdAt: '2026-03-15T12:00:00.000Z',
        updatedAt: '2026-03-15T12:00:00.000Z'
      },
      {
        id: 'team_2',
        hackathonId: 'hackathon_1',
        name: 'Beta Team',
        slug: 'beta-team',
        isOpenToJoinRequests: false,
        createdByUserId: 'team_admin_two',
        createdAt: '2026-03-15T12:10:00.000Z',
        updatedAt: '2026-03-15T12:10:00.000Z'
      }
    ])

    await harness.database.insert(teamMembers).values([
      {
        id: 'membership_team_1_admin',
        teamId: 'team_1',
        userId: 'team_admin_one',
        role: 'admin',
        joinedAt: '2026-03-15T12:00:00.000Z',
        createdAt: '2026-03-15T12:00:00.000Z'
      },
      {
        id: 'membership_team_2_admin',
        teamId: 'team_2',
        userId: 'team_admin_two',
        role: 'admin',
        joinedAt: '2026-03-15T12:10:00.000Z',
        createdAt: '2026-03-15T12:10:00.000Z'
      }
    ])

    await harness.database.insert(submissions).values([
      {
        id: 'submission_1',
        teamId: 'team_1',
        status: 'locked',
        projectName: 'Alpha Project',
        summary: 'Alpha summary',
        repositoryUrl: 'https://example.com/alpha',
        demoUrl: 'https://example.com/alpha-demo',
        submittedAt: '2026-03-16T12:00:00.000Z',
        lockedAt: '2026-03-17T12:00:00.000Z',
        createdAt: '2026-03-16T12:00:00.000Z',
        updatedAt: '2026-03-17T12:00:00.000Z'
      },
      {
        id: 'submission_2',
        teamId: 'team_2',
        status: 'locked',
        projectName: 'Beta Project',
        summary: 'Beta summary',
        repositoryUrl: 'https://example.com/beta',
        demoUrl: 'https://example.com/beta-demo',
        submittedAt: '2026-03-16T12:05:00.000Z',
        lockedAt: '2026-03-17T12:00:00.000Z',
        createdAt: '2026-03-16T12:05:00.000Z',
        updatedAt: '2026-03-17T12:00:00.000Z'
      }
    ])

    await harness.database.insert(evaluationCriteria).values([
      {
        id: 'criterion_1',
        hackathonId: 'hackathon_1',
        name: 'Novelty',
        description: 'Novelty',
        weight: 50,
        displayOrder: 1,
        createdAt: '2026-03-15T12:00:00.000Z'
      },
      {
        id: 'criterion_2',
        hackathonId: 'hackathon_1',
        name: 'Execution',
        description: 'Execution',
        weight: 50,
        displayOrder: 2,
        createdAt: '2026-03-15T12:01:00.000Z'
      }
    ])

    await harness.database.insert(judgeAssignments).values([
      {
        id: 'assignment_1',
        hackathonId: 'hackathon_1',
        submissionId: 'submission_1',
        judgeUserId: 'judge_a',
        status: 'judge_completed',
        assignedAt: '2026-03-17T12:05:00.000Z',
        startedAt: '2026-03-17T12:06:00.000Z',
        completedAt: '2026-03-17T12:07:00.000Z',
        ineligibilityStatus: 'eligible',
        createdAt: '2026-03-17T12:05:00.000Z'
      },
      {
        id: 'assignment_2',
        hackathonId: 'hackathon_1',
        submissionId: 'submission_2',
        judgeUserId: 'judge_a',
        status: 'judge_completed',
        assignedAt: '2026-03-17T12:08:00.000Z',
        startedAt: '2026-03-17T12:09:00.000Z',
        completedAt: '2026-03-17T12:10:00.000Z',
        ineligibilityStatus: 'eligible',
        createdAt: '2026-03-17T12:08:00.000Z'
      }
    ])

    await harness.database.insert(judgeCriterionScores).values([
      {
        id: 'score_1',
        judgeAssignmentId: 'assignment_1',
        evaluationCriterionId: 'criterion_1',
        score: 9,
        comment: 'Strong novelty',
        createdAt: '2026-03-17T12:07:00.000Z',
        updatedAt: '2026-03-17T12:07:00.000Z'
      },
      {
        id: 'score_2',
        judgeAssignmentId: 'assignment_1',
        evaluationCriterionId: 'criterion_2',
        score: 8,
        comment: 'Strong execution',
        createdAt: '2026-03-17T12:07:00.000Z',
        updatedAt: '2026-03-17T12:07:00.000Z'
      },
      {
        id: 'score_3',
        judgeAssignmentId: 'assignment_2',
        evaluationCriterionId: 'criterion_1',
        score: 7,
        comment: 'Good novelty',
        createdAt: '2026-03-17T12:10:00.000Z',
        updatedAt: '2026-03-17T12:10:00.000Z'
      },
      {
        id: 'score_4',
        judgeAssignmentId: 'assignment_2',
        evaluationCriterionId: 'criterion_2',
        score: 6,
        comment: 'Good execution',
        createdAt: '2026-03-17T12:10:00.000Z',
        updatedAt: '2026-03-17T12:10:00.000Z'
      }
    ])

    await harness.database.insert(prizeEligibilitySnapshots).values([
      {
        id: 'snapshot_team_1_admin',
        hackathonId: 'hackathon_1',
        teamId: 'team_1',
        userId: 'team_admin_one',
        snapshotAt: '2026-03-17T12:00:00.000Z',
        createdAt: '2026-03-17T12:00:00.000Z'
      },
      {
        id: 'snapshot_team_2_admin',
        hackathonId: 'hackathon_1',
        teamId: 'team_2',
        userId: 'team_admin_two',
        snapshotAt: '2026-03-17T12:00:00.000Z',
        createdAt: '2026-03-17T12:00:00.000Z'
      }
    ])

    if (options?.withPrizes !== false) {
      await harness.database.insert(prizes).values([
        {
          id: 'prize_team_rank_1',
          hackathonId: 'hackathon_1',
          name: 'Grand Prize',
          description: 'Grand prize',
          rewardType: 'api_credits',
          rewardValue: '1000',
          rewardCurrency: 'USD',
          awardScope: 'team',
          rankStart: 1,
          rankEnd: 1,
          createdAt: '2026-03-17T12:15:00.000Z'
        },
        {
          id: 'prize_member_top_2',
          hackathonId: 'hackathon_1',
          name: 'Top Two Membership',
          description: 'Top two',
          rewardType: 'subscription',
          rewardValue: 'pro',
          rewardCurrency: null,
          awardScope: 'member',
          rankStart: 1,
          rankEnd: 2,
          createdAt: '2026-03-17T12:16:00.000Z'
        }
      ])
    }
  }

  test('admins can move a hackathon to shortlist and judges can read the computed leaderboard', async () => {
    const harness = createApiRouteTestHarness({
      routes: [
        {
          method: 'post',
          path: '/api/hackathons/:hackathonId/actions/start-shortlist',
          handler: startShortlistHandler
        },
        {
          method: 'get',
          path: '/api/hackathons/:hackathonId/leaderboard',
          handler: listLeaderboardHandler
        }
      ],
      sessionUser: {
        sub: 'auth0|hackathon_admin',
        email: 'hackathon-admin@example.com'
      }
    })
    harnesses.push(harness)

    await seedOutcomeHackathon(harness, { state: 'judge_review' })

    const moveResponse = await harness.request('/api/hackathons/hackathon_1/actions/start-shortlist', {
      method: 'POST'
    })

    expect(moveResponse.status).toBe(200)
    expect(await moveResponse.json()).toMatchObject({
      data: {
        id: 'hackathon_1',
        state: 'shortlist'
      }
    })

    const leaderboardResponse = await harness.request('/api/hackathons/hackathon_1/leaderboard')

    expect(leaderboardResponse.status).toBe(200)
    expect(await leaderboardResponse.json()).toMatchObject({
      data: [
        expect.objectContaining({
          submissionId: 'submission_1',
          rank: 1,
          scoreTotal: 850
        }),
        expect.objectContaining({
          submissionId: 'submission_2',
          rank: 2,
          scoreTotal: 650
        })
      ]
    })

    const auditEntries = await harness.database.select().from(auditLogs)
    expect(auditEntries).toEqual(expect.arrayContaining([
      expect.objectContaining({
        action: 'hackathon.start_shortlist'
      })
    ]))
  })

  test('shortlist reorder changes final order without mutating the underlying leaderboard scores', async () => {
    const harness = createApiRouteTestHarness({
      routes: [
        {
          method: 'post',
          path: '/api/hackathons/:hackathonId/shortlist/actions/reorder',
          handler: reorderShortlistHandler
        },
        {
          method: 'get',
          path: '/api/hackathons/:hackathonId/shortlist',
          handler: listShortlistHandler
        },
        {
          method: 'get',
          path: '/api/hackathons/:hackathonId/leaderboard',
          handler: listLeaderboardHandler
        }
      ],
      sessionUser: {
        sub: 'auth0|hackathon_admin',
        email: 'hackathon-admin@example.com'
      }
    })
    harnesses.push(harness)

    await seedOutcomeHackathon(harness, { state: 'shortlist' })

    const reorderResponse = await harness.request('/api/hackathons/hackathon_1/shortlist/actions/reorder', {
      method: 'POST',
      body: JSON.stringify({
        orderedSubmissionIds: ['submission_2', 'submission_1']
      })
    })

    expect(reorderResponse.status).toBe(200)
    expect(await reorderResponse.json()).toMatchObject({
      data: [
        expect.objectContaining({
          submissionId: 'submission_2',
          finalRank: 1
        }),
        expect.objectContaining({
          submissionId: 'submission_1',
          finalRank: 2
        })
      ]
    })

    const leaderboardResponse = await harness.request('/api/hackathons/hackathon_1/leaderboard')

    expect(leaderboardResponse.status).toBe(200)
    expect(await leaderboardResponse.json()).toMatchObject({
      data: [
        expect.objectContaining({
          submissionId: 'submission_1',
          rank: 1,
          scoreTotal: 850
        }),
        expect.objectContaining({
          submissionId: 'submission_2',
          rank: 2,
          scoreTotal: 650
        })
      ]
    })
  })

  test('announcing winners creates prize redemptions and public winners become visible', async () => {
    const adminHarness = createApiRouteTestHarness({
      routes: [
        {
          method: 'post',
          path: '/api/hackathons/:hackathonId/actions/announce-winners',
          handler: announceWinnersHandler
        }
      ],
      sessionUser: {
        sub: 'auth0|hackathon_admin',
        email: 'hackathon-admin@example.com'
      }
    })
    harnesses.push(adminHarness)

    await seedOutcomeHackathon(adminHarness, { state: 'shortlist' })

    const announceResponse = await adminHarness.request('/api/hackathons/hackathon_1/actions/announce-winners', {
      method: 'POST'
    })

    expect(announceResponse.status).toBe(200)
    expect(await announceResponse.json()).toMatchObject({
      data: {
        id: 'hackathon_1',
        state: 'winners_announced'
      }
    })

    const redemptionRows = await adminHarness.database.select().from(prizeRedemptions)
    expect(redemptionRows).toHaveLength(3)
    expect(redemptionRows).toEqual(expect.arrayContaining([
      expect.objectContaining({
        prizeId: 'prize_team_rank_1',
        teamId: 'team_1',
        userId: null,
        status: 'pending'
      }),
      expect.objectContaining({
        prizeId: 'prize_member_top_2',
        teamId: 'team_1',
        userId: 'team_admin_one',
        status: 'pending'
      }),
      expect.objectContaining({
        prizeId: 'prize_member_top_2',
        teamId: 'team_2',
        userId: 'team_admin_two',
        status: 'pending'
      })
    ]))

    const publicHarness = createApiRouteTestHarness({
      routes: [
        {
          method: 'get',
          path: '/api/hackathons/:hackathonId/winners',
          handler: listWinnersHandler
        }
      ]
    })
    harnesses.push(publicHarness)
    await seedOutcomeHackathon(publicHarness, { state: 'winners_announced' })

    const winnersResponse = await publicHarness.request('/api/hackathons/hackathon_1/winners')

    expect(winnersResponse.status).toBe(200)
    expect(await winnersResponse.json()).toMatchObject({
      data: [
        expect.objectContaining({
          teamId: 'team_1',
          finalRank: 1,
          prizes: expect.arrayContaining([
            expect.objectContaining({ id: 'prize_team_rank_1' }),
            expect.objectContaining({ id: 'prize_member_top_2' })
          ])
        }),
        expect.objectContaining({
          teamId: 'team_2',
          finalRank: 2,
          prizes: expect.arrayContaining([
            expect.objectContaining({ id: 'prize_member_top_2' })
          ])
        })
      ]
    })
  })

  test('team admins can view and redeem their pending prize redemptions with exact winner terms acceptance', async () => {
    const harness = createApiRouteTestHarness({
      routes: [
        {
          method: 'get',
          path: '/api/prize-redemptions/me',
          handler: listOwnPrizeRedemptionsHandler
        },
        {
          method: 'post',
          path: '/api/prize-redemptions/:redemptionId/actions/redeem',
          handler: redeemPrizeRedemptionHandler
        }
      ],
      sessionUser: {
        sub: 'auth0|team_admin_one',
        email: 'team-admin-one@example.com'
      }
    })
    harnesses.push(harness)

    await seedOutcomeHackathon(harness, { state: 'winners_announced' })
    await harness.database.insert(prizeRedemptions).values([
      {
        id: 'redemption_team_scope',
        prizeId: 'prize_team_rank_1',
        userId: null,
        teamId: 'team_1',
        status: 'pending',
        createdAt: '2026-03-18T12:00:00.000Z',
        updatedAt: '2026-03-18T12:00:00.000Z'
      },
      {
        id: 'redemption_member_scope',
        prizeId: 'prize_member_top_2',
        userId: 'team_admin_one',
        teamId: 'team_1',
        status: 'pending',
        createdAt: '2026-03-18T12:01:00.000Z',
        updatedAt: '2026-03-18T12:01:00.000Z'
      }
    ])

    const listResponse = await harness.request('/api/prize-redemptions/me')

    expect(listResponse.status).toBe(200)
    expect(await listResponse.json()).toMatchObject({
      data: [
        expect.objectContaining({
          id: 'redemption_team_scope'
        }),
        expect.objectContaining({
          id: 'redemption_member_scope'
        })
      ]
    })

    const redeemResponse = await harness.request('/api/prize-redemptions/redemption_team_scope/actions/redeem', {
      method: 'POST',
      body: JSON.stringify({
        legalName: 'Alex Team Lead',
        winnerTermsDocumentId: 'terms_winner_1'
      })
    })

    expect(redeemResponse.status).toBe(200)
    expect(await redeemResponse.json()).toMatchObject({
      data: {
        id: 'redemption_team_scope',
        status: 'redeemed',
        userId: 'team_admin_one',
        legalName: 'Alex Team Lead',
        winnerTermsDocumentId: 'terms_winner_1'
      }
    })
  })

  test('hackathon and platform audit routes expose restricted operational audit reads', async () => {
    const hackathonHarness = createApiRouteTestHarness({
      routes: [
        {
          method: 'get',
          path: '/api/hackathons/:hackathonId/audit',
          handler: listHackathonAuditHandler
        }
      ],
      sessionUser: {
        sub: 'auth0|hackathon_admin',
        email: 'hackathon-admin@example.com'
      }
    })
    harnesses.push(hackathonHarness)

    await seedOutcomeHackathon(hackathonHarness, { state: 'winners_announced' })
    await hackathonHarness.database.insert(auditLogs).values([
      {
        id: 'audit_hackathon_scope',
        actorUserId: 'hackathon_admin',
        entityType: 'hackathon',
        entityId: 'hackathon_1',
        action: 'hackathon.announce_winners',
        metadata: {
          hackathonId: 'hackathon_1'
        },
        createdAt: '2026-03-18T13:00:00.000Z'
      },
      {
        id: 'audit_platform_scope',
        actorUserId: 'platform_admin',
        entityType: 'account',
        entityId: 'user_123',
        action: 'account.deleted',
        metadata: {},
        createdAt: '2026-03-18T13:05:00.000Z'
      }
    ])

    const hackathonAuditResponse = await hackathonHarness.request('/api/hackathons/hackathon_1/audit')

    expect(hackathonAuditResponse.status).toBe(200)
    expect(await hackathonAuditResponse.json()).toMatchObject({
      data: [
        expect.objectContaining({
          id: 'audit_hackathon_scope'
        })
      ]
    })

    const platformHarness = createApiRouteTestHarness({
      routes: [
        {
          method: 'get',
          path: '/api/audit',
          handler: listPlatformAuditHandler
        }
      ],
      sessionUser: {
        sub: 'auth0|platform_admin',
        email: 'platform-admin@example.com'
      }
    })
    harnesses.push(platformHarness)
    await seedOutcomeHackathon(platformHarness, { state: 'winners_announced' })
    await platformHarness.database.insert(auditLogs).values([
      {
        id: 'audit_hackathon_scope',
        actorUserId: 'hackathon_admin',
        entityType: 'hackathon',
        entityId: 'hackathon_1',
        action: 'hackathon.announce_winners',
        metadata: {
          hackathonId: 'hackathon_1'
        },
        createdAt: '2026-03-18T13:00:00.000Z'
      },
      {
        id: 'audit_platform_scope',
        actorUserId: 'platform_admin',
        entityType: 'account',
        entityId: 'user_123',
        action: 'account.deleted',
        metadata: {},
        createdAt: '2026-03-18T13:05:00.000Z'
      }
    ])

    const platformAuditResponse = await platformHarness.request('/api/audit')

    expect(platformAuditResponse.status).toBe(200)
    expect(await platformAuditResponse.json()).toMatchObject({
      data: expect.arrayContaining([
        expect.objectContaining({ id: 'audit_hackathon_scope' }),
        expect.objectContaining({ id: 'audit_platform_scope' })
      ])
    })
  })

  test('hackathons can be completed only after winners are announced', async () => {
    const harness = createApiRouteTestHarness({
      routes: [
        {
          method: 'post',
          path: '/api/hackathons/:hackathonId/actions/complete',
          handler: completeHackathonHandler
        }
      ],
      sessionUser: {
        sub: 'auth0|platform_admin',
        email: 'platform-admin@example.com'
      }
    })
    harnesses.push(harness)

    await seedOutcomeHackathon(harness, { state: 'winners_announced' })

    const response = await harness.request('/api/hackathons/hackathon_1/actions/complete', {
      method: 'POST'
    })

    expect(response.status).toBe(200)
    expect(await response.json()).toMatchObject({
      data: {
        id: 'hackathon_1',
        state: 'completed'
      }
    })

    const updatedHackathon = await harness.database.query.hackathons.findFirst({
      where: eq(hackathons.id, 'hackathon_1')
    })
    expect(updatedHackathon?.state).toBe('completed')
  })
})
