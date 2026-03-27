import { afterEach, describe, expect, test, vi } from 'vitest'

import { eq } from 'drizzle-orm'

import hackathonsGetHandler from '../../../../server/api/hackathons/index.get'
import hackathonParticipationGetHandler from '../../../../server/api/hackathons/participation.get'
import hackathonsPostHandler from '../../../../server/api/hackathons/index.post'
import hackathonDetailGetHandler from '../../../../server/api/hackathons/[hackathonId]/index.get'
import publicHackathonsGetHandler from '../../../../server/api/public/hackathons/index.get'
import publicHackathonDetailGetHandler from '../../../../server/api/public/hackathons/[slug]/index.get'
import publicHackathonCriteriaGetHandler from '../../../../server/api/public/hackathons/[slug]/evaluation-criteria/index.get'
import publicHackathonPrizesGetHandler from '../../../../server/api/public/hackathons/[slug]/prizes/index.get'
import publicHackathonBackgroundImageGetHandler from '../../../../server/api/public/hackathons/[slug]/images/background.get'
import publicHackathonBannerImageGetHandler from '../../../../server/api/public/hackathons/[slug]/images/banner.get'
import hackathonPatchHandler from '../../../../server/api/hackathons/[hackathonId]/index.patch'
import hackathonBackgroundImageDeleteHandler from '../../../../server/api/hackathons/[hackathonId]/images/background.delete'
import hackathonBackgroundImagePostHandler from '../../../../server/api/hackathons/[hackathonId]/images/background.post'
import hackathonBannerImageDeleteHandler from '../../../../server/api/hackathons/[hackathonId]/images/banner.delete'
import hackathonBannerImagePostHandler from '../../../../server/api/hackathons/[hackathonId]/images/banner.post'
import openSubmissionPostHandler from '../../../../server/api/hackathons/[hackathonId]/actions/open-submission.post'
import startJudgingPreparationPostHandler from '../../../../server/api/hackathons/[hackathonId]/actions/start-judging-preparation.post'
import startJudgeReviewPostHandler from '../../../../server/api/hackathons/[hackathonId]/actions/start-judge-review.post'
import {
  auditLogs,
  evaluationCriteria,
  hackathonRoleAssignments,
  hackathonTermsDocuments,
  hackathons,
  judgeAssignments,
  prizes,
  prizeEligibilitySnapshots,
  submissions,
  teamMembers,
  teams,
  userApplications,
  users
} from '../../../../server/database/schema'
import { createApiRouteTestHarness } from '../../../support/backend/api-route'

