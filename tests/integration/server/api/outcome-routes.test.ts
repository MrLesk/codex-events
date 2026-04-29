import { afterEach, describe, expect, test, vi } from 'vitest'

import { eq } from 'drizzle-orm'

import listPlatformAuditHandler from '../../../../server/api/audit/index.get'
import announceWinnersHandler from '../../../../server/api/hackathons/[hackathonId]/actions/announce-winners.post'
import completeHackathonHandler from '../../../../server/api/hackathons/[hackathonId]/actions/complete.post'
import startFinalDeliberationHandler from '../../../../server/api/hackathons/[hackathonId]/actions/start-final-deliberation.post'
import startPitchHandler from '../../../../server/api/hackathons/[hackathonId]/actions/start-pitch.post'
import advancePitchPresentationHandler from '../../../../server/api/hackathons/[hackathonId]/actions/advance-pitch-presentation.post'
import startPitchReviewHandler from '../../../../server/api/hackathons/[hackathonId]/actions/start-pitch-review.post'
import startShortlistHandler from '../../../../server/api/hackathons/[hackathonId]/actions/start-shortlist.post'
import listHackathonAuditHandler from '../../../../server/api/hackathons/[hackathonId]/audit/index.get'
import listFinalDeliberationHandler from '../../../../server/api/hackathons/[hackathonId]/final-deliberation/index.get'
import listLeaderboardHandler from '../../../../server/api/hackathons/[hackathonId]/leaderboard/index.get'
import listHackathonPrizeRedemptionsHandler from '../../../../server/api/hackathons/[hackathonId]/prize-redemptions/index.get'
import listPublishedProjectsHandler from '../../../../server/api/hackathons/[hackathonId]/published-projects/index.get'
import reorderFinalDeliberationHandler from '../../../../server/api/hackathons/[hackathonId]/final-deliberation/actions/reorder.post'
import selectFinalistsHandler from '../../../../server/api/hackathons/[hackathonId]/shortlist/actions/select-finalists.post'
import listShortlistHandler from '../../../../server/api/hackathons/[hackathonId]/shortlist/index.get'
import disqualifySubmissionHandler from '../../../../server/api/hackathons/[hackathonId]/teams/[teamId]/submission/actions/disqualify.post'
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

  function createQueueProducerStub(options?: {
    failSend?: boolean
  }) {
    const send = vi.fn(async () => {
      if (options?.failSend) {
        throw new Error('queue unavailable')
      }
    })

    return {
      send
    }
  }

  afterEach(async () => {
    vi.unstubAllGlobals()

    while (harnesses.length > 0) {
      await harnesses.pop()?.d1Database.close()
    }
  })

  async function seedOutcomeHackathon(
    harness: ReturnType<typeof createApiRouteTestHarness>,
    options?: {
      state?: 'blind_review' | 'shortlist' | 'pitch' | 'pitch_review' | 'final_deliberation' | 'winners_announced'
      withPrizes?: boolean
      blindReviewCount?: 0 | 1 | 2
      pitchReviewEnabled?: boolean
      blindScoreWeightPercent?: number
      pitchScoreWeightPercent?: number
      shortlistFinalistCount?: number
      pitchFinalistSubmissionIdsJson?: string
      finalRankingSubmissionIdsJson?: string
    }
  ) {
    const state = options?.state ?? 'blind_review'
    const blindReviewCount = options?.blindReviewCount ?? 2
    const pitchReviewEnabled = options?.pitchReviewEnabled ?? true
    const blindScoreWeightPercent = options?.blindScoreWeightPercent ?? (blindReviewCount === 0 ? 0 : 70)
    const pitchScoreWeightPercent = options?.pitchScoreWeightPercent ?? (pitchReviewEnabled
      ? (blindReviewCount === 0 ? 100 : 30)
      : 0)

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
        id: 'team_admin_one',
        auth0Subject: 'auth0|team_admin_one',
        email: 'team-admin-one@example.com',
        displayName: 'Team Admin One',
        chatgptEmail: 'team-admin-one@chatgpt.example',
        openaiOrgId: 'org_team_admin_one'
      },
      {
        id: 'team_admin_two',
        auth0Subject: 'auth0|team_admin_two',
        email: 'team-admin-two@example.com',
        displayName: 'Team Admin Two',
        chatgptEmail: 'team-admin-two@chatgpt.example',
        openaiOrgId: 'org_team_admin_two'
      }
    ])

    await harness.database.insert(hackathons).values({
      id: 'hackathon_1',
      name: 'Outcome Hackathon',
      slug: 'outcome-hackathon',
      description: 'Outcome hackathon',
      city: 'Vienna',
      country: 'Austria',
      address: 'Address',
      registrationOpensAt: '2026-03-10T12:00:00.000Z',
      registrationClosesAt: '2026-03-12T12:00:00.000Z',
      submissionOpensAt: '2026-03-12T12:00:00.000Z',
      submissionClosesAt: '2026-03-14T12:00:00.000Z',
      state,
      blindReviewCount,
      pitchReviewEnabled,
      blindScoreWeightPercent,
      pitchScoreWeightPercent,
      shortlistFinalistCount: options?.shortlistFinalistCount ?? 10,
      pitchFinalistSubmissionIdsJson: options?.pitchFinalistSubmissionIdsJson ?? '[]',
      finalRankingSubmissionIdsJson: options?.finalRankingSubmissionIdsJson ?? '[]',
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
      },
      {
        id: 'role_judge_b',
        hackathonId: 'hackathon_1',
        userId: 'judge_b',
        role: 'judge',
        isInJudgePool: true,
        createdAt: '2026-03-15T12:06:00.000Z'
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

    if (blindReviewCount > 0) {
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
        },
        {
          id: 'assignment_3',
          hackathonId: 'hackathon_1',
          submissionId: 'submission_1',
          judgeUserId: 'judge_b',
          status: 'judge_completed',
          assignedAt: '2026-03-17T12:11:00.000Z',
          startedAt: '2026-03-17T12:12:00.000Z',
          completedAt: '2026-03-17T12:13:00.000Z',
          ineligibilityStatus: 'eligible',
          createdAt: '2026-03-17T12:11:00.000Z'
        },
        {
          id: 'assignment_4',
          hackathonId: 'hackathon_1',
          submissionId: 'submission_2',
          judgeUserId: 'judge_b',
          status: 'judge_completed',
          assignedAt: '2026-03-17T12:14:00.000Z',
          startedAt: '2026-03-17T12:15:00.000Z',
          completedAt: '2026-03-17T12:16:00.000Z',
          ineligibilityStatus: 'eligible',
          createdAt: '2026-03-17T12:14:00.000Z'
        }
      ])

      await harness.database.insert(judgeCriterionScores).values([
        {
          id: 'score_1',
          judgeAssignmentId: 'assignment_1',
          evaluationCriterionId: 'criterion_1',
          score: 5,
          comment: 'Strong novelty',
          createdAt: '2026-03-17T12:07:00.000Z',
          updatedAt: '2026-03-17T12:07:00.000Z'
        },
        {
          id: 'score_2',
          judgeAssignmentId: 'assignment_1',
          evaluationCriterionId: 'criterion_2',
          score: 4,
          comment: 'Strong execution',
          createdAt: '2026-03-17T12:07:00.000Z',
          updatedAt: '2026-03-17T12:07:00.000Z'
        },
        {
          id: 'score_3',
          judgeAssignmentId: 'assignment_2',
          evaluationCriterionId: 'criterion_1',
          score: 4,
          comment: 'Good novelty',
          createdAt: '2026-03-17T12:10:00.000Z',
          updatedAt: '2026-03-17T12:10:00.000Z'
        },
        {
          id: 'score_4',
          judgeAssignmentId: 'assignment_2',
          evaluationCriterionId: 'criterion_2',
          score: 3,
          comment: 'Good execution',
          createdAt: '2026-03-17T12:10:00.000Z',
          updatedAt: '2026-03-17T12:10:00.000Z'
        },
        {
          id: 'score_5',
          judgeAssignmentId: 'assignment_3',
          evaluationCriterionId: 'criterion_1',
          score: 4,
          comment: 'Clear novelty',
          createdAt: '2026-03-17T12:13:00.000Z',
          updatedAt: '2026-03-17T12:13:00.000Z'
        },
        {
          id: 'score_6',
          judgeAssignmentId: 'assignment_3',
          evaluationCriterionId: 'criterion_2',
          score: 3,
          comment: 'Clear execution',
          createdAt: '2026-03-17T12:13:00.000Z',
          updatedAt: '2026-03-17T12:13:00.000Z'
        },
        {
          id: 'score_7',
          judgeAssignmentId: 'assignment_4',
          evaluationCriterionId: 'criterion_1',
          score: 4,
          comment: 'Steady novelty',
          createdAt: '2026-03-17T12:16:00.000Z',
          updatedAt: '2026-03-17T12:16:00.000Z'
        },
        {
          id: 'score_8',
          judgeAssignmentId: 'assignment_4',
          evaluationCriterionId: 'criterion_2',
          score: 3,
          comment: 'Steady execution',
          createdAt: '2026-03-17T12:16:00.000Z',
          updatedAt: '2026-03-17T12:16:00.000Z'
        }
      ])
    }

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

  async function seedPitchAssignments(
    harness: ReturnType<typeof createApiRouteTestHarness>,
    assignments: Array<{
      id: string
      submissionId: string
      judgeUserId: string
      status: 'assigned' | 'judge_started' | 'judge_completed'
      pitchScore: number | null
      assignedAt: string
      startedAt?: string
      completedAt?: string
    }>
  ) {
    await harness.database.insert(judgeAssignments).values(
      assignments.map(assignment => ({
        id: assignment.id,
        hackathonId: 'hackathon_1',
        submissionId: assignment.submissionId,
        judgeUserId: assignment.judgeUserId,
        reviewStage: 'pitch_review',
        blindReviewSlot: null,
        status: assignment.status,
        pitchScore: assignment.pitchScore,
        assignedAt: assignment.assignedAt,
        startedAt: assignment.startedAt ?? null,
        completedAt: assignment.completedAt ?? null,
        ineligibilityStatus: 'eligible',
        createdAt: assignment.assignedAt
      }))
    )
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

    await seedOutcomeHackathon(harness, {
      state: 'blind_review',
      shortlistFinalistCount: 1
    })
    await harness.database
      .update(hackathons)
      .set({
        pitchFinalistSubmissionIdsJson: JSON.stringify(['submission_2']),
        finalRankingSubmissionIdsJson: JSON.stringify(['submission_2', 'submission_1'])
      })
      .where(eq(hackathons.id, 'hackathon_1'))

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
    const updatedHackathon = await harness.database.query.hackathons.findFirst({
      where: eq(hackathons.id, 'hackathon_1')
    })
    expect(updatedHackathon?.pitchFinalistSubmissionIdsJson).toBe('[]')
    expect(updatedHackathon?.finalRankingSubmissionIdsJson).toBe('[]')

    const leaderboardResponse = await harness.request('/api/hackathons/hackathon_1/leaderboard')

    expect(leaderboardResponse.status).toBe(200)
    expect(await leaderboardResponse.json()).toMatchObject({
      data: [
        expect.objectContaining({
          submissionId: 'submission_1',
          rank: 1,
          scoreTotal: 4
        }),
        expect.objectContaining({
          submissionId: 'submission_2',
          rank: 2,
          scoreTotal: 3.5
        })
      ]
    })

    const auditEntries = await harness.database.select().from(auditLogs)
    expect(auditEntries).toEqual(expect.arrayContaining([
      expect.objectContaining({
        action: 'hackathon.start_shortlist',
        metadata: expect.objectContaining({
          rankedSubmissionCount: 2
        })
      })
    ]))
  })

  test('shortlist view derives the default finalist boundary until shortlist is saved', async () => {
    const harness = createApiRouteTestHarness({
      routes: [
        {
          method: 'get',
          path: '/api/hackathons/:hackathonId/shortlist',
          handler: listShortlistHandler
        }
      ],
      sessionUser: {
        sub: 'auth0|hackathon_admin',
        email: 'hackathon-admin@example.com'
      }
    })
    harnesses.push(harness)

    await seedOutcomeHackathon(harness, {
      state: 'shortlist',
      shortlistFinalistCount: 1,
      pitchFinalistSubmissionIdsJson: JSON.stringify(['submission_2']),
      finalRankingSubmissionIdsJson: '[]'
    })

    const shortlistResponse = await harness.request('/api/hackathons/hackathon_1/shortlist')

    expect(shortlistResponse.status).toBe(200)
    expect(await shortlistResponse.json()).toMatchObject({
      data: [
        expect.objectContaining({
          submissionId: 'submission_1',
          rank: 1,
          isPitchFinalist: true,
          pitchFinalistRank: 1
        }),
        expect.objectContaining({
          submissionId: 'submission_2',
          rank: 2,
          isPitchFinalist: false,
          pitchFinalistRank: null
        })
      ],
      meta: expect.objectContaining({
        total: 2,
        hasSavedShortlistSelection: false
      })
    })
  })

  test('leaderboard and shortlist stay available when shortlist includes more than 100 blind assignment ids', async () => {
    const harness = createApiRouteTestHarness({
      routes: [
        {
          method: 'get',
          path: '/api/hackathons/:hackathonId/leaderboard',
          handler: listLeaderboardHandler
        },
        {
          method: 'get',
          path: '/api/hackathons/:hackathonId/shortlist',
          handler: listShortlistHandler
        }
      ],
      sessionUser: {
        sub: 'auth0|hackathon_admin',
        email: 'hackathon-admin@example.com'
      }
    })
    harnesses.push(harness)

    await seedOutcomeHackathon(harness, {
      state: 'shortlist',
      shortlistFinalistCount: 1,
      pitchFinalistSubmissionIdsJson: '[]',
      finalRankingSubmissionIdsJson: '[]'
    })

    const skippedAssignments = Array.from({ length: 97 }, (_, index) => {
      const assignedAt = new Date(Date.UTC(2026, 2, 18, 0, index, 0)).toISOString()

      return {
        id: `skipped_assignment_${index + 1}`,
        hackathonId: 'hackathon_1',
        submissionId: index % 2 === 0 ? 'submission_1' : 'submission_2',
        judgeUserId: index % 2 === 0 ? 'judge_a' : 'judge_b',
        reviewStage: 'blind_review' as const,
        blindReviewSlot: (index % 2) + 1,
        status: 'skipped' as const,
        pitchScore: null,
        assignedAt,
        startedAt: null,
        completedAt: null,
        skippedAt: assignedAt,
        skippedByUserId: index % 2 === 0 ? 'judge_a' : 'judge_b',
        skipReason: 'manual reassignment',
        ineligibilityStatus: 'eligible' as const,
        createdAt: assignedAt
      }
    })

    await harness.database.insert(judgeAssignments).values(skippedAssignments)

    const [leaderboardResponse, shortlistResponse] = await Promise.all([
      harness.request('/api/hackathons/hackathon_1/leaderboard'),
      harness.request('/api/hackathons/hackathon_1/shortlist')
    ])

    expect(leaderboardResponse.status).toBe(200)
    expect(await leaderboardResponse.json()).toMatchObject({
      data: [
        expect.objectContaining({
          submissionId: 'submission_1',
          rank: 1,
          scoreTotal: 4
        }),
        expect.objectContaining({
          submissionId: 'submission_2',
          rank: 2,
          scoreTotal: 3.5
        })
      ]
    })

    expect(shortlistResponse.status).toBe(200)
    expect(await shortlistResponse.json()).toMatchObject({
      data: [
        expect.objectContaining({
          submissionId: 'submission_1',
          rank: 1,
          isPitchFinalist: true,
          pitchFinalistRank: 1
        }),
        expect.objectContaining({
          submissionId: 'submission_2',
          rank: 2,
          isPitchFinalist: false,
          pitchFinalistRank: null
        })
      ],
      meta: expect.objectContaining({
        total: 2,
        hasSavedShortlistSelection: false
      })
    })
  })

  test('derived shortlist order follows blind rank instead of team-name order', async () => {
    const harness = createApiRouteTestHarness({
      routes: [
        {
          method: 'get',
          path: '/api/hackathons/:hackathonId/shortlist',
          handler: listShortlistHandler
        }
      ],
      sessionUser: {
        sub: 'auth0|hackathon_admin',
        email: 'hackathon-admin@example.com'
      }
    })
    harnesses.push(harness)

    await seedOutcomeHackathon(harness, {
      state: 'shortlist',
      shortlistFinalistCount: 1,
      pitchFinalistSubmissionIdsJson: '[]',
      finalRankingSubmissionIdsJson: '[]'
    })
    await harness.database
      .update(teams)
      .set({
        name: 'Aardvark Team',
        slug: 'aardvark-team'
      })
      .where(eq(teams.id, 'team_2'))

    const shortlistResponse = await harness.request('/api/hackathons/hackathon_1/shortlist')

    expect(shortlistResponse.status).toBe(200)
    expect(await shortlistResponse.json()).toMatchObject({
      data: [
        expect.objectContaining({
          submissionId: 'submission_1',
          rank: 1,
          scoreTotal: 4,
          isPitchFinalist: true,
          pitchFinalistRank: 1
        }),
        expect.objectContaining({
          submissionId: 'submission_2',
          rank: 2,
          scoreTotal: 3.5,
          isPitchFinalist: false,
          pitchFinalistRank: null
        })
      ]
    })
  })

  test('shortlist save persists the full blind order and the finalist boundary while shortlist stays blind', async () => {
    const harness = createApiRouteTestHarness({
      routes: [
        {
          method: 'post',
          path: '/api/hackathons/:hackathonId/shortlist/actions/select-finalists',
          handler: selectFinalistsHandler
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

    const selectResponse = await harness.request('/api/hackathons/hackathon_1/shortlist/actions/select-finalists', {
      method: 'POST',
      body: JSON.stringify({
        orderedSubmissionIds: ['submission_2', 'submission_1'],
        finalistSubmissionIds: ['submission_2']
      })
    })

    expect(selectResponse.status).toBe(200)
    expect(await selectResponse.json()).toMatchObject({
      data: [
        expect.objectContaining({
          submissionId: 'submission_2',
          projectName: 'Beta Project',
          summary: 'Beta summary',
          rank: 2,
          isPitchFinalist: true,
          pitchFinalistRank: 1
        }),
        expect.objectContaining({
          submissionId: 'submission_1',
          projectName: 'Alpha Project',
          summary: 'Alpha summary',
          rank: 1,
          isPitchFinalist: false,
          pitchFinalistRank: null
        })
      ]
    })
    const persistedHackathon = await harness.database.query.hackathons.findFirst({
      where: eq(hackathons.id, 'hackathon_1')
    })
    expect(persistedHackathon?.pitchFinalistSubmissionIdsJson).toBe(JSON.stringify(['submission_2']))
    expect(persistedHackathon?.finalRankingSubmissionIdsJson).toBe(JSON.stringify(['submission_2', 'submission_1']))
    const auditEntries = await harness.database.select().from(auditLogs)
    expect(auditEntries).toEqual(expect.arrayContaining([
      expect.objectContaining({
        action: 'hackathon.pitch_finalists_selected',
        metadata: expect.objectContaining({
          orderedSubmissionIds: ['submission_2', 'submission_1'],
          finalistSubmissionIds: ['submission_2'],
          finalistSubmissionCount: 1
        })
      })
    ]))

    const shortlistResponse = await harness.request('/api/hackathons/hackathon_1/shortlist')

    expect(shortlistResponse.status).toBe(200)
    const shortlistPayload = await shortlistResponse.json() as {
      data: Array<Record<string, unknown>>
    }
    expect(shortlistPayload).toMatchObject({
      data: [
        expect.objectContaining({
          submissionId: 'submission_2',
          rank: 2,
          isPitchFinalist: true,
          pitchFinalistRank: 1
        }),
        expect.objectContaining({
          submissionId: 'submission_1',
          rank: 1,
          isPitchFinalist: false,
          pitchFinalistRank: null
        })
      ],
      meta: expect.objectContaining({
        total: 2,
        hasSavedShortlistSelection: true
      })
    })
    expect(shortlistPayload.data[0]).not.toHaveProperty('teamId')
    expect(shortlistPayload.data[0]).not.toHaveProperty('teamName')

    const leaderboardResponse = await harness.request('/api/hackathons/hackathon_1/leaderboard')

    expect(leaderboardResponse.status).toBe(200)
    expect(await leaderboardResponse.json()).toMatchObject({
      data: [
        expect.objectContaining({
          submissionId: 'submission_1',
          rank: 1,
          scoreTotal: 4
        }),
        expect.objectContaining({
          submissionId: 'submission_2',
          rank: 2,
          scoreTotal: 3.5
        })
      ]
    })
  })

  test('disqualifying a persisted shortlist finalist prunes stored finalists and still allows pitch review to start', async () => {
    const harness = createApiRouteTestHarness({
      routes: [
        {
          method: 'post',
          path: '/api/hackathons/:hackathonId/teams/:teamId/submission/actions/disqualify',
          handler: disqualifySubmissionHandler
        },
        {
          method: 'get',
          path: '/api/hackathons/:hackathonId/shortlist',
          handler: listShortlistHandler
        },
        {
          method: 'post',
          path: '/api/hackathons/:hackathonId/actions/start-pitch',
          handler: startPitchHandler
        },
        {
          method: 'post',
          path: '/api/hackathons/:hackathonId/actions/advance-pitch-presentation',
          handler: advancePitchPresentationHandler
        },
        {
          method: 'post',
          path: '/api/hackathons/:hackathonId/actions/start-pitch-review',
          handler: startPitchReviewHandler
        }
      ],
      sessionUser: {
        sub: 'auth0|hackathon_admin',
        email: 'hackathon-admin@example.com'
      }
    })
    harnesses.push(harness)

    await seedOutcomeHackathon(harness, {
      state: 'shortlist',
      pitchFinalistSubmissionIdsJson: JSON.stringify(['submission_1', 'submission_2']),
      finalRankingSubmissionIdsJson: JSON.stringify(['submission_1', 'submission_2'])
    })

    const disqualifyResponse = await harness.request('/api/hackathons/hackathon_1/teams/team_1/submission/actions/disqualify', {
      method: 'POST',
      body: JSON.stringify({
        reason: 'Rule violation'
      })
    })

    expect(disqualifyResponse.status).toBe(200)

    const storedHackathon = await harness.database.query.hackathons.findFirst({
      where: eq(hackathons.id, 'hackathon_1')
    })
    expect(storedHackathon?.pitchFinalistSubmissionIdsJson).toBe(JSON.stringify(['submission_2']))
    expect(storedHackathon?.finalRankingSubmissionIdsJson).toBe(JSON.stringify(['submission_2']))

    const shortlistResponse = await harness.request('/api/hackathons/hackathon_1/shortlist')

    expect(shortlistResponse.status).toBe(200)
    expect(await shortlistResponse.json()).toMatchObject({
      data: [
        expect.objectContaining({
          submissionId: 'submission_2',
          rank: 1,
          isPitchFinalist: true,
          pitchFinalistRank: 1
        })
      ]
    })

    const startPitchResponse = await harness.request('/api/hackathons/hackathon_1/actions/start-pitch', {
      method: 'POST'
    })

    expect(startPitchResponse.status).toBe(200)

    const firstAdvanceResponse = await harness.request('/api/hackathons/hackathon_1/actions/advance-pitch-presentation', {
      method: 'POST'
    })

    expect(firstAdvanceResponse.status).toBe(200)

    const secondAdvanceResponse = await harness.request('/api/hackathons/hackathon_1/actions/advance-pitch-presentation', {
      method: 'POST'
    })

    expect(secondAdvanceResponse.status).toBe(200)

    const startPitchReviewResponse = await harness.request('/api/hackathons/hackathon_1/actions/start-pitch-review', {
      method: 'POST'
    })

    expect(startPitchReviewResponse.status).toBe(200)
    const pitchAssignments = await harness.database.select().from(judgeAssignments)
    expect(
      pitchAssignments
        .filter(assignment => assignment.reviewStage === 'pitch_review')
        .map(assignment => assignment.submissionId)
        .sort()
    ).toEqual(['submission_2', 'submission_2'])
  })

  test('starting pitch from shortlist enqueues shortlist emails for each active finalist team member', async () => {
    const queueProducer = createQueueProducerStub()
    const harness = createApiRouteTestHarness({
      routes: [
        {
          method: 'post',
          path: '/api/hackathons/:hackathonId/actions/start-pitch',
          handler: startPitchHandler
        }
      ],
      sessionUser: {
        sub: 'auth0|hackathon_admin',
        email: 'hackathon-admin@example.com'
      },
      cloudflareEnv: {
        HACKATHON_OUTCOME_EMAIL_QUEUE: queueProducer
      },
      runtimeConfig: {
        hackathonOutcomeEmails: {
          queueBinding: 'HACKATHON_OUTCOME_EMAIL_QUEUE'
        }
      }
    })
    harnesses.push(harness)

    await seedOutcomeHackathon(harness, {
      state: 'shortlist',
      pitchFinalistSubmissionIdsJson: JSON.stringify(['submission_1']),
      finalRankingSubmissionIdsJson: JSON.stringify(['submission_1', 'submission_2'])
    })
    await harness.database.insert(users).values({
      id: 'team_member_one',
      auth0Subject: 'auth0|team_member_one',
      email: 'team-member-one@example.com',
      displayName: 'Team Member One'
    })
    await harness.database.insert(teamMembers).values({
      id: 'membership_team_1_member',
      teamId: 'team_1',
      userId: 'team_member_one',
      role: 'member',
      joinedAt: '2026-03-15T12:01:00.000Z',
      createdAt: '2026-03-15T12:01:00.000Z'
    })

    const response = await harness.request('/api/hackathons/hackathon_1/actions/start-pitch', {
      method: 'POST'
    })

    expect(response.status).toBe(200)
    expect(queueProducer.send).toHaveBeenCalledTimes(2)
    expect(queueProducer.send).toHaveBeenCalledWith(expect.objectContaining({
      notificationType: 'shortlist',
      teamId: 'team_1',
      teamName: 'Alpha Team',
      recipientEmail: 'team-admin-one@example.com'
    }), {
      contentType: 'json'
    })
    expect(queueProducer.send).toHaveBeenCalledWith(expect.objectContaining({
      notificationType: 'shortlist',
      teamId: 'team_1',
      teamName: 'Alpha Team',
      recipientEmail: 'team-member-one@example.com'
    }), {
      contentType: 'json'
    })

    const shortlistEmailAuditRows = (await harness.database.select().from(auditLogs))
      .filter(entry => entry.action === 'hackathon.shortlist_email_enqueued')
    expect(shortlistEmailAuditRows).toHaveLength(2)
    expect(shortlistEmailAuditRows).toEqual(expect.arrayContaining([
      expect.objectContaining({
        entityType: 'hackathon',
        entityId: 'hackathon_1',
        metadata: expect.objectContaining({
          teamId: 'team_1',
          userId: 'team_admin_one',
          enqueue: expect.objectContaining({
            status: 'enqueued'
          })
        })
      }),
      expect.objectContaining({
        entityType: 'hackathon',
        entityId: 'hackathon_1',
        metadata: expect.objectContaining({
          teamId: 'team_1',
          userId: 'team_member_one',
          enqueue: expect.objectContaining({
            status: 'enqueued'
          })
        })
      })
    ]))
  })

  test('starting pitch from shortlist requires a saved shortlist selection', async () => {
    const harness = createApiRouteTestHarness({
      routes: [
        {
          method: 'post',
          path: '/api/hackathons/:hackathonId/actions/start-pitch',
          handler: startPitchHandler
        }
      ],
      sessionUser: {
        sub: 'auth0|hackathon_admin',
        email: 'hackathon-admin@example.com'
      }
    })
    harnesses.push(harness)

    await seedOutcomeHackathon(harness, {
      state: 'shortlist',
      pitchFinalistSubmissionIdsJson: JSON.stringify(['submission_1']),
      finalRankingSubmissionIdsJson: '[]'
    })

    const response = await harness.request('/api/hackathons/hackathon_1/actions/start-pitch', {
      method: 'POST'
    })

    expect(response.status).toBe(409)
    expect(await response.json()).toMatchObject({
      error: expect.objectContaining({
        code: 'pitch_finalists_required'
      })
    })
  })

  test('blind-only hackathons can start final deliberation and expose blind-score breakdowns', async () => {
    const harness = createApiRouteTestHarness({
      routes: [
        {
          method: 'post',
          path: '/api/hackathons/:hackathonId/actions/start-final-deliberation',
          handler: startFinalDeliberationHandler
        },
        {
          method: 'get',
          path: '/api/hackathons/:hackathonId/final-deliberation',
          handler: listFinalDeliberationHandler
        }
      ],
      sessionUser: {
        sub: 'auth0|hackathon_admin',
        email: 'hackathon-admin@example.com'
      }
    })
    harnesses.push(harness)

    await seedOutcomeHackathon(harness, {
      state: 'blind_review',
      blindReviewCount: 2,
      pitchReviewEnabled: false,
      blindScoreWeightPercent: 100,
      pitchScoreWeightPercent: 0
    })

    const startResponse = await harness.request('/api/hackathons/hackathon_1/actions/start-final-deliberation', {
      method: 'POST'
    })

    expect(startResponse.status).toBe(200)
    expect(await startResponse.json()).toMatchObject({
      data: {
        id: 'hackathon_1',
        state: 'final_deliberation'
      }
    })

    const updatedHackathon = await harness.database.query.hackathons.findFirst({
      where: eq(hackathons.id, 'hackathon_1')
    })

    expect(updatedHackathon?.finalRankingSubmissionIdsJson).toBe('[]')

    const finalDeliberationResponse = await harness.request('/api/hackathons/hackathon_1/final-deliberation')

    expect(finalDeliberationResponse.status).toBe(200)
    const finalDeliberationPayload = await finalDeliberationResponse.json() as {
      data: {
        entries: Array<Record<string, unknown>>
        finalRankingSubmissionIds: string[]
      }
    }
    expect(finalDeliberationPayload).toMatchObject({
      data: {
        finalRankingSubmissionIds: [],
        entries: [
          expect.objectContaining({
            submissionId: 'submission_1',
            blindScore: 4,
            scoreTotal: 4,
            scoreRank: 1,
            finalRank: 1
          }),
          expect.objectContaining({
            submissionId: 'submission_2',
            blindScore: 3.5,
            scoreTotal: 3.5,
            scoreRank: 2,
            finalRank: 2
          })
        ]
      }
    })
    expect(finalDeliberationPayload.data.entries[0]).not.toHaveProperty('pitchScore')

    const auditEntries = await harness.database.select().from(auditLogs)
    expect(auditEntries).toEqual(expect.arrayContaining([
      expect.objectContaining({
        action: 'hackathon.start_final_deliberation'
      })
    ]))
  })

  test('leaderboard switches to weighted final scoring during pitch review and leaves missing pitch votes unranked', async () => {
    const harness = createApiRouteTestHarness({
      routes: [
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

    await seedOutcomeHackathon(harness, {
      state: 'pitch_review',
      pitchFinalistSubmissionIdsJson: JSON.stringify(['submission_1', 'submission_2'])
    })
    await seedPitchAssignments(harness, [
      {
        id: 'pitch_assignment_1',
        submissionId: 'submission_1',
        judgeUserId: 'judge_a',
        status: 'assigned',
        pitchScore: null,
        assignedAt: '2026-03-18T12:00:00.000Z'
      },
      {
        id: 'pitch_assignment_2',
        submissionId: 'submission_2',
        judgeUserId: 'judge_a',
        status: 'judge_completed',
        pitchScore: 5,
        assignedAt: '2026-03-18T12:01:00.000Z',
        startedAt: '2026-03-18T12:02:00.000Z',
        completedAt: '2026-03-18T12:03:00.000Z'
      },
      {
        id: 'pitch_assignment_3',
        submissionId: 'submission_2',
        judgeUserId: 'judge_b',
        status: 'judge_completed',
        pitchScore: 5,
        assignedAt: '2026-03-18T12:04:00.000Z',
        startedAt: '2026-03-18T12:05:00.000Z',
        completedAt: '2026-03-18T12:06:00.000Z'
      }
    ])

    const leaderboardResponse = await harness.request('/api/hackathons/hackathon_1/leaderboard')

    expect(leaderboardResponse.status).toBe(200)
    expect(await leaderboardResponse.json()).toMatchObject({
      data: [
        expect.objectContaining({
          submissionId: 'submission_2',
          rank: 1,
          scoreTotal: 3.95
        }),
        expect.objectContaining({
          submissionId: 'submission_1',
          rank: null,
          scoreTotal: null
        })
      ]
    })
  })

  test('starting final deliberation from pitch review requires at least one completed pitch review', async () => {
    const harness = createApiRouteTestHarness({
      routes: [
        {
          method: 'post',
          path: '/api/hackathons/:hackathonId/actions/start-final-deliberation',
          handler: startFinalDeliberationHandler
        }
      ],
      sessionUser: {
        sub: 'auth0|hackathon_admin',
        email: 'hackathon-admin@example.com'
      }
    })
    harnesses.push(harness)

    await seedOutcomeHackathon(harness, {
      state: 'pitch_review',
      pitchFinalistSubmissionIdsJson: JSON.stringify(['submission_1', 'submission_2']),
      finalRankingSubmissionIdsJson: JSON.stringify(['submission_1', 'submission_2'])
    })
    await seedPitchAssignments(harness, [
      {
        id: 'no_pitch_review_assignment_1',
        submissionId: 'submission_1',
        judgeUserId: 'judge_a',
        status: 'assigned',
        pitchScore: null,
        assignedAt: '2026-03-18T13:00:00.000Z'
      },
      {
        id: 'no_pitch_review_assignment_2',
        submissionId: 'submission_2',
        judgeUserId: 'judge_b',
        status: 'judge_started',
        pitchScore: null,
        assignedAt: '2026-03-18T13:01:00.000Z',
        startedAt: '2026-03-18T13:02:00.000Z'
      }
    ])

    const response = await harness.request('/api/hackathons/hackathon_1/actions/start-final-deliberation', {
      method: 'POST'
    })

    expect(response.status).toBe(409)
    expect(await response.json()).toMatchObject({
      error: expect.objectContaining({
        code: 'completed_pitch_reviews_required'
      })
    })
  })

  test('starting final deliberation from pitch review still allows partial judge coverage once at least one pitch review is submitted', async () => {
    const harness = createApiRouteTestHarness({
      routes: [
        {
          method: 'post',
          path: '/api/hackathons/:hackathonId/actions/start-final-deliberation',
          handler: startFinalDeliberationHandler
        }
      ],
      sessionUser: {
        sub: 'auth0|hackathon_admin',
        email: 'hackathon-admin@example.com'
      }
    })
    harnesses.push(harness)

    await seedOutcomeHackathon(harness, {
      state: 'pitch_review',
      pitchFinalistSubmissionIdsJson: JSON.stringify(['submission_1', 'submission_2']),
      finalRankingSubmissionIdsJson: JSON.stringify(['submission_1', 'submission_2'])
    })
    await seedPitchAssignments(harness, [
      {
        id: 'partial_pitch_review_assignment_1',
        submissionId: 'submission_1',
        judgeUserId: 'judge_a',
        status: 'judge_completed',
        pitchScore: 5,
        assignedAt: '2026-03-18T13:10:00.000Z',
        startedAt: '2026-03-18T13:11:00.000Z',
        completedAt: '2026-03-18T13:12:00.000Z'
      },
      {
        id: 'partial_pitch_review_assignment_2',
        submissionId: 'submission_1',
        judgeUserId: 'judge_b',
        status: 'assigned',
        pitchScore: null,
        assignedAt: '2026-03-18T13:13:00.000Z'
      },
      {
        id: 'partial_pitch_review_assignment_3',
        submissionId: 'submission_2',
        judgeUserId: 'judge_a',
        status: 'assigned',
        pitchScore: null,
        assignedAt: '2026-03-18T13:14:00.000Z'
      }
    ])

    const response = await harness.request('/api/hackathons/hackathon_1/actions/start-final-deliberation', {
      method: 'POST'
    })

    expect(response.status).toBe(200)
    expect(await response.json()).toMatchObject({
      data: {
        id: 'hackathon_1',
        state: 'final_deliberation'
      }
    })
  })

  test('starting final deliberation from pitch review clears any saved order and defaults to weighted score order', async () => {
    const harness = createApiRouteTestHarness({
      routes: [
        {
          method: 'post',
          path: '/api/hackathons/:hackathonId/actions/start-final-deliberation',
          handler: startFinalDeliberationHandler
        },
        {
          method: 'get',
          path: '/api/hackathons/:hackathonId/final-deliberation',
          handler: listFinalDeliberationHandler
        }
      ],
      sessionUser: {
        sub: 'auth0|hackathon_admin',
        email: 'hackathon-admin@example.com'
      }
    })
    harnesses.push(harness)

    await seedOutcomeHackathon(harness, {
      state: 'pitch_review',
      pitchFinalistSubmissionIdsJson: JSON.stringify(['submission_1', 'submission_2']),
      finalRankingSubmissionIdsJson: JSON.stringify(['submission_1', 'submission_2'])
    })
    await seedPitchAssignments(harness, [
      {
        id: 'preserved_order_assignment_1',
        submissionId: 'submission_1',
        judgeUserId: 'judge_a',
        status: 'judge_completed',
        pitchScore: 3,
        assignedAt: '2026-03-18T13:30:00.000Z',
        startedAt: '2026-03-18T13:31:00.000Z',
        completedAt: '2026-03-18T13:32:00.000Z'
      },
      {
        id: 'preserved_order_assignment_2',
        submissionId: 'submission_1',
        judgeUserId: 'judge_b',
        status: 'judge_completed',
        pitchScore: 3,
        assignedAt: '2026-03-18T13:33:00.000Z',
        startedAt: '2026-03-18T13:34:00.000Z',
        completedAt: '2026-03-18T13:35:00.000Z'
      },
      {
        id: 'preserved_order_assignment_3',
        submissionId: 'submission_2',
        judgeUserId: 'judge_a',
        status: 'judge_completed',
        pitchScore: 5,
        assignedAt: '2026-03-18T13:36:00.000Z',
        startedAt: '2026-03-18T13:37:00.000Z',
        completedAt: '2026-03-18T13:38:00.000Z'
      },
      {
        id: 'preserved_order_assignment_4',
        submissionId: 'submission_2',
        judgeUserId: 'judge_b',
        status: 'judge_completed',
        pitchScore: 5,
        assignedAt: '2026-03-18T13:39:00.000Z',
        startedAt: '2026-03-18T13:40:00.000Z',
        completedAt: '2026-03-18T13:41:00.000Z'
      }
    ])

    const startResponse = await harness.request('/api/hackathons/hackathon_1/actions/start-final-deliberation', {
      method: 'POST'
    })

    expect(startResponse.status).toBe(200)

    const updatedHackathon = await harness.database.query.hackathons.findFirst({
      where: eq(hackathons.id, 'hackathon_1')
    })
    expect(updatedHackathon?.finalRankingSubmissionIdsJson).toBe('[]')

    const viewResponse = await harness.request('/api/hackathons/hackathon_1/final-deliberation')

    expect(viewResponse.status).toBe(200)
    expect(await viewResponse.json()).toMatchObject({
      data: {
        finalRankingSubmissionIds: [],
        entries: [
          expect.objectContaining({
            submissionId: 'submission_2',
            scoreRank: 1,
            finalRank: 1
          }),
          expect.objectContaining({
            submissionId: 'submission_1',
            scoreRank: 2,
            finalRank: 2
          })
        ]
      }
    })
  })

  test('pitch-only hackathons rank leaderboard entries by pitch score', async () => {
    const harness = createApiRouteTestHarness({
      routes: [
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

    await seedOutcomeHackathon(harness, {
      state: 'pitch_review',
      blindReviewCount: 0,
      pitchReviewEnabled: true,
      blindScoreWeightPercent: 0,
      pitchScoreWeightPercent: 100
    })
    await seedPitchAssignments(harness, [
      {
        id: 'pitch_only_assignment_1',
        submissionId: 'submission_1',
        judgeUserId: 'judge_a',
        status: 'judge_completed',
        pitchScore: 5,
        assignedAt: '2026-03-18T13:00:00.000Z',
        startedAt: '2026-03-18T13:01:00.000Z',
        completedAt: '2026-03-18T13:02:00.000Z'
      },
      {
        id: 'pitch_only_assignment_2',
        submissionId: 'submission_1',
        judgeUserId: 'judge_b',
        status: 'judge_completed',
        pitchScore: 4,
        assignedAt: '2026-03-18T13:03:00.000Z',
        startedAt: '2026-03-18T13:04:00.000Z',
        completedAt: '2026-03-18T13:05:00.000Z'
      },
      {
        id: 'pitch_only_assignment_3',
        submissionId: 'submission_2',
        judgeUserId: 'judge_a',
        status: 'judge_completed',
        pitchScore: 4,
        assignedAt: '2026-03-18T13:06:00.000Z',
        startedAt: '2026-03-18T13:07:00.000Z',
        completedAt: '2026-03-18T13:08:00.000Z'
      },
      {
        id: 'pitch_only_assignment_4',
        submissionId: 'submission_2',
        judgeUserId: 'judge_b',
        status: 'judge_completed',
        pitchScore: 4,
        assignedAt: '2026-03-18T13:09:00.000Z',
        startedAt: '2026-03-18T13:10:00.000Z',
        completedAt: '2026-03-18T13:11:00.000Z'
      }
    ])

    const leaderboardResponse = await harness.request('/api/hackathons/hackathon_1/leaderboard')

    expect(leaderboardResponse.status).toBe(200)
    expect(await leaderboardResponse.json()).toMatchObject({
      data: [
        expect.objectContaining({
          submissionId: 'submission_1',
          rank: 1,
          scoreTotal: 4.5
        }),
        expect.objectContaining({
          submissionId: 'submission_2',
          rank: 2,
          scoreTotal: 4
        })
      ]
    })
  })

  test('final deliberation reads weighted breakdowns and persists ranking overrides', async () => {
    const harness = createApiRouteTestHarness({
      routes: [
        {
          method: 'get',
          path: '/api/hackathons/:hackathonId/final-deliberation',
          handler: listFinalDeliberationHandler
        },
        {
          method: 'post',
          path: '/api/hackathons/:hackathonId/final-deliberation/actions/reorder',
          handler: reorderFinalDeliberationHandler
        }
      ],
      sessionUser: {
        sub: 'auth0|hackathon_admin',
        email: 'hackathon-admin@example.com'
      }
    })
    harnesses.push(harness)

    await seedOutcomeHackathon(harness, {
      state: 'final_deliberation',
      pitchFinalistSubmissionIdsJson: JSON.stringify(['submission_1', 'submission_2'])
    })
    await seedPitchAssignments(harness, [
      {
        id: 'final_pitch_assignment_1',
        submissionId: 'submission_1',
        judgeUserId: 'judge_a',
        status: 'judge_completed',
        pitchScore: 3,
        assignedAt: '2026-03-18T14:00:00.000Z',
        startedAt: '2026-03-18T14:01:00.000Z',
        completedAt: '2026-03-18T14:02:00.000Z'
      },
      {
        id: 'final_pitch_assignment_2',
        submissionId: 'submission_1',
        judgeUserId: 'judge_b',
        status: 'judge_completed',
        pitchScore: 3,
        assignedAt: '2026-03-18T14:03:00.000Z',
        startedAt: '2026-03-18T14:04:00.000Z',
        completedAt: '2026-03-18T14:05:00.000Z'
      },
      {
        id: 'final_pitch_assignment_3',
        submissionId: 'submission_2',
        judgeUserId: 'judge_a',
        status: 'judge_completed',
        pitchScore: 5,
        assignedAt: '2026-03-18T14:06:00.000Z',
        startedAt: '2026-03-18T14:07:00.000Z',
        completedAt: '2026-03-18T14:08:00.000Z'
      },
      {
        id: 'final_pitch_assignment_4',
        submissionId: 'submission_2',
        judgeUserId: 'judge_b',
        status: 'judge_completed',
        pitchScore: 5,
        assignedAt: '2026-03-18T14:09:00.000Z',
        startedAt: '2026-03-18T14:10:00.000Z',
        completedAt: '2026-03-18T14:11:00.000Z'
      }
    ])

    const viewResponse = await harness.request('/api/hackathons/hackathon_1/final-deliberation')

    expect(viewResponse.status).toBe(200)
    expect(await viewResponse.json()).toMatchObject({
      data: {
        finalRankingSubmissionIds: [],
        entries: [
          expect.objectContaining({
            submissionId: 'submission_2',
            blindScore: 3.5,
            pitchScore: 5,
            scoreTotal: 3.95,
            scoreRank: 1,
            finalRank: 1
          }),
          expect.objectContaining({
            submissionId: 'submission_1',
            blindScore: 4,
            pitchScore: 3,
            scoreTotal: 3.6999999999999997,
            scoreRank: 2,
            finalRank: 2
          })
        ]
      }
    })

    const reorderResponse = await harness.request('/api/hackathons/hackathon_1/final-deliberation/actions/reorder', {
      method: 'POST',
      body: JSON.stringify({
        orderedSubmissionIds: ['submission_1', 'submission_2']
      })
    })

    expect(reorderResponse.status).toBe(200)
    expect(await reorderResponse.json()).toMatchObject({
      data: {
        finalRankingSubmissionIds: ['submission_1', 'submission_2'],
        entries: [
          expect.objectContaining({
            submissionId: 'submission_1',
            scoreRank: 2,
            finalRank: 1
          }),
          expect.objectContaining({
            submissionId: 'submission_2',
            scoreRank: 1,
            finalRank: 2
          })
        ]
      }
    })

    const persistedHackathon = await harness.database.query.hackathons.findFirst({
      where: eq(hackathons.id, 'hackathon_1')
    })
    expect(persistedHackathon?.finalRankingSubmissionIdsJson).toBe(JSON.stringify(['submission_1', 'submission_2']))

    const auditEntries = await harness.database.select().from(auditLogs)
    expect(auditEntries).toEqual(expect.arrayContaining([
      expect.objectContaining({
        action: 'hackathon.final_ranking_reordered',
        metadata: expect.objectContaining({
          orderedSubmissionIds: ['submission_1', 'submission_2'],
          rankedSubmissionCount: 2
        })
      })
    ]))
  })

  test('disqualifying a ranked submission prunes the stored final ranking and keeps final deliberation readable', async () => {
    const harness = createApiRouteTestHarness({
      routes: [
        {
          method: 'post',
          path: '/api/hackathons/:hackathonId/teams/:teamId/submission/actions/disqualify',
          handler: disqualifySubmissionHandler
        },
        {
          method: 'get',
          path: '/api/hackathons/:hackathonId/final-deliberation',
          handler: listFinalDeliberationHandler
        }
      ],
      sessionUser: {
        sub: 'auth0|hackathon_admin',
        email: 'hackathon-admin@example.com'
      }
    })
    harnesses.push(harness)

    await seedOutcomeHackathon(harness, {
      state: 'final_deliberation',
      pitchFinalistSubmissionIdsJson: JSON.stringify(['submission_1', 'submission_2']),
      finalRankingSubmissionIdsJson: JSON.stringify(['submission_2', 'submission_1'])
    })
    await seedPitchAssignments(harness, [
      {
        id: 'final_rank_assignment_1',
        submissionId: 'submission_1',
        judgeUserId: 'judge_a',
        status: 'judge_completed',
        pitchScore: 3,
        assignedAt: '2026-03-18T16:00:00.000Z',
        startedAt: '2026-03-18T16:01:00.000Z',
        completedAt: '2026-03-18T16:02:00.000Z'
      },
      {
        id: 'final_rank_assignment_2',
        submissionId: 'submission_1',
        judgeUserId: 'judge_b',
        status: 'judge_completed',
        pitchScore: 3,
        assignedAt: '2026-03-18T16:03:00.000Z',
        startedAt: '2026-03-18T16:04:00.000Z',
        completedAt: '2026-03-18T16:05:00.000Z'
      },
      {
        id: 'final_rank_assignment_3',
        submissionId: 'submission_2',
        judgeUserId: 'judge_a',
        status: 'judge_completed',
        pitchScore: 5,
        assignedAt: '2026-03-18T16:06:00.000Z',
        startedAt: '2026-03-18T16:07:00.000Z',
        completedAt: '2026-03-18T16:08:00.000Z'
      },
      {
        id: 'final_rank_assignment_4',
        submissionId: 'submission_2',
        judgeUserId: 'judge_b',
        status: 'judge_completed',
        pitchScore: 5,
        assignedAt: '2026-03-18T16:09:00.000Z',
        startedAt: '2026-03-18T16:10:00.000Z',
        completedAt: '2026-03-18T16:11:00.000Z'
      }
    ])

    const disqualifyResponse = await harness.request('/api/hackathons/hackathon_1/teams/team_2/submission/actions/disqualify', {
      method: 'POST',
      body: JSON.stringify({
        reason: 'Rule violation'
      })
    })

    expect(disqualifyResponse.status).toBe(200)

    const storedHackathon = await harness.database.query.hackathons.findFirst({
      where: eq(hackathons.id, 'hackathon_1')
    })
    expect(storedHackathon?.finalRankingSubmissionIdsJson).toBe(JSON.stringify(['submission_1']))

    const viewResponse = await harness.request('/api/hackathons/hackathon_1/final-deliberation')

    expect(viewResponse.status).toBe(200)
    expect(await viewResponse.json()).toMatchObject({
      data: {
        finalRankingSubmissionIds: ['submission_1'],
        entries: [
          expect.objectContaining({
            submissionId: 'submission_1',
            finalRank: 1
          }),
          expect.objectContaining({
            submissionId: 'submission_2',
            submissionStatus: 'disqualified',
            finalRank: null
          })
        ]
      }
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

    expect(announceResponse.status).toBe(409)
    expect(await announceResponse.json()).toMatchObject({
      error: {
        code: 'hackathon_state_invalid',
        details: expect.objectContaining({
          currentState: 'shortlist',
          allowedStates: ['final_deliberation']
        })
      }
    })
  })

  test('announcing winners from final deliberation uses final ranking data for prize redemptions', async () => {
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

    await seedOutcomeHackathon(adminHarness, { state: 'final_deliberation' })
    await seedPitchAssignments(adminHarness, [
      {
        id: 'pitch_assignment_1',
        submissionId: 'submission_1',
        judgeUserId: 'judge_a',
        status: 'judge_completed',
        pitchScore: 3,
        assignedAt: '2026-03-18T12:00:00.000Z',
        startedAt: '2026-03-18T12:01:00.000Z',
        completedAt: '2026-03-18T12:02:00.000Z'
      },
      {
        id: 'pitch_assignment_2',
        submissionId: 'submission_2',
        judgeUserId: 'judge_a',
        status: 'judge_completed',
        pitchScore: 5,
        assignedAt: '2026-03-18T12:03:00.000Z',
        startedAt: '2026-03-18T12:04:00.000Z',
        completedAt: '2026-03-18T12:05:00.000Z'
      },
      {
        id: 'pitch_assignment_3',
        submissionId: 'submission_2',
        judgeUserId: 'judge_b',
        status: 'judge_completed',
        pitchScore: 5,
        assignedAt: '2026-03-18T12:06:00.000Z',
        startedAt: '2026-03-18T12:07:00.000Z',
        completedAt: '2026-03-18T12:08:00.000Z'
      }
    ])

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

    const updatedHackathon = await adminHarness.database.query.hackathons.findFirst({
      where: eq(hackathons.id, 'hackathon_1')
    })
    expect(updatedHackathon?.finalRankingSubmissionIdsJson).toBe(JSON.stringify(['submission_2', 'submission_1']))

    const redemptionRows = await adminHarness.database.select().from(prizeRedemptions)
    expect(redemptionRows).toHaveLength(3)
    expect(redemptionRows).toEqual(expect.arrayContaining([
      expect.objectContaining({
        prizeId: 'prize_team_rank_1',
        teamId: 'team_2',
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
  })

  test('announcing winners can persist an unsaved manual final order override', async () => {
    const harness = createApiRouteTestHarness({
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
    harnesses.push(harness)

    await seedOutcomeHackathon(harness, { state: 'final_deliberation' })
    await seedPitchAssignments(harness, [
      {
        id: 'manual_announce_assignment_1',
        submissionId: 'submission_1',
        judgeUserId: 'judge_a',
        status: 'judge_completed',
        pitchScore: 3,
        assignedAt: '2026-03-18T12:00:00.000Z',
        startedAt: '2026-03-18T12:01:00.000Z',
        completedAt: '2026-03-18T12:02:00.000Z'
      },
      {
        id: 'manual_announce_assignment_2',
        submissionId: 'submission_2',
        judgeUserId: 'judge_a',
        status: 'judge_completed',
        pitchScore: 5,
        assignedAt: '2026-03-18T12:03:00.000Z',
        startedAt: '2026-03-18T12:04:00.000Z',
        completedAt: '2026-03-18T12:05:00.000Z'
      },
      {
        id: 'manual_announce_assignment_3',
        submissionId: 'submission_2',
        judgeUserId: 'judge_b',
        status: 'judge_completed',
        pitchScore: 5,
        assignedAt: '2026-03-18T12:06:00.000Z',
        startedAt: '2026-03-18T12:07:00.000Z',
        completedAt: '2026-03-18T12:08:00.000Z'
      }
    ])

    const announceResponse = await harness.request('/api/hackathons/hackathon_1/actions/announce-winners', {
      method: 'POST',
      body: JSON.stringify({
        orderedSubmissionIds: ['submission_1', 'submission_2']
      })
    })

    expect(announceResponse.status).toBe(200)

    const updatedHackathon = await harness.database.query.hackathons.findFirst({
      where: eq(hackathons.id, 'hackathon_1')
    })
    expect(updatedHackathon?.finalRankingSubmissionIdsJson).toBe(JSON.stringify(['submission_1', 'submission_2']))

    const redemptionRows = await harness.database.select().from(prizeRedemptions)
    expect(redemptionRows).toEqual(expect.arrayContaining([
      expect.objectContaining({
        prizeId: 'prize_team_rank_1',
        teamId: 'team_1',
        userId: null,
        status: 'pending'
      }),
      expect.objectContaining({
        prizeId: 'prize_member_top_2',
        teamId: 'team_2',
        userId: 'team_admin_two',
        status: 'pending'
      })
    ]))
  })

  test('announcing winners enqueues winner emails for each winning team member snapshot', async () => {
    const queueProducer = createQueueProducerStub()
    const harness = createApiRouteTestHarness({
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
      },
      cloudflareEnv: {
        HACKATHON_OUTCOME_EMAIL_QUEUE: queueProducer
      },
      runtimeConfig: {
        hackathonOutcomeEmails: {
          queueBinding: 'HACKATHON_OUTCOME_EMAIL_QUEUE'
        }
      }
    })
    harnesses.push(harness)

    await seedOutcomeHackathon(harness, {
      state: 'final_deliberation',
      pitchReviewEnabled: false
    })
    await harness.database.insert(users).values({
      id: 'team_member_one',
      auth0Subject: 'auth0|team_member_one',
      email: 'team-member-one@example.com',
      displayName: 'Team Member One'
    })
    await harness.database.insert(teamMembers).values({
      id: 'membership_team_1_member',
      teamId: 'team_1',
      userId: 'team_member_one',
      role: 'member',
      joinedAt: '2026-03-15T12:01:00.000Z',
      createdAt: '2026-03-15T12:01:00.000Z'
    })
    await harness.database.insert(prizeEligibilitySnapshots).values({
      id: 'snapshot_team_1_member',
      hackathonId: 'hackathon_1',
      teamId: 'team_1',
      userId: 'team_member_one',
      snapshotAt: '2026-03-17T12:00:00.000Z',
      createdAt: '2026-03-17T12:00:00.000Z'
    })

    const response = await harness.request('/api/hackathons/hackathon_1/actions/announce-winners', {
      method: 'POST'
    })

    expect(response.status).toBe(200)
    expect(queueProducer.send).toHaveBeenCalledTimes(3)
    expect(queueProducer.send).toHaveBeenCalledWith(expect.objectContaining({
      notificationType: 'winner',
      teamId: 'team_1',
      teamName: 'Alpha Team',
      finalRank: 1,
      rankedTeamCount: 2,
      prizeNames: ['Grand Prize', 'Top Two Membership'],
      recipientEmail: 'team-admin-one@example.com'
    }), {
      contentType: 'json'
    })
    expect(queueProducer.send).toHaveBeenCalledWith(expect.objectContaining({
      notificationType: 'winner',
      teamId: 'team_1',
      teamName: 'Alpha Team',
      finalRank: 1,
      rankedTeamCount: 2,
      prizeNames: ['Grand Prize', 'Top Two Membership'],
      recipientEmail: 'team-member-one@example.com'
    }), {
      contentType: 'json'
    })
    expect(queueProducer.send).toHaveBeenCalledWith(expect.objectContaining({
      notificationType: 'winner',
      teamId: 'team_2',
      teamName: 'Beta Team',
      finalRank: 2,
      rankedTeamCount: 2,
      prizeNames: ['Top Two Membership'],
      recipientEmail: 'team-admin-two@example.com'
    }), {
      contentType: 'json'
    })

    const winnerEmailAuditRows = (await harness.database.select().from(auditLogs))
      .filter(entry => entry.action === 'hackathon.winner_email_enqueued')
    expect(winnerEmailAuditRows).toHaveLength(3)
    expect(winnerEmailAuditRows).toEqual(expect.arrayContaining([
      expect.objectContaining({
        entityType: 'hackathon',
        entityId: 'hackathon_1',
        metadata: expect.objectContaining({
          teamId: 'team_1',
          userId: 'team_admin_one',
          finalRank: 1,
          enqueue: expect.objectContaining({
            status: 'enqueued'
          })
        })
      }),
      expect.objectContaining({
        entityType: 'hackathon',
        entityId: 'hackathon_1',
        metadata: expect.objectContaining({
          teamId: 'team_1',
          userId: 'team_member_one'
        })
      })
    ]))
  })

  test('announcing winners stays D1-safe when redemption creation and winner recipient lookups exceed 100 bound parameters', async () => {
    const queueProducer = createQueueProducerStub()
    const harness = createApiRouteTestHarness({
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
      },
      cloudflareEnv: {
        HACKATHON_OUTCOME_EMAIL_QUEUE: queueProducer
      },
      runtimeConfig: {
        hackathonOutcomeEmails: {
          queueBinding: 'HACKATHON_OUTCOME_EMAIL_QUEUE'
        }
      }
    })
    harnesses.push(harness)

    await seedOutcomeHackathon(harness, {
      state: 'final_deliberation',
      pitchReviewEnabled: false
    })

    const extraWinnerUsers = Array.from({ length: 100 }, (_, index) => ({
      id: `winner_member_${index + 1}`,
      auth0Subject: `auth0|winner_member_${index + 1}`,
      email: `winner-member-${index + 1}@example.com`,
      displayName: `Winner Member ${index + 1}`
    }))
    const extraWinnerSnapshots = extraWinnerUsers.map((user, index) => {
      const createdAt = new Date(Date.UTC(2026, 2, 18, 14, 0, index)).toISOString()

      return {
        id: `snapshot_winner_member_${index + 1}`,
        hackathonId: 'hackathon_1',
        teamId: index % 2 === 0 ? 'team_1' : 'team_2',
        userId: user.id,
        snapshotAt: createdAt,
        createdAt
      }
    })

    for (let index = 0; index < extraWinnerUsers.length; index += 40) {
      await harness.database.insert(users).values(extraWinnerUsers.slice(index, index + 40))
    }

    for (let index = 0; index < extraWinnerSnapshots.length; index += 40) {
      await harness.database.insert(prizeEligibilitySnapshots).values(
        extraWinnerSnapshots.slice(index, index + 40)
      )
    }

    const response = await harness.request('/api/hackathons/hackathon_1/actions/announce-winners', {
      method: 'POST'
    })

    expect(response.status).toBe(200)
    expect(await response.json()).toMatchObject({
      data: {
        id: 'hackathon_1',
        state: 'winners_announced'
      }
    })

    const redemptionRows = await harness.database.select().from(prizeRedemptions)
    expect(redemptionRows).toHaveLength(103)
    expect(redemptionRows.filter(row => row.userId === null)).toEqual([
      expect.objectContaining({
        prizeId: 'prize_team_rank_1',
        teamId: 'team_1',
        status: 'pending'
      })
    ])
    expect(redemptionRows.filter(row => row.userId !== null)).toHaveLength(102)
    expect(queueProducer.send).toHaveBeenCalledTimes(102)
  })

  test('winner reads stay unavailable until completion and then expose the completed showcase payload', async () => {
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

    await seedOutcomeHackathon(publicHarness, {
      state: 'winners_announced',
      finalRankingSubmissionIdsJson: JSON.stringify(['submission_1', 'submission_2'])
    })
    await publicHarness.database
      .update(users)
      .set({
        firstName: 'Team',
        familyName: 'Admin One',
        bio: 'Builds polished demos.',
        xProfileUrl: 'https://x.com/team-admin-one',
        linkedinProfileUrl: 'https://linkedin.com/in/team-admin-one',
        githubProfileUrl: 'https://github.com/team-admin-one',
        profileIconUpdatedAt: '2026-03-18T13:00:00.000Z'
      })
      .where(eq(users.id, 'team_admin_one'))
    await seedPitchAssignments(publicHarness, [
      {
        id: 'pitch_assignment_1',
        submissionId: 'submission_1',
        judgeUserId: 'judge_a',
        status: 'judge_completed',
        pitchScore: 3,
        assignedAt: '2026-03-18T12:00:00.000Z',
        startedAt: '2026-03-18T12:01:00.000Z',
        completedAt: '2026-03-18T12:02:00.000Z'
      },
      {
        id: 'pitch_assignment_2',
        submissionId: 'submission_2',
        judgeUserId: 'judge_a',
        status: 'judge_completed',
        pitchScore: 5,
        assignedAt: '2026-03-18T12:03:00.000Z',
        startedAt: '2026-03-18T12:04:00.000Z',
        completedAt: '2026-03-18T12:05:00.000Z'
      },
      {
        id: 'pitch_assignment_3',
        submissionId: 'submission_2',
        judgeUserId: 'judge_b',
        status: 'judge_completed',
        pitchScore: 5,
        assignedAt: '2026-03-18T12:06:00.000Z',
        startedAt: '2026-03-18T12:07:00.000Z',
        completedAt: '2026-03-18T12:08:00.000Z'
      }
    ])

    const preCompletionResponse = await publicHarness.request('/api/hackathons/hackathon_1/winners')

    expect(preCompletionResponse.status).toBe(409)

    await publicHarness.database
      .update(hackathons)
      .set({
        state: 'completed'
      })
      .where(eq(hackathons.id, 'hackathon_1'))

    const winnersResponse = await publicHarness.request('/api/hackathons/hackathon_1/winners')

    expect(winnersResponse.status).toBe(200)

    const winnersPayload = await winnersResponse.json()

    expect(winnersPayload).toMatchObject({
      data: [
        expect.objectContaining({
          teamId: 'team_1',
          teamName: 'Alpha Team',
          finalRank: 1,
          summary: 'Alpha summary',
          repositoryUrl: 'https://example.com/alpha',
          demoUrl: 'https://example.com/alpha-demo',
          prizes: expect.arrayContaining([
            expect.objectContaining({ id: 'prize_team_rank_1' }),
            expect.objectContaining({ id: 'prize_member_top_2' })
          ]),
          teamMembers: expect.arrayContaining([
            expect.objectContaining({
              id: 'team_admin_one',
              fullName: 'Team Admin One',
              bio: 'Builds polished demos.',
              xProfileUrl: 'https://x.com/team-admin-one',
              linkedinProfileUrl: 'https://linkedin.com/in/team-admin-one',
              githubProfileUrl: 'https://github.com/team-admin-one',
              profileIconUrl: '/api/public/hackathons/outcome-hackathon/winners/team_admin_one/profile-icon?v=2026-03-18T13%3A00%3A00.000Z'
            })
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
    expect(winnersPayload.data[0].teamMembers[0]).not.toHaveProperty('chatgptEmail')
    expect(winnersPayload.data[0].teamMembers[0]).not.toHaveProperty('openaiOrgId')
  })

  test('published project reads stay unavailable until completion and then expose opted-in non-winner projects', async () => {
    const harness = createApiRouteTestHarness({
      routes: [
        {
          method: 'get',
          path: '/api/hackathons/:hackathonId/published-projects',
          handler: listPublishedProjectsHandler
        }
      ],
      sessionUser: {
        sub: 'auth0|team_admin_one',
        email: 'team-admin-one@example.com'
      }
    })
    harnesses.push(harness)

    await seedOutcomeHackathon(harness, {
      state: 'winners_announced',
      withPrizes: false,
      finalRankingSubmissionIdsJson: JSON.stringify(['submission_1', 'submission_2'])
    })
    await harness.database
      .update(submissions)
      .set({
        isPubliclyVisible: true
      })
      .where(eq(submissions.id, 'submission_2'))

    const preCompletionResponse = await harness.request('/api/hackathons/hackathon_1/published-projects')

    expect(preCompletionResponse.status).toBe(409)

    await harness.database
      .update(hackathons)
      .set({
        state: 'completed'
      })
      .where(eq(hackathons.id, 'hackathon_1'))

    const publishedProjectsResponse = await harness.request('/api/hackathons/hackathon_1/published-projects')

    expect(publishedProjectsResponse.status).toBe(200)
    expect(await publishedProjectsResponse.json()).toMatchObject({
      data: [
        expect.objectContaining({
          teamId: 'team_2',
          teamName: 'Beta Team',
          submissionId: 'submission_2',
          projectName: 'Beta Project',
          summary: 'Beta summary'
        })
      ]
    })
  })

  test('completing a hackathon enqueues winner emails for each winning team member snapshot', async () => {
    const queueProducer = createQueueProducerStub()
    const harness = createApiRouteTestHarness({
      routes: [
        {
          method: 'post',
          path: '/api/hackathons/:hackathonId/actions/complete',
          handler: completeHackathonHandler
        }
      ],
      sessionUser: {
        sub: 'auth0|hackathon_admin',
        email: 'hackathon-admin@example.com'
      },
      cloudflareEnv: {
        HACKATHON_OUTCOME_EMAIL_QUEUE: queueProducer
      },
      runtimeConfig: {
        hackathonOutcomeEmails: {
          queueBinding: 'HACKATHON_OUTCOME_EMAIL_QUEUE'
        }
      }
    })
    harnesses.push(harness)

    await seedOutcomeHackathon(harness, {
      state: 'winners_announced',
      finalRankingSubmissionIdsJson: JSON.stringify(['submission_1', 'submission_2']),
      pitchReviewEnabled: false
    })
    await harness.database.insert(users).values({
      id: 'team_member_one',
      auth0Subject: 'auth0|team_member_one',
      email: 'team-member-one@example.com',
      displayName: 'Team Member One'
    })
    await harness.database.insert(prizeEligibilitySnapshots).values({
      id: 'snapshot_team_1_member_complete',
      hackathonId: 'hackathon_1',
      teamId: 'team_1',
      userId: 'team_member_one',
      snapshotAt: '2026-03-17T12:00:00.000Z',
      createdAt: '2026-03-17T12:00:00.000Z'
    })

    const response = await harness.request('/api/hackathons/hackathon_1/actions/complete', {
      method: 'POST'
    })

    expect(response.status).toBe(200)
    expect(queueProducer.send).toHaveBeenCalledTimes(3)
    expect(queueProducer.send).toHaveBeenCalledWith(expect.objectContaining({
      notificationType: 'winner',
      teamId: 'team_1',
      teamName: 'Alpha Team',
      finalRank: 1,
      rankedTeamCount: 2,
      prizeNames: ['Grand Prize', 'Top Two Membership'],
      recipientEmail: 'team-admin-one@example.com'
    }), {
      contentType: 'json'
    })
    expect(queueProducer.send).toHaveBeenCalledWith(expect.objectContaining({
      notificationType: 'winner',
      teamId: 'team_1',
      teamName: 'Alpha Team',
      finalRank: 1,
      rankedTeamCount: 2,
      prizeNames: ['Grand Prize', 'Top Two Membership'],
      recipientEmail: 'team-member-one@example.com'
    }), {
      contentType: 'json'
    })
    expect(queueProducer.send).toHaveBeenCalledWith(expect.objectContaining({
      notificationType: 'winner',
      teamId: 'team_2',
      teamName: 'Beta Team',
      finalRank: 2,
      rankedTeamCount: 2,
      prizeNames: ['Top Two Membership'],
      recipientEmail: 'team-admin-two@example.com'
    }), {
      contentType: 'json'
    })

    const winnerEmailAuditRows = (await harness.database.select().from(auditLogs))
      .filter(entry => entry.action === 'hackathon.winner_email_enqueued')
    expect(winnerEmailAuditRows).toHaveLength(3)
    expect(winnerEmailAuditRows).toEqual(expect.arrayContaining([
      expect.objectContaining({
        metadata: expect.objectContaining({
          trigger: 'complete',
          teamId: 'team_1',
          userId: 'team_admin_one'
        })
      }),
      expect.objectContaining({
        metadata: expect.objectContaining({
          trigger: 'complete',
          teamId: 'team_1',
          userId: 'team_member_one'
        })
      })
    ]))
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
      },
      {
        id: 'redemption_other_team',
        prizeId: 'prize_team_rank_1',
        userId: null,
        teamId: 'team_2',
        status: 'pending',
        createdAt: '2026-03-18T12:02:00.000Z',
        updatedAt: '2026-03-18T12:02:00.000Z'
      },
      {
        id: 'redemption_already_redeemed',
        prizeId: 'prize_member_top_2',
        userId: 'team_admin_one',
        teamId: 'team_1',
        status: 'redeemed',
        redeemedAt: '2026-03-18T12:03:00.000Z',
        createdAt: '2026-03-18T12:03:00.000Z',
        updatedAt: '2026-03-18T12:03:00.000Z'
      }
    ])

    const listResponse = await harness.request('/api/prize-redemptions/me')

    expect(listResponse.status).toBe(200)
    const listPayload = await listResponse.json()
    expect(listPayload).toMatchObject({
      data: [
        expect.objectContaining({
          id: 'redemption_team_scope'
        }),
        expect.objectContaining({
          id: 'redemption_member_scope'
        })
      ]
    })
    expect(listPayload.data).toHaveLength(2)
    expect(listPayload.data.map((entry: { id: string }) => entry.id)).toEqual([
      'redemption_team_scope',
      'redemption_member_scope'
    ])

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

  test('hackathon admins can load prize redemption operations data with winner names during winners announced', async () => {
    const harness = createApiRouteTestHarness({
      routes: [
        {
          method: 'post',
          path: '/api/hackathons/:hackathonId/actions/announce-winners',
          handler: announceWinnersHandler
        },
        {
          method: 'get',
          path: '/api/hackathons/:hackathonId/prize-redemptions',
          handler: listHackathonPrizeRedemptionsHandler
        }
      ],
      sessionUser: {
        sub: 'auth0|hackathon_admin',
        email: 'hackathon-admin@example.com'
      }
    })
    harnesses.push(harness)

    await seedOutcomeHackathon(harness, { state: 'final_deliberation' })
    await seedPitchAssignments(harness, [
      {
        id: 'winner_names_pitch_assignment_1',
        submissionId: 'submission_1',
        judgeUserId: 'judge_a',
        status: 'judge_completed',
        pitchScore: 5,
        assignedAt: '2026-03-18T12:00:00.000Z',
        startedAt: '2026-03-18T12:01:00.000Z',
        completedAt: '2026-03-18T12:02:00.000Z'
      },
      {
        id: 'winner_names_pitch_assignment_2',
        submissionId: 'submission_2',
        judgeUserId: 'judge_a',
        status: 'judge_completed',
        pitchScore: 3,
        assignedAt: '2026-03-18T12:03:00.000Z',
        startedAt: '2026-03-18T12:04:00.000Z',
        completedAt: '2026-03-18T12:05:00.000Z'
      },
      {
        id: 'winner_names_pitch_assignment_3',
        submissionId: 'submission_2',
        judgeUserId: 'judge_b',
        status: 'judge_completed',
        pitchScore: 3,
        assignedAt: '2026-03-18T12:06:00.000Z',
        startedAt: '2026-03-18T12:07:00.000Z',
        completedAt: '2026-03-18T12:08:00.000Z'
      }
    ])

    const announceResponse = await harness.request('/api/hackathons/hackathon_1/actions/announce-winners', {
      method: 'POST'
    })
    expect(announceResponse.status).toBe(200)

    const response = await harness.request('/api/hackathons/hackathon_1/prize-redemptions?include_rankings=true')

    expect(response.status).toBe(200)

    const payload = await response.json()

    expect(payload).toMatchObject({
      data: {
        winners: expect.arrayContaining([
          expect.objectContaining({
            teamId: 'team_1',
            teamName: 'Alpha Team',
            teamMembers: expect.arrayContaining([
              expect.objectContaining({
                id: 'team_admin_one',
                fullName: 'Team Admin One',
                chatgptEmail: 'team-admin-one@chatgpt.example',
                openaiOrgId: 'org_team_admin_one'
              })
            ])
          })
        ]),
        redemptions: expect.arrayContaining([
          expect.objectContaining({
            prize: expect.objectContaining({
              id: 'prize_team_rank_1'
            }),
            teamId: 'team_1',
            userId: null
          }),
          expect.objectContaining({
            prize: expect.objectContaining({
              id: 'prize_member_top_2'
            }),
            teamId: 'team_1',
            userId: 'team_admin_one'
          })
        ]),
        finalRankingEntries: [
          expect.objectContaining({
            teamId: 'team_1',
            teamName: 'Alpha Team',
            submissionId: 'submission_1',
            projectName: 'Alpha Project',
            summary: 'Alpha summary',
            repositoryUrl: 'https://example.com/alpha',
            demoUrl: 'https://example.com/alpha-demo',
            finalRank: 1,
            teamMembers: expect.arrayContaining([
              expect.objectContaining({
                id: 'team_admin_one',
                fullName: 'Team Admin One',
                chatgptEmail: 'team-admin-one@chatgpt.example',
                openaiOrgId: 'org_team_admin_one'
              })
            ])
          }),
          expect.objectContaining({
            teamId: 'team_2',
            teamName: 'Beta Team',
            submissionId: 'submission_2',
            projectName: 'Beta Project',
            summary: 'Beta summary',
            repositoryUrl: 'https://example.com/beta',
            demoUrl: 'https://example.com/beta-demo',
            finalRank: 2,
            teamMembers: expect.arrayContaining([
              expect.objectContaining({
                id: 'team_admin_two',
                fullName: 'Team Admin Two',
                chatgptEmail: 'team-admin-two@chatgpt.example',
                openaiOrgId: 'org_team_admin_two'
              })
            ])
          })
        ],
        blindRankingEntries: [
          expect.objectContaining({
            teamId: 'team_1',
            teamName: 'Alpha Team',
            submissionId: 'submission_1',
            projectName: 'Alpha Project',
            summary: 'Alpha summary',
            repositoryUrl: 'https://example.com/alpha',
            demoUrl: 'https://example.com/alpha-demo',
            blindRank: 1,
            teamMembers: expect.arrayContaining([
              expect.objectContaining({
                id: 'team_admin_one',
                fullName: 'Team Admin One',
                chatgptEmail: 'team-admin-one@chatgpt.example',
                openaiOrgId: 'org_team_admin_one'
              })
            ])
          }),
          expect.objectContaining({
            teamId: 'team_2',
            teamName: 'Beta Team',
            submissionId: 'submission_2',
            projectName: 'Beta Project',
            summary: 'Beta summary',
            repositoryUrl: 'https://example.com/beta',
            demoUrl: 'https://example.com/beta-demo',
            blindRank: 2,
            teamMembers: expect.arrayContaining([
              expect.objectContaining({
                id: 'team_admin_two',
                fullName: 'Team Admin Two',
                chatgptEmail: 'team-admin-two@chatgpt.example',
                openaiOrgId: 'org_team_admin_two'
              })
            ])
          })
        ]
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
      ...Array.from({ length: 205 }, (_, index) => ({
        id: `audit_hackathon_scope_${index}`,
        actorUserId: index % 2 === 0 ? 'hackathon_admin' : 'platform_admin',
        entityType: index % 2 === 0 ? 'hackathon' as const : 'account',
        entityId: index % 2 === 0 ? 'hackathon_1' : `user_${index}`,
        action: 'hackathon.announce_winners',
        metadata: {
          hackathonId: 'hackathon_1'
        },
        createdAt: new Date(Date.UTC(2026, 2, 18, 13, 0, index)).toISOString()
      })),
      {
        id: 'audit_platform_scope',
        actorUserId: 'platform_admin',
        entityType: 'account',
        entityId: 'user_123',
        action: 'account.deleted',
        metadata: {},
        createdAt: '2026-03-18T14:00:00.000Z'
      }
    ])

    const hackathonAuditResponse = await hackathonHarness.request('/api/hackathons/hackathon_1/audit')

    expect(hackathonAuditResponse.status).toBe(200)
    const hackathonAuditPayload = await hackathonAuditResponse.json()
    expect(hackathonAuditPayload.data).toHaveLength(200)
    expect(hackathonAuditPayload.data[0]).toMatchObject({ id: 'audit_hackathon_scope_204' })
    expect(hackathonAuditPayload.data.at(-1)).toMatchObject({ id: 'audit_hackathon_scope_5' })
    expect(hackathonAuditPayload.data).not.toEqual(
      expect.arrayContaining([expect.objectContaining({ id: 'audit_platform_scope' })])
    )

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
    await platformHarness.database.insert(auditLogs).values(
      Array.from({ length: 205 }, (_, index) => ({
        id: `platform_audit_scope_${index}`,
        actorUserId: index % 2 === 0 ? 'platform_admin' : 'hackathon_admin',
        entityType: index % 2 === 0 ? 'account' : 'hackathon',
        entityId: index % 2 === 0 ? `user_${index}` : 'hackathon_1',
        action: index % 2 === 0 ? 'account.deleted' : 'hackathon.announce_winners',
        metadata: index % 2 === 0 ? {} : { hackathonId: 'hackathon_1' },
        createdAt: new Date(Date.UTC(2026, 2, 18, 13, 0, index)).toISOString()
      }))
    )

    const platformAuditResponse = await platformHarness.request('/api/audit')

    expect(platformAuditResponse.status).toBe(200)
    const platformAuditPayload = await platformAuditResponse.json()
    expect(platformAuditPayload.data).toHaveLength(200)
    expect(platformAuditPayload.data[0]).toMatchObject({ id: 'platform_audit_scope_204' })
    expect(platformAuditPayload.data.at(-1)).toMatchObject({ id: 'platform_audit_scope_5' })
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