describe('TASK-3.5 hackathon CRUD routes', () => {
  const harnesses: Array<ReturnType<typeof createApiRouteTestHarness>> = []
  const hackathonImagesBindingName = 'HACKATHON_IMAGES'

  class InMemoryR2Bucket {
    private readonly objects = new Map<string, { body: Uint8Array, contentType?: string }>()

    async get(key: string) {
      const object = this.objects.get(key)

      if (!object) {
        return null
      }

      return {
        async arrayBuffer() {
          return object.body.buffer.slice(
            object.body.byteOffset,
            object.body.byteOffset + object.body.byteLength
          )
        },
        httpMetadata: {
          contentType: object.contentType
        }
      }
    }

    async put(
      key: string,
      value: ArrayBuffer | ArrayBufferView,
      options?: { httpMetadata?: { contentType?: string } }
    ) {
      const body = value instanceof ArrayBuffer
        ? new Uint8Array(value)
        : new Uint8Array(value.buffer, value.byteOffset, value.byteLength)

      this.objects.set(key, {
        body: new Uint8Array(body),
        contentType: options?.httpMetadata?.contentType
      })
    }

    async delete(key: string) {
      this.objects.delete(key)
    }
  }

  async function insertHackathonsInBatches(
    harness: ReturnType<typeof createApiRouteTestHarness>,
    rows: Array<typeof hackathons.$inferInsert>,
    chunkSize = 4
  ) {
    for (let index = 0; index < rows.length; index += chunkSize) {
      await harness.database.insert(hackathons).values(rows.slice(index, index + chunkSize))
    }
  }

  afterEach(async () => {
    vi.unstubAllGlobals()

    while (harnesses.length > 0) {
      await harnesses.pop()?.d1Database.close()
    }
  })

  function buildOrderedTimestamp(offset: number) {
    const day = String(Math.floor(offset / 24) + 1).padStart(2, '0')
    const hour = String(offset % 24).padStart(2, '0')
    return `2026-04-${day}T${hour}:00:00.000Z`
  }

  test('GET /api/hackathons hides draft hackathons from public callers', async () => {
    const harness = createApiRouteTestHarness({
      routes: [
        { method: 'get', path: '/api/hackathons', handler: hackathonsGetHandler }
      ]
    })
    harnesses.push(harness)

    await harness.database.insert(users).values({
      id: 'creator_1',
      auth0Subject: 'auth0|creator_1',
      email: 'creator@example.com',
      displayName: 'Creator'
    })
    await harness.database.insert(hackathons).values([
      {
        id: 'hackathon_public',
        name: 'Public Hackathon',
        slug: 'public-hackathon',
        description: 'Public',
        city: 'Vienna',
        address: 'Address',
        registrationOpensAt: '2026-03-20T12:00:00.000Z',
        registrationClosesAt: '2026-03-23T12:00:00.000Z',
        submissionOpensAt: '2026-03-23T12:00:00.000Z',
        submissionClosesAt: '2026-03-25T12:00:00.000Z',
        state: 'registration_open',
        maxTeamMembers: 5,
        createdByUserId: 'creator_1'
      },
      {
        id: 'hackathon_draft',
        name: 'Draft Hackathon',
        slug: 'draft-hackathon',
        description: 'Draft',
        city: 'Vienna',
        address: 'Address',
        registrationOpensAt: '2026-03-20T12:00:00.000Z',
        registrationClosesAt: '2026-03-23T12:00:00.000Z',
        submissionOpensAt: '2026-03-23T12:00:00.000Z',
        submissionClosesAt: '2026-03-25T12:00:00.000Z',
        state: 'draft',
        maxTeamMembers: 5,
        createdByUserId: 'creator_1'
      }
    ])

    const response = await harness.request('/api/hackathons')

    expect(response.status).toBe(200)
    const payload = await response.json()

    expect(payload).toMatchObject({
      data: [
        expect.objectContaining({
          id: 'hackathon_public',
          name: 'Public Hackathon',
          slug: 'public-hackathon'
        })
      ],
      meta: {
        total: 1
      }
    })
  })

  test('GET /api/hackathons/participation requires a platform account', async () => {
    const harness = createApiRouteTestHarness({
      routes: [
        { method: 'get', path: '/api/hackathons/participation', handler: hackathonParticipationGetHandler }
      ],
      sessionUser: {
        sub: 'auth0|identity_only',
        email: 'identity@example.com'
      }
    })
    harnesses.push(harness)

    const response = await harness.request('/api/hackathons/participation')

    expect(response.status).toBe(403)
    expect(await response.json()).toMatchObject({
      error: {
        code: 'platform_account_required'
      }
    })
  })

  test('GET /api/hackathons/participation returns an empty payload for platform users without participation records', async () => {
    const harness = createApiRouteTestHarness({
      routes: [
        { method: 'get', path: '/api/hackathons/participation', handler: hackathonParticipationGetHandler }
      ],
      sessionUser: {
        sub: 'auth0|participant_pending',
        email: 'participant-pending@example.com'
      }
    })
    harnesses.push(harness)

    await harness.database.insert(users).values({
      id: 'participant_pending',
      auth0Subject: 'auth0|participant_pending',
      email: 'participant-pending@example.com',
      displayName: 'Participant Pending'
    })

    const response = await harness.request('/api/hackathons/participation')

    expect(response.status).toBe(200)
    expect(await response.json()).toMatchObject({
      data: {
        current: [],
        past: []
      }
    })
  })

  test('GET /api/hackathons/participation returns current and past participation from applications, teams, and submissions', async () => {
    const harness = createApiRouteTestHarness({
      routes: [
        { method: 'get', path: '/api/hackathons/participation', handler: hackathonParticipationGetHandler }
      ],
      sessionUser: {
        sub: 'auth0|participant_1',
        email: 'participant@example.com'
      }
    })
    harnesses.push(harness)

    await harness.database.insert(users).values([
      {
        id: 'creator_1',
        auth0Subject: 'auth0|creator_1',
        email: 'creator@example.com',
        displayName: 'Creator'
      },
      {
        id: 'participant_1',
        auth0Subject: 'auth0|participant_1',
        email: 'participant@example.com',
        displayName: 'Participant One'
      }
    ])

    await harness.database.insert(hackathons).values([
      {
        id: 'hackathon_current',
        name: 'Current Hackathon',
        slug: 'current-hackathon',
        description: 'Current program',
        city: 'Vienna',
        address: 'Address',
        registrationOpensAt: '2026-03-20T12:00:00.000Z',
        registrationClosesAt: '2026-03-23T12:00:00.000Z',
        submissionOpensAt: '2026-03-23T12:00:00.000Z',
        submissionClosesAt: '2026-03-25T12:00:00.000Z',
        state: 'submission_open',
        maxTeamMembers: 5,
        createdByUserId: 'creator_1'
      },
      {
        id: 'hackathon_past',
        name: 'Past Hackathon',
        slug: 'past-hackathon',
        description: 'Past program',
        city: 'London',
        address: 'Address',
        registrationOpensAt: '2026-01-10T12:00:00.000Z',
        registrationClosesAt: '2026-01-13T12:00:00.000Z',
        submissionOpensAt: '2026-01-13T12:00:00.000Z',
        submissionClosesAt: '2026-01-15T12:00:00.000Z',
        state: 'completed',
        maxTeamMembers: 4,
        createdByUserId: 'creator_1'
      }
    ])

    await harness.database.insert(hackathonTermsDocuments).values([
      {
        id: 'terms_current',
        hackathonId: 'hackathon_current',
        documentType: 'application_terms',
        version: 1,
        title: 'Current terms',
        content: 'Current terms content',
        publishedAt: '2026-03-18T00:00:00.000Z'
      },
      {
        id: 'terms_past',
        hackathonId: 'hackathon_past',
        documentType: 'application_terms',
        version: 1,
        title: 'Past terms',
        content: 'Past terms content',
        publishedAt: '2026-01-08T00:00:00.000Z'
      }
    ])

    await harness.database.insert(userApplications).values([
      {
        id: 'application_current',
        hackathonId: 'hackathon_current',
        userId: 'participant_1',
        status: 'approved',
        submittedAt: '2026-03-20T13:00:00.000Z',
        reviewedAt: '2026-03-20T15:00:00.000Z',
        applicationTermsDocumentId: 'terms_current',
        applicationTermsAcceptedAt: '2026-03-20T13:00:00.000Z',
        updatedAt: '2026-03-20T15:00:00.000Z'
      },
      {
        id: 'application_past',
        hackathonId: 'hackathon_past',
        userId: 'participant_1',
        status: 'approved',
        submittedAt: '2026-01-10T13:00:00.000Z',
        reviewedAt: '2026-01-10T15:00:00.000Z',
        applicationTermsDocumentId: 'terms_past',
        applicationTermsAcceptedAt: '2026-01-10T13:00:00.000Z',
        updatedAt: '2026-01-10T15:00:00.000Z'
      }
    ])

    await harness.database.insert(teams).values([
      {
        id: 'team_current',
        hackathonId: 'hackathon_current',
        name: 'Current Team',
        slug: 'current-team',
        createdByUserId: 'participant_1'
      },
      {
        id: 'team_past',
        hackathonId: 'hackathon_past',
        name: 'Past Team',
        slug: 'past-team',
        createdByUserId: 'participant_1'
      }
    ])

    await harness.database.insert(teamMembers).values([
      {
        id: 'membership_current',
        teamId: 'team_current',
        userId: 'participant_1',
        role: 'admin',
        joinedAt: '2026-03-20T16:00:00.000Z',
        leftAt: null
      },
      {
        id: 'membership_past',
        teamId: 'team_past',
        userId: 'participant_1',
        role: 'member',
        joinedAt: '2026-01-10T16:00:00.000Z',
        leftAt: '2026-01-15T18:00:00.000Z'
      }
    ])

    await harness.database.insert(submissions).values([
      {
        id: 'submission_current',
        teamId: 'team_current',
        status: 'submitted',
        projectName: 'Current Project',
        submittedAt: '2026-03-24T11:00:00.000Z',
        createdAt: '2026-03-24T10:00:00.000Z',
        updatedAt: '2026-03-24T11:00:00.000Z'
      },
      {
        id: 'submission_past',
        teamId: 'team_past',
        status: 'locked',
        projectName: 'Past Project',
        submittedAt: '2026-01-14T11:00:00.000Z',
        lockedAt: '2026-01-15T11:00:00.000Z',
        createdAt: '2026-01-14T10:00:00.000Z',
        updatedAt: '2026-01-15T11:00:00.000Z'
      }
    ])

    const response = await harness.request('/api/hackathons/participation')

    expect(response.status).toBe(200)
    expect(await response.json()).toMatchObject({
      data: {
        current: [
          {
            hackathon: {
              id: 'hackathon_current',
              slug: 'current-hackathon',
              state: 'submission_open'
            },
            isPast: false,
            application: {
              id: 'application_current',
              status: 'approved'
            },
            activeTeam: {
              id: 'team_current',
              membershipRole: 'admin',
              isActiveMembership: true
            },
            latestTeam: {
              id: 'team_current'
            },
            latestSubmission: {
              id: 'submission_current',
              status: 'submitted'
            }
          }
        ],
        past: [
          {
            hackathon: {
              id: 'hackathon_past',
              slug: 'past-hackathon',
              state: 'completed'
            },
            isPast: true,
            application: {
              id: 'application_past',
              status: 'approved'
            },
            activeTeam: null,
            latestTeam: {
              id: 'team_past',
              membershipRole: 'member',
              isActiveMembership: false
            },
            latestSubmission: {
              id: 'submission_past',
              status: 'locked'
            }
          }
        ]
      }
    })
  })

  test('GET /api/public/hackathons stays public-safe and complete for authenticated admins when drafts fill page slots', async () => {
    const harness = createApiRouteTestHarness({
      routes: [
        { method: 'get', path: '/api/public/hackathons', handler: publicHackathonsGetHandler }
      ],
      sessionUser: {
        sub: 'auth0|platform_admin',
        email: 'platform-admin@example.com'
      }
    })
    harnesses.push(harness)

    await harness.database.insert(users).values([
      {
        id: 'platform_admin',
        auth0Subject: 'auth0|platform_admin',
        email: 'platform-admin@example.com',
        displayName: 'Platform Admin',
        isPlatformAdmin: true
      },
      {
        id: 'creator_1',
        auth0Subject: 'auth0|creator_1',
        email: 'creator@example.com',
        displayName: 'Creator'
      }
    ])

    await insertHackathonsInBatches(harness, [
      ...Array.from({ length: 100 }, (_, index) => ({
        id: `hackathon_draft_${index + 1}`,
        name: `Draft Hackathon ${index + 1}`,
        slug: `draft-hackathon-${index + 1}`,
        description: 'Draft',
        city: 'Vienna',
        address: 'Address',
        registrationOpensAt: '2026-03-20T12:00:00.000Z',
        registrationClosesAt: '2026-03-23T12:00:00.000Z',
        submissionOpensAt: '2026-03-23T12:00:00.000Z',
        submissionClosesAt: '2026-03-25T12:00:00.000Z',
        state: 'draft' as const,
        maxTeamMembers: 5,
        createdByUserId: 'platform_admin',
        createdAt: buildOrderedTimestamp(index),
        updatedAt: buildOrderedTimestamp(index)
      })),
      {
        id: 'hackathon_public',
        name: 'Public Hackathon',
        slug: 'public-hackathon',
        description: 'Public',
        city: 'Vienna',
        address: 'Address',
        registrationOpensAt: '2026-03-20T12:00:00.000Z',
        registrationClosesAt: '2026-03-23T12:00:00.000Z',
        submissionOpensAt: '2026-03-23T12:00:00.000Z',
        submissionClosesAt: '2026-03-25T12:00:00.000Z',
        state: 'registration_open',
        maxTeamMembers: 5,
        createdByUserId: 'creator_1',
        createdAt: '2026-03-01T00:00:00.000Z',
        updatedAt: '2026-03-01T00:00:00.000Z'
      }
    ])

    const response = await harness.request('/api/public/hackathons?page=1&page_size=100')

    expect(response.status).toBe(200)
    const payload = await response.json()

    expect(payload).toMatchObject({
      data: [
        expect.objectContaining({
          name: 'Public Hackathon',
          slug: 'public-hackathon'
        })
      ],
      meta: {
        total: 1
      }
    })

    expect(payload.data[0]).not.toHaveProperty('id')
    expect(payload.data[0]).not.toHaveProperty('currentApplicationTermsDocumentId')
    expect(payload.data[0]).not.toHaveProperty('currentWinnerTermsDocumentId')
    expect(payload.data[0]).not.toHaveProperty('createdByUserId')
    expect(payload.data[0]).not.toHaveProperty('createdAt')
    expect(payload.data[0]).not.toHaveProperty('updatedAt')
  })

  test('GET /api/public/hackathons/:slug resolves the exact public hackathon without paginated lookup', async () => {
    const harness = createApiRouteTestHarness({
      routes: [
        { method: 'get', path: '/api/public/hackathons/:slug', handler: publicHackathonDetailGetHandler }
      ],
      sessionUser: {
        sub: 'auth0|platform_admin',
        email: 'platform-admin@example.com'
      }
    })
    harnesses.push(harness)

    await harness.database.insert(users).values([
      {
        id: 'platform_admin',
        auth0Subject: 'auth0|platform_admin',
        email: 'platform-admin@example.com',
        displayName: 'Platform Admin',
        isPlatformAdmin: true
      },
      {
        id: 'creator_1',
        auth0Subject: 'auth0|creator_1',
        email: 'creator@example.com',
        displayName: 'Creator'
      }
    ])

    await insertHackathonsInBatches(harness, [
      ...Array.from({ length: 120 }, (_, index) => ({
        id: `hackathon_public_${index + 1}`,
        name: `Public Hackathon ${index + 1}`,
        slug: `public-hackathon-${index + 1}`,
        description: 'Public',
        city: 'Vienna',
        address: 'Address',
        registrationOpensAt: '2026-03-20T12:00:00.000Z',
        registrationClosesAt: '2026-03-23T12:00:00.000Z',
        submissionOpensAt: '2026-03-23T12:00:00.000Z',
        submissionClosesAt: '2026-03-25T12:00:00.000Z',
        state: 'registration_open' as const,
        maxTeamMembers: 5,
        createdByUserId: 'creator_1',
        createdAt: buildOrderedTimestamp(index),
        updatedAt: buildOrderedTimestamp(index)
      })),
      {
        id: 'hackathon_target',
        name: 'Target Public Hackathon',
        slug: 'public-hackathon',
        description: 'Target public detail',
        city: 'Vienna',
        address: 'Address',
        registrationOpensAt: '2026-03-20T12:00:00.000Z',
        registrationClosesAt: '2026-03-23T12:00:00.000Z',
        submissionOpensAt: '2026-03-23T12:00:00.000Z',
        submissionClosesAt: '2026-03-25T12:00:00.000Z',
        state: 'registration_open',
        maxTeamMembers: 5,
        createdByUserId: 'creator_1',
        createdAt: '2026-03-01T00:00:00.000Z',
        updatedAt: '2026-03-01T00:00:00.000Z'
      }
    ])
    await harness.database.insert(hackathonTermsDocuments).values([
      {
        id: 'terms_public_app_1',
        hackathonId: 'hackathon_target',
        documentType: 'application_terms',
        version: 2,
        title: 'Public Application Terms',
        content: 'Public application content',
        publishedAt: '2026-03-01T00:00:00.000Z'
      },
      {
        id: 'terms_public_win_1',
        hackathonId: 'hackathon_target',
        documentType: 'winner_terms',
        version: 1,
        title: 'Public Winner Terms',
        content: 'Public winner content',
        publishedAt: '2026-03-02T00:00:00.000Z'
      }
    ])
    await harness.database
      .update(hackathons)
      .set({
        currentApplicationTermsDocumentId: 'terms_public_app_1',
        currentWinnerTermsDocumentId: 'terms_public_win_1'
      })
      .where(eq(hackathons.id, 'hackathon_target'))

    const response = await harness.request('/api/public/hackathons/public-hackathon')

    expect(response.status).toBe(200)
    const payload = await response.json()

    expect(payload).toMatchObject({
      data: {
        slug: 'public-hackathon',
        name: 'Target Public Hackathon',
        currentTerms: {
          applicationTerms: {
            documentType: 'application_terms',
            version: 2,
            title: 'Public Application Terms'
          },
          winnerTerms: {
            documentType: 'winner_terms',
            version: 1,
            title: 'Public Winner Terms'
          }
        }
      }
    })

    expect(payload.data).not.toHaveProperty('id')
    expect(payload.data).not.toHaveProperty('currentApplicationTermsDocumentId')
    expect(payload.data).not.toHaveProperty('currentWinnerTermsDocumentId')
    expect(payload.data).not.toHaveProperty('createdByUserId')
    expect(payload.data).not.toHaveProperty('createdAt')
    expect(payload.data).not.toHaveProperty('updatedAt')
    expect(payload.data.currentTerms.applicationTerms).not.toHaveProperty('id')
    expect(payload.data.currentTerms.winnerTerms).not.toHaveProperty('id')
  })

  test('GET /api/public/hackathons/:slug/criteria and prizes omit internal identifiers and timestamps', async () => {
    const harness = createApiRouteTestHarness({
      routes: [
        { method: 'get', path: '/api/public/hackathons/:slug/evaluation-criteria', handler: publicHackathonCriteriaGetHandler },
        { method: 'get', path: '/api/public/hackathons/:slug/prizes', handler: publicHackathonPrizesGetHandler }
      ]
    })
    harnesses.push(harness)

    await harness.database.insert(users).values({
      id: 'creator_1',
      auth0Subject: 'auth0|creator_1',
      email: 'creator@example.com',
      displayName: 'Creator'
    })
    await harness.database.insert(hackathons).values({
      id: 'hackathon_public',
      name: 'Public Hackathon',
      slug: 'public-hackathon',
      description: 'Public',
      city: 'Vienna',
      address: 'Address',
      registrationOpensAt: '2026-03-20T12:00:00.000Z',
      registrationClosesAt: '2026-03-23T12:00:00.000Z',
      submissionOpensAt: '2026-03-23T12:00:00.000Z',
      submissionClosesAt: '2026-03-25T12:00:00.000Z',
      state: 'registration_open',
      maxTeamMembers: 5,
      createdByUserId: 'creator_1'
    })
    await harness.database.insert(evaluationCriteria).values({
      id: 'criterion_public',
      hackathonId: 'hackathon_public',
      name: 'Community Impact',
      description: 'Measures external value.',
      weight: 40,
      displayOrder: 1
    })
    await harness.database.insert(prizes).values({
      id: 'prize_public',
      hackathonId: 'hackathon_public',
      name: 'Launch Award',
      description: 'Launch support.',
      rewardType: 'api_credits',
      rewardValue: '5000',
      rewardCurrency: null,
      awardScope: 'team',
      rankStart: 1,
      rankEnd: 1
    })

    const criteriaResponse = await harness.request('/api/public/hackathons/public-hackathon/evaluation-criteria')
    const prizeResponse = await harness.request('/api/public/hackathons/public-hackathon/prizes')

    expect(criteriaResponse.status).toBe(200)
    expect(prizeResponse.status).toBe(200)

    const criteriaPayload = await criteriaResponse.json()
    const prizePayload = await prizeResponse.json()

    expect(criteriaPayload).toMatchObject({
      data: [
        {
          name: 'Community Impact',
          description: 'Measures external value.',
          weight: 40,
          displayOrder: 1
        }
      ]
    })
    expect(criteriaPayload.data[0]).not.toHaveProperty('id')
    expect(criteriaPayload.data[0]).not.toHaveProperty('hackathonId')
    expect(criteriaPayload.data[0]).not.toHaveProperty('createdAt')

    expect(prizePayload).toMatchObject({
      data: [
        {
          name: 'Launch Award',
          description: 'Launch support.',
          rewardType: 'api_credits',
          rewardValue: '5000',
          rewardCurrency: null,
          awardScope: 'team',
          rankStart: 1,
          rankEnd: 1
        }
      ]
    })
    expect(prizePayload.data[0]).not.toHaveProperty('id')
    expect(prizePayload.data[0]).not.toHaveProperty('hackathonId')
    expect(prizePayload.data[0]).not.toHaveProperty('createdAt')
  })

  test('GET /api/hackathons/:hackathonId returns current term references for visible hackathons', async () => {
    const harness = createApiRouteTestHarness({
      routes: [
        { method: 'get', path: '/api/hackathons/:hackathonId', handler: hackathonDetailGetHandler }
      ],
      sessionUser: {
        sub: 'auth0|viewer',
        email: 'viewer@example.com'
      }
    })
    harnesses.push(harness)

    await harness.database.insert(users).values({
      id: 'creator_1',
      auth0Subject: 'auth0|creator_1',
      email: 'creator@example.com',
      displayName: 'Creator'
    })
    await harness.database.insert(hackathons).values({
      id: 'hackathon_public',
      name: 'Public Hackathon',
      slug: 'public-hackathon',
      description: 'Public',
      city: 'Vienna',
      address: 'Address',
      registrationOpensAt: '2026-03-20T12:00:00.000Z',
      registrationClosesAt: '2026-03-23T12:00:00.000Z',
      submissionOpensAt: '2026-03-23T12:00:00.000Z',
      submissionClosesAt: '2026-03-25T12:00:00.000Z',
      state: 'registration_open',
      maxTeamMembers: 5,
      currentApplicationTermsDocumentId: null,
      currentWinnerTermsDocumentId: null,
      createdByUserId: 'creator_1'
    })
    await harness.database.insert(hackathonTermsDocuments).values([
      {
        id: 'terms_app_1',
        hackathonId: 'hackathon_public',
        documentType: 'application_terms',
        version: 2,
        title: 'Application Terms',
        content: 'Application content',
        publishedAt: '2026-03-01T00:00:00.000Z'
      },
      {
        id: 'terms_win_1',
        hackathonId: 'hackathon_public',
        documentType: 'winner_terms',
        version: 3,
        title: 'Winner Terms',
        content: 'Winner content',
        publishedAt: '2026-03-02T00:00:00.000Z'
      }
    ])

    await harness.database
      .update(hackathons)
      .set({
        currentApplicationTermsDocumentId: 'terms_app_1',
        currentWinnerTermsDocumentId: 'terms_win_1'
      })
      .where(eq(hackathons.id, 'hackathon_public'))

    const response = await harness.request('/api/hackathons/hackathon_public')

    expect(response.status).toBe(200)
    expect(await response.json()).toMatchObject({
      data: {
        id: 'hackathon_public',
        slug: 'public-hackathon',
        currentTerms: {
          applicationTerms: {
            id: 'terms_app_1',
            version: 2
          },
          winnerTerms: {
            id: 'terms_win_1',
            version: 3
          }
        }
      }
    })
  })

  test('POST /api/hackathons creates draft hackathons for platform admins and writes audit', async () => {
    const harness = createApiRouteTestHarness({
      routes: [
        { method: 'post', path: '/api/hackathons', handler: hackathonsPostHandler }
      ],
      sessionUser: {
        sub: 'auth0|platform_admin',
        email: 'platform-admin@example.com'
      }
    })
    harnesses.push(harness)

    await harness.database.insert(users).values({
      id: 'platform_admin',
      auth0Subject: 'auth0|platform_admin',
      email: 'platform-admin@example.com',
      displayName: 'Platform Admin',
      isPlatformAdmin: true
    })

    const response = await harness.request('/api/hackathons', {
      method: 'POST',
      body: JSON.stringify({
        name: 'New Hackathon',
        slug: 'new-hackathon',
        description: 'New hackathon',
        agendaItems: [
          {
            id: 'agenda_item_1',
            startsAt: '2026-03-20T12:00:00.000Z',
            endsAt: '2026-03-20T12:30:00.000Z',
            title: 'Opening',
            details: 'Kickoff and orientation.',
            displayOrder: 1
          }
        ],
        city: 'Vienna',
        address: 'Address',
        registrationOpensAt: '2026-03-20T12:00:00.000Z',
        registrationClosesAt: '2026-03-23T12:00:00.000Z',
        submissionOpensAt: '2026-03-23T12:00:00.000Z',
        submissionClosesAt: '2026-03-25T12:00:00.000Z',
        maxTeamMembers: 5,
        requireXProfile: true,
        requireLinkedinProfile: false,
        requireGithubProfile: true,
        requireChatgptEmail: true,
        requireOpenaiOrgId: true,
        requireLumaProfile: true
      })
    })

    expect(response.status).toBe(200)
    const payload = await response.json()
    expect(payload).toMatchObject({
      data: {
        name: 'New Hackathon',
        slug: 'new-hackathon',
        state: 'draft',
        createdByUserId: 'platform_admin',
        agendaItems: [
          expect.objectContaining({
            id: 'agenda_item_1',
            title: 'Opening'
          })
        ],
        requireChatgptEmail: true,
        requireOpenaiOrgId: true,
        requireLumaProfile: true
      }
    })

    const auditEntries = await harness.database.select().from(auditLogs)
    expect(auditEntries).toEqual([
      expect.objectContaining({
        actorUserId: 'platform_admin',
        entityType: 'hackathon',
        action: 'hackathon.created'
      })
    ])
  })

  test('PATCH /api/hackathons/:hackathonId updates configuration for hackathon admins', async () => {
    const harness = createApiRouteTestHarness({
      routes: [
        { method: 'patch', path: '/api/hackathons/:hackathonId', handler: hackathonPatchHandler }
      ],
      sessionUser: {
        sub: 'auth0|admin',
        email: 'admin@example.com'
      }
    })
    harnesses.push(harness)

    await harness.database.insert(users).values([
      {
        id: 'creator_1',
        auth0Subject: 'auth0|creator_1',
        email: 'creator@example.com',
        displayName: 'Creator'
      },
      {
        id: 'hackathon_admin',
        auth0Subject: 'auth0|admin',
        email: 'admin@example.com',
        displayName: 'Hackathon Admin'
      }
    ])
    await harness.database.insert(hackathons).values({
      id: 'hackathon_patch',
      name: 'Patch Hackathon',
      slug: 'patch-hackathon',
      description: 'Old description',
      city: 'Vienna',
      address: 'Old Address',
      registrationOpensAt: '2026-03-20T12:00:00.000Z',
      registrationClosesAt: '2026-03-23T12:00:00.000Z',
      submissionOpensAt: '2026-03-23T12:00:00.000Z',
      submissionClosesAt: '2026-03-25T12:00:00.000Z',
      state: 'registration_open',
      maxTeamMembers: 5,
      createdByUserId: 'creator_1'
    })
    await harness.database.insert(hackathonRoleAssignments).values({
      id: 'role_admin',
      hackathonId: 'hackathon_patch',
      userId: 'hackathon_admin',
      role: 'hackathon_admin',
      isInJudgePool: false,
      createdAt: '2026-03-22T12:00:00.000Z'
    })

    const response = await harness.request('/api/hackathons/hackathon_patch', {
      method: 'PATCH',
      body: JSON.stringify({
        description: 'Updated description',
        agendaItems: [
          {
            id: 'agenda_item_2',
            startsAt: '2026-03-24T09:00:00.000Z',
            endsAt: null,
            title: 'Updated item',
            details: null,
            displayOrder: 1
          }
        ],
        city: 'Berlin',
        maxTeamMembers: 7,
        requireChatgptEmail: true,
        requireOpenaiOrgId: true,
        requireLumaProfile: true
      })
    })

    expect(response.status).toBe(200)
    expect(await response.json()).toMatchObject({
      data: {
        id: 'hackathon_patch',
        description: 'Updated description',
        agendaItems: [
          expect.objectContaining({
            id: 'agenda_item_2',
            title: 'Updated item'
          })
        ],
        city: 'Berlin',
        maxTeamMembers: 7,
        requireChatgptEmail: true,
        requireOpenaiOrgId: true,
        requireLumaProfile: true
      }
    })
  })

  test('PATCH /api/hackathons/:hackathonId rewrites managed image URLs when slug changes', async () => {
    const harness = createApiRouteTestHarness({
      routes: [
        { method: 'patch', path: '/api/hackathons/:hackathonId', handler: hackathonPatchHandler }
      ],
      sessionUser: {
        sub: 'auth0|admin',
        email: 'admin@example.com'
      }
    })
    harnesses.push(harness)

    await harness.database.insert(users).values([
      {
        id: 'creator_1',
        auth0Subject: 'auth0|creator_1',
        email: 'creator@example.com',
        displayName: 'Creator'
      },
      {
        id: 'hackathon_admin',
        auth0Subject: 'auth0|admin',
        email: 'admin@example.com',
        displayName: 'Hackathon Admin'
      }
    ])
    await harness.database.insert(hackathons).values({
      id: 'hackathon_patch_slug',
      name: 'Patch Hackathon',
      slug: 'patch-hackathon',
      description: 'Old description',
      backgroundImageUrl: 'http://localhost/api/public/hackathons/patch-hackathon/images/background',
      bannerImageUrl: 'http://localhost/api/public/hackathons/patch-hackathon/images/banner',
      city: 'Vienna',
      address: 'Old Address',
      registrationOpensAt: '2026-03-20T12:00:00.000Z',
      registrationClosesAt: '2026-03-23T12:00:00.000Z',
      submissionOpensAt: '2026-03-23T12:00:00.000Z',
      submissionClosesAt: '2026-03-25T12:00:00.000Z',
      state: 'registration_open',
      maxTeamMembers: 5,
      createdByUserId: 'creator_1'
    })
    await harness.database.insert(hackathonRoleAssignments).values({
      id: 'role_admin_slug',
      hackathonId: 'hackathon_patch_slug',
      userId: 'hackathon_admin',
      role: 'hackathon_admin',
      isInJudgePool: false,
      createdAt: '2026-03-22T12:00:00.000Z'
    })

    const response = await harness.request('/api/hackathons/hackathon_patch_slug', {
      method: 'PATCH',
      body: JSON.stringify({
        slug: 'patch-hackathon-2026'
      })
    })

    expect(response.status).toBe(200)
    expect(await response.json()).toMatchObject({
      data: {
        id: 'hackathon_patch_slug',
        slug: 'patch-hackathon-2026',
        backgroundImageUrl: 'http://localhost/api/public/hackathons/patch-hackathon-2026/images/background',
        bannerImageUrl: 'http://localhost/api/public/hackathons/patch-hackathon-2026/images/banner'
      }
    })
  })

  test('hackathon image routes upload, read, and remove hackathon background and banner images', async () => {
    const hackathonImagesBucket = new InMemoryR2Bucket()
    const harness = createApiRouteTestHarness({
      routes: [
        { method: 'post', path: '/api/hackathons/:hackathonId/images/background', handler: hackathonBackgroundImagePostHandler },
        { method: 'delete', path: '/api/hackathons/:hackathonId/images/background', handler: hackathonBackgroundImageDeleteHandler },
        { method: 'post', path: '/api/hackathons/:hackathonId/images/banner', handler: hackathonBannerImagePostHandler },
        { method: 'delete', path: '/api/hackathons/:hackathonId/images/banner', handler: hackathonBannerImageDeleteHandler },
        { method: 'get', path: '/api/public/hackathons/:slug/images/background', handler: publicHackathonBackgroundImageGetHandler },
        { method: 'get', path: '/api/public/hackathons/:slug/images/banner', handler: publicHackathonBannerImageGetHandler }
      ],
      sessionUser: {
        sub: 'auth0|hackathon_admin',
        email: 'hackathon-admin@example.com'
      },
      cloudflareEnv: {
        [hackathonImagesBindingName]: hackathonImagesBucket
      },
      runtimeConfig: {
        hackathonImages: {
          binding: hackathonImagesBindingName
        }
      }
    })
    harnesses.push(harness)

    await harness.database.insert(users).values([
      {
        id: 'creator_1',
        auth0Subject: 'auth0|creator_1',
        email: 'creator@example.com',
        displayName: 'Creator'
      },
      {
        id: 'hackathon_admin',
        auth0Subject: 'auth0|hackathon_admin',
        email: 'hackathon-admin@example.com',
        displayName: 'Hackathon Admin'
      }
    ])
    await harness.database.insert(hackathons).values({
      id: 'hackathon_images',
      name: 'Image Hackathon',
      slug: 'image-hackathon',
      description: 'Hackathon with managed images',
      city: 'Vienna',
      address: 'Address',
      registrationOpensAt: '2026-03-20T12:00:00.000Z',
      registrationClosesAt: '2026-03-23T12:00:00.000Z',
      submissionOpensAt: '2026-03-23T12:00:00.000Z',
      submissionClosesAt: '2026-03-25T12:00:00.000Z',
      state: 'registration_open',
      maxTeamMembers: 5,
      createdByUserId: 'creator_1'
    })
    await harness.database.insert(hackathonRoleAssignments).values({
      id: 'role_admin',
      hackathonId: 'hackathon_images',
      userId: 'hackathon_admin',
      role: 'hackathon_admin',
      isInJudgePool: false,
      createdAt: '2026-03-22T12:00:00.000Z'
    })

    const backgroundUploadForm = new FormData()
    backgroundUploadForm.append(
      'file',
      new Blob([new Uint8Array([1, 2, 3])], { type: 'image/png' }),
      'background.png'
    )

    const backgroundUploadResponse = await harness.request('/api/hackathons/hackathon_images/images/background', {
      method: 'POST',
      body: backgroundUploadForm
    })

    expect(backgroundUploadResponse.status).toBe(200)
    expect(await backgroundUploadResponse.json()).toMatchObject({
      data: {
        id: 'hackathon_images',
        backgroundImageUrl: 'http://localhost/api/public/hackathons/image-hackathon/images/background'
      }
    })

    const backgroundResponse = await harness.request('/api/public/hackathons/image-hackathon/images/background')

    expect(backgroundResponse.status).toBe(200)
    expect(backgroundResponse.headers.get('content-type')).toBe('image/png')
    expect(new Uint8Array(await backgroundResponse.arrayBuffer())).toEqual(new Uint8Array([1, 2, 3]))

    const bannerUploadForm = new FormData()
    bannerUploadForm.append(
      'file',
      new Blob([new Uint8Array([9, 8, 7])], { type: 'image/png' }),
      'banner.png'
    )

    const bannerUploadResponse = await harness.request('/api/hackathons/hackathon_images/images/banner', {
      method: 'POST',
      body: bannerUploadForm
    })

    expect(bannerUploadResponse.status).toBe(200)
    expect(await bannerUploadResponse.json()).toMatchObject({
      data: {
        id: 'hackathon_images',
        bannerImageUrl: 'http://localhost/api/public/hackathons/image-hackathon/images/banner'
      }
    })

    const bannerResponse = await harness.request('/api/public/hackathons/image-hackathon/images/banner')

    expect(bannerResponse.status).toBe(200)
    expect(bannerResponse.headers.get('content-type')).toBe('image/png')
    expect(new Uint8Array(await bannerResponse.arrayBuffer())).toEqual(new Uint8Array([9, 8, 7]))

    const backgroundDeleteResponse = await harness.request('/api/hackathons/hackathon_images/images/background', {
      method: 'DELETE'
    })

    expect(backgroundDeleteResponse.status).toBe(200)
    expect(await backgroundDeleteResponse.json()).toMatchObject({
      data: {
        id: 'hackathon_images',
        backgroundImageUrl: null
      }
    })

    const missingBackgroundResponse = await harness.request('/api/public/hackathons/image-hackathon/images/background')

    expect(missingBackgroundResponse.status).toBe(404)
    expect(await missingBackgroundResponse.json()).toMatchObject({
      error: {
        code: 'hackathon_background_image_not_found'
      }
    })

    const bannerDeleteResponse = await harness.request('/api/hackathons/hackathon_images/images/banner', {
      method: 'DELETE'
    })

    expect(bannerDeleteResponse.status).toBe(200)
    expect(await bannerDeleteResponse.json()).toMatchObject({
      data: {
        id: 'hackathon_images',
        bannerImageUrl: null
      }
    })

    const missingBannerResponse = await harness.request('/api/public/hackathons/image-hackathon/images/banner')

    expect(missingBannerResponse.status).toBe(404)
    expect(await missingBannerResponse.json()).toMatchObject({
      error: {
        code: 'hackathon_banner_image_not_found'
      }
    })
  })

  test('POST /api/hackathons/:hackathonId/images/background rejects invalid image files', async () => {
    const hackathonImagesBucket = new InMemoryR2Bucket()
    const harness = createApiRouteTestHarness({
      routes: [
        { method: 'post', path: '/api/hackathons/:hackathonId/images/background', handler: hackathonBackgroundImagePostHandler }
      ],
      sessionUser: {
        sub: 'auth0|hackathon_admin',
        email: 'hackathon-admin@example.com'
      },
      cloudflareEnv: {
        [hackathonImagesBindingName]: hackathonImagesBucket
      },
      runtimeConfig: {
        hackathonImages: {
          binding: hackathonImagesBindingName
        }
      }
    })
    harnesses.push(harness)

    await harness.database.insert(users).values([
      {
        id: 'creator_1',
        auth0Subject: 'auth0|creator_1',
        email: 'creator@example.com',
        displayName: 'Creator'
      },
      {
        id: 'hackathon_admin',
        auth0Subject: 'auth0|hackathon_admin',
        email: 'hackathon-admin@example.com',
        displayName: 'Hackathon Admin'
      }
    ])
    await harness.database.insert(hackathons).values({
      id: 'hackathon_images',
      name: 'Image Hackathon',
      slug: 'image-hackathon',
      description: 'Hackathon with managed images',
      city: 'Vienna',
      address: 'Address',
      registrationOpensAt: '2026-03-20T12:00:00.000Z',
      registrationClosesAt: '2026-03-23T12:00:00.000Z',
      submissionOpensAt: '2026-03-23T12:00:00.000Z',
      submissionClosesAt: '2026-03-25T12:00:00.000Z',
      state: 'registration_open',
      maxTeamMembers: 5,
      createdByUserId: 'creator_1'
    })
    await harness.database.insert(hackathonRoleAssignments).values({
      id: 'role_admin',
      hackathonId: 'hackathon_images',
      userId: 'hackathon_admin',
      role: 'hackathon_admin',
      isInJudgePool: false,
      createdAt: '2026-03-22T12:00:00.000Z'
    })

    const invalidTypeForm = new FormData()
    invalidTypeForm.append(
      'file',
      new Blob([new Uint8Array([1, 2, 3])], { type: 'image/gif' }),
      'background.gif'
    )

    const invalidTypeResponse = await harness.request('/api/hackathons/hackathon_images/images/background', {
      method: 'POST',
      body: invalidTypeForm
    })

    expect(invalidTypeResponse.status).toBe(400)
    expect(await invalidTypeResponse.json()).toMatchObject({
      error: {
        code: 'hackathon_image_content_type_invalid'
      }
    })

    const oversizedForm = new FormData()
    oversizedForm.append(
      'file',
      new Blob([new Uint8Array((5 * 1024 * 1024) + 1)], { type: 'image/png' }),
      'background.png'
    )

    const oversizedResponse = await harness.request('/api/hackathons/hackathon_images/images/background', {
      method: 'POST',
      body: oversizedForm
    })

    expect(oversizedResponse.status).toBe(400)
    expect(await oversizedResponse.json()).toMatchObject({
      error: {
        code: 'hackathon_image_file_too_large'
      }
    })
  })

  test('POST /api/hackathons/:hackathonId/actions/open-submission opens submission and audits the state change', async () => {
    const harness = createApiRouteTestHarness({
      routes: [
        {
          method: 'post',
          path: '/api/hackathons/:hackathonId/actions/open-submission',
          handler: openSubmissionPostHandler
        }
      ],
      sessionUser: {
        sub: 'auth0|platform_admin',
        email: 'platform-admin@example.com'
      }
    })
    harnesses.push(harness)

    await harness.database.insert(users).values({
      id: 'platform_admin',
      auth0Subject: 'auth0|platform_admin',
      email: 'platform-admin@example.com',
      displayName: 'Platform Admin',
      isPlatformAdmin: true
    })

    const now = Date.now()
    await harness.database.insert(hackathons).values({
      id: 'hackathon_open_submission',
      name: 'Open Submission Hackathon',
      slug: 'open-submission-hackathon',
      description: 'Open submission',
      city: 'Vienna',
      address: 'Address',
      registrationOpensAt: new Date(now - 86_400_000).toISOString(),
      registrationClosesAt: new Date(now - 60_000).toISOString(),
      submissionOpensAt: new Date(now - 60_000).toISOString(),
      submissionClosesAt: new Date(now + 86_400_000).toISOString(),
      state: 'registration_open',
      maxTeamMembers: 5,
      createdByUserId: 'platform_admin'
    })

    const response = await harness.request('/api/hackathons/hackathon_open_submission/actions/open-submission', {
      method: 'POST'
    })

    expect(response.status).toBe(200)
    expect(await response.json()).toMatchObject({
      data: {
        id: 'hackathon_open_submission',
        state: 'submission_open'
      }
    })

    const updatedHackathon = await harness.database.query.hackathons.findFirst({
      where: eq(hackathons.id, 'hackathon_open_submission')
    })
    const auditEntries = await harness.database.select().from(auditLogs)

    expect(updatedHackathon?.state).toBe('submission_open')
    expect(auditEntries).toEqual([
      expect.objectContaining({
        actorUserId: 'platform_admin',
        entityType: 'hackathon',
        entityId: 'hackathon_open_submission',
        action: 'hackathon.open_submission'
      })
    ])
  })

  test('POST /api/hackathons/:hackathonId/actions/start-judging-preparation locks submissions, snapshots members, creates assignments, and audits', async () => {
    const harness = createApiRouteTestHarness({
      routes: [
        {
          method: 'post',
          path: '/api/hackathons/:hackathonId/actions/start-judging-preparation',
          handler: startJudgingPreparationPostHandler
        }
      ],
      sessionUser: {
        sub: 'auth0|platform_admin',
        email: 'platform-admin@example.com'
      }
    })
    harnesses.push(harness)

    await harness.database.insert(users).values([
      {
        id: 'platform_admin',
        auth0Subject: 'auth0|platform_admin',
        email: 'platform-admin@example.com',
        displayName: 'Platform Admin',
        isPlatformAdmin: true
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
      id: 'hackathon_judging_prep',
      name: 'Judging Prep Hackathon',
      slug: 'judging-prep-hackathon',
      description: 'Judging preparation',
      city: 'Vienna',
      address: 'Address',
      registrationOpensAt: '2026-03-18T12:00:00.000Z',
      registrationClosesAt: '2026-03-19T12:00:00.000Z',
      submissionOpensAt: '2026-03-19T12:00:00.000Z',
      submissionClosesAt: '2026-03-21T12:00:00.000Z',
      state: 'submission_open',
      maxTeamMembers: 5,
      createdByUserId: 'platform_admin'
    })

    await harness.database.insert(hackathonRoleAssignments).values([
      {
        id: 'role_judge_a',
        hackathonId: 'hackathon_judging_prep',
        userId: 'judge_a',
        role: 'judge',
        isInJudgePool: true,
        createdAt: '2026-03-22T12:00:00.000Z'
      },
      {
        id: 'role_judge_b',
        hackathonId: 'hackathon_judging_prep',
        userId: 'judge_b',
        role: 'judge',
        isInJudgePool: true,
        createdAt: '2026-03-22T12:01:00.000Z'
      }
    ])

    await harness.database.insert(teams).values([
      {
        id: 'team_1',
        hackathonId: 'hackathon_judging_prep',
        name: 'Alpha Team',
        slug: 'alpha-team',
        isOpenToJoinRequests: false,
        createdByUserId: 'team_admin',
        createdAt: '2026-03-22T12:00:00.000Z',
        updatedAt: '2026-03-22T12:00:00.000Z'
      },
      {
        id: 'team_2',
        hackathonId: 'hackathon_judging_prep',
        name: 'Beta Team',
        slug: 'beta-team',
        isOpenToJoinRequests: false,
        createdByUserId: 'other_team_admin',
        createdAt: '2026-03-22T12:05:00.000Z',
        updatedAt: '2026-03-22T12:05:00.000Z'
      }
    ])

    await harness.database.insert(teamMembers).values([
      {
        id: 'membership_admin',
        teamId: 'team_1',
        userId: 'team_admin',
        role: 'admin',
        joinedAt: '2026-03-22T12:00:00.000Z',
        createdAt: '2026-03-22T12:00:00.000Z'
      },
      {
        id: 'membership_member',
        teamId: 'team_1',
        userId: 'team_member',
        role: 'member',
        joinedAt: '2026-03-22T12:01:00.000Z',
        createdAt: '2026-03-22T12:01:00.000Z'
      },
      {
        id: 'membership_other_admin',
        teamId: 'team_2',
        userId: 'other_team_admin',
        role: 'admin',
        joinedAt: '2026-03-22T12:05:00.000Z',
        createdAt: '2026-03-22T12:05:00.000Z'
      }
    ])

    await harness.database.insert(submissions).values([
      {
        id: 'submission_1',
        teamId: 'team_1',
        status: 'submitted',
        projectName: 'Project One',
        submittedAt: '2026-03-24T12:00:00.000Z',
        createdAt: '2026-03-24T12:00:00.000Z',
        updatedAt: '2026-03-24T12:00:00.000Z'
      },
      {
        id: 'submission_2',
        teamId: 'team_2',
        status: 'submitted',
        projectName: 'Project Two',
        submittedAt: '2026-03-24T12:05:00.000Z',
        createdAt: '2026-03-24T12:05:00.000Z',
        updatedAt: '2026-03-24T12:05:00.000Z'
      }
    ])

    const response = await harness.request('/api/hackathons/hackathon_judging_prep/actions/start-judging-preparation', {
      method: 'POST'
    })

    expect(response.status).toBe(200)
    expect(await response.json()).toMatchObject({
      data: {
        id: 'hackathon_judging_prep',
        state: 'judging_preparation'
      }
    })

    const updatedHackathon = await harness.database.query.hackathons.findFirst({
      where: eq(hackathons.id, 'hackathon_judging_prep')
    })
    const lockedSubmissions = await harness.database.select().from(submissions)
    const snapshotRows = await harness.database.select().from(prizeEligibilitySnapshots)
    const assignmentRows = await harness.database.select().from(judgeAssignments)
    const auditEntries = await harness.database.select().from(auditLogs)

    expect(updatedHackathon?.state).toBe('judging_preparation')
    expect(lockedSubmissions).toEqual(expect.arrayContaining([
      expect.objectContaining({
        id: 'submission_1',
        status: 'locked'
      }),
      expect.objectContaining({
        id: 'submission_2',
        status: 'locked'
      })
    ]))
    expect(snapshotRows).toHaveLength(3)
    expect(assignmentRows).toHaveLength(2)
    expect(assignmentRows.map(row => row.judgeUserId).sort()).toEqual(['judge_a', 'judge_b'])
    expect(auditEntries).toEqual([
      expect.objectContaining({
        actorUserId: 'platform_admin',
        entityType: 'hackathon',
        entityId: 'hackathon_judging_prep',
        action: 'hackathon.start_judging_preparation'
      })
    ])
  })

  test('POST /api/hackathons/:hackathonId/actions/start-judge-review advances when locked submissions already have active assignments', async () => {
    const harness = createApiRouteTestHarness({
      routes: [
        {
          method: 'post',
          path: '/api/hackathons/:hackathonId/actions/start-judge-review',
          handler: startJudgeReviewPostHandler
        }
      ],
      sessionUser: {
        sub: 'auth0|platform_admin',
        email: 'platform-admin@example.com'
      }
    })
    harnesses.push(harness)

    await harness.database.insert(users).values([
      {
        id: 'platform_admin',
        auth0Subject: 'auth0|platform_admin',
        email: 'platform-admin@example.com',
        displayName: 'Platform Admin',
        isPlatformAdmin: true
      },
      {
        id: 'judge_a',
        auth0Subject: 'auth0|judge_a',
        email: 'judge-a@example.com',
        displayName: 'Judge A'
      },
      {
        id: 'team_admin',
        auth0Subject: 'auth0|team_admin',
        email: 'team-admin@example.com',
        displayName: 'Team Admin'
      }
    ])

    await harness.database.insert(hackathons).values({
      id: 'hackathon_judge_review',
      name: 'Judge Review Hackathon',
      slug: 'judge-review-hackathon',
      description: 'Judge review',
      city: 'Vienna',
      address: 'Address',
      registrationOpensAt: '2026-03-20T12:00:00.000Z',
      registrationClosesAt: '2026-03-23T12:00:00.000Z',
      submissionOpensAt: '2026-03-23T12:00:00.000Z',
      submissionClosesAt: '2026-03-25T12:00:00.000Z',
      state: 'judging_preparation',
      maxTeamMembers: 5,
      createdByUserId: 'platform_admin'
    })

    await harness.database.insert(teams).values({
      id: 'team_1',
      hackathonId: 'hackathon_judge_review',
      name: 'Alpha Team',
      slug: 'alpha-team',
      isOpenToJoinRequests: false,
      createdByUserId: 'team_admin',
      createdAt: '2026-03-22T12:00:00.000Z',
      updatedAt: '2026-03-22T12:00:00.000Z'
    })

    await harness.database.insert(submissions).values({
      id: 'submission_1',
      teamId: 'team_1',
      status: 'locked',
      projectName: 'Project One',
      submittedAt: '2026-03-24T12:00:00.000Z',
      lockedAt: '2026-03-25T12:30:00.000Z',
      createdAt: '2026-03-24T12:00:00.000Z',
      updatedAt: '2026-03-25T12:30:00.000Z'
    })

    await harness.database.insert(judgeAssignments).values({
      id: 'assignment_1',
      hackathonId: 'hackathon_judge_review',
      submissionId: 'submission_1',
      judgeUserId: 'judge_a',
      status: 'assigned',
      assignedAt: '2026-03-25T12:30:00.000Z',
      createdAt: '2026-03-25T12:30:00.000Z'
    })

    const response = await harness.request('/api/hackathons/hackathon_judge_review/actions/start-judge-review', {
      method: 'POST'
    })

    expect(response.status).toBe(200)
    expect(await response.json()).toMatchObject({
      data: {
        id: 'hackathon_judge_review',
        state: 'judge_review'
      }
    })

    const updatedHackathon = await harness.database.query.hackathons.findFirst({
      where: eq(hackathons.id, 'hackathon_judge_review')
    })
    const auditEntries = await harness.database.select().from(auditLogs)

    expect(updatedHackathon?.state).toBe('judge_review')
    expect(auditEntries).toEqual([
      expect.objectContaining({
        actorUserId: 'platform_admin',
        entityType: 'hackathon',
        entityId: 'hackathon_judge_review',
        action: 'hackathon.start_judge_review'
      })
    ])
  })
})
