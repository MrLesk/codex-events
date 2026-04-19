import { afterEach, describe, expect, test, vi } from 'vitest'

import { eq } from 'drizzle-orm'

import hackathonsGetHandler from '../../../../server/api/hackathons/index.get'
import hackathonParticipationGetHandler from '../../../../server/api/hackathons/participation.get'
import ownHackathonRankGetHandler from '../../../../server/api/hackathons/[hackathonId]/rank/me.get'
import hackathonsPostHandler from '../../../../server/api/hackathons/index.post'
import hackathonDetailGetHandler from '../../../../server/api/hackathons/[hackathonId]/index.get'
import hackathonCriteriaGetHandler from '../../../../server/api/hackathons/[hackathonId]/evaluation-criteria/index.get'
import hackathonJudgesGetHandler from '../../../../server/api/hackathons/[hackathonId]/judges/index.get'
import hackathonPrizesGetHandler from '../../../../server/api/hackathons/[hackathonId]/prizes/index.get'
import hackathonStaffGetHandler from '../../../../server/api/hackathons/[hackathonId]/staff/index.get'
import hackathonBySlugGetHandler from '../../../../server/api/hackathons/slug/[slug]/index.get'
import openRegistrationPostHandler from '../../../../server/api/hackathons/[hackathonId]/actions/open-registration.post'
import publicHackathonsGetHandler from '../../../../server/api/public/hackathons/index.get'
import publicHackathonDetailGetHandler from '../../../../server/api/public/hackathons/[slug]/index.get'
import publicHackathonCriteriaGetHandler from '../../../../server/api/public/hackathons/[slug]/evaluation-criteria/index.get'
import publicHackathonPrizesGetHandler from '../../../../server/api/public/hackathons/[slug]/prizes/index.get'
import publicHackathonPublishedProjectsGetHandler from '../../../../server/api/public/hackathons/[slug]/published-projects/index.get'
import publicHackathonPublishedProjectProfileIconGetHandler from '../../../../server/api/public/hackathons/[slug]/published-projects/[userId]/profile-icon.get'
import publicHackathonWinnersGetHandler from '../../../../server/api/public/hackathons/[slug]/winners/index.get'
import publicHackathonWinnerProfileIconGetHandler from '../../../../server/api/public/hackathons/[slug]/winners/[userId]/profile-icon.get'
import publicHackathonBackgroundImageGetHandler from '../../../../server/api/public/hackathons/[slug]/images/background.get'
import publicHackathonBannerImageGetHandler from '../../../../server/api/public/hackathons/[slug]/images/banner.get'
import hackathonPatchHandler from '../../../../server/api/hackathons/[hackathonId]/index.patch'
import hackathonBackgroundImageDeleteHandler from '../../../../server/api/hackathons/[hackathonId]/images/background.delete'
import hackathonBackgroundImagePostHandler from '../../../../server/api/hackathons/[hackathonId]/images/background.post'
import hackathonBannerImageDeleteHandler from '../../../../server/api/hackathons/[hackathonId]/images/banner.delete'
import hackathonBannerImagePostHandler from '../../../../server/api/hackathons/[hackathonId]/images/banner.post'
import hackathonPhotosGetHandler from '../../../../server/api/hackathons/[hackathonId]/photos/index.get'
import hackathonPhotosPostHandler from '../../../../server/api/hackathons/[hackathonId]/photos/index.post'
import hackathonPhotoDeleteHandler from '../../../../server/api/hackathons/[hackathonId]/photos/[photoId].delete'
import hackathonPhotoImageGetHandler from '../../../../server/api/hackathons/[hackathonId]/photos/[photoId]/image.get'
import openSubmissionPostHandler from '../../../../server/api/hackathons/[hackathonId]/actions/open-submission.post'
import startJudgingPreparationPostHandler from '../../../../server/api/hackathons/[hackathonId]/actions/start-judging-preparation.post'
import startBlindReviewPostHandler from '../../../../server/api/hackathons/[hackathonId]/actions/start-blind-review.post'
import startPitchPostHandler from '../../../../server/api/hackathons/[hackathonId]/actions/start-pitch.post'
import advancePitchPresentationPostHandler from '../../../../server/api/hackathons/[hackathonId]/actions/advance-pitch-presentation.post'
import startPitchReviewPostHandler from '../../../../server/api/hackathons/[hackathonId]/actions/start-pitch-review.post'
import {
  auditLogs,
  evaluationCriteria,
  hackathonPhotos,
  hackathonRoleAssignments,
  hackathonTermsDocuments,
  hackathons,
  judgeAssignments,
  judgeCriterionScores,
  platformDocuments,
  prizes,
  prizeEligibilitySnapshots,
  prizeRedemptions,
  submissions,
  teamMembers,
  teams,
  userPlatformDocumentAcceptances,
  userApplications,
  users
} from '../../../../server/database/schema'
import { authenticatedUploadRateLimitBindingName } from '../../../../server/utils/rate-limit'
import { createApiRouteTestHarness } from '../../../support/backend/api-route'

describe('TASK-3.5 hackathon CRUD routes', () => {
  const harnesses: Array<ReturnType<typeof createApiRouteTestHarness>> = []
  const hackathonImagesBindingName = 'HACKATHON_IMAGES'
  const pngSignatureBytes = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])

  function createOversizedPngBytes(size: number) {
    const data = new Uint8Array(size)
    data.set(pngSignatureBytes)
    return data
  }

  function createRateLimiter(success = true) {
    return {
      limit: vi.fn(async () => ({ success }))
    }
  }

  function createImagesBinding(options?: {
    width?: number
    height?: number
    previewBytes?: Uint8Array
  }) {
    const width = options?.width ?? 1600
    const height = options?.height ?? 900
    const previewBytes = options?.previewBytes ?? new Uint8Array([0x52, 0x49, 0x46, 0x46])

    return {
      info: vi.fn(async () => ({ width, height })),
      input: vi.fn(() => ({
        transform: vi.fn(() => ({
          output: vi.fn(async () => ({
            response: () => new Response(previewBytes, {
              status: 200
            }),
            contentType: () => 'image/webp'
          }))
        }))
      }))
    }
  }

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
    chunkSize = 3
  ) {
    for (let index = 0; index < rows.length; index += chunkSize) {
      await harness.database.insert(hackathons).values(rows.slice(index, index + chunkSize))
    }
  }

  function enforceD1BindParameterLimit(
    harness: ReturnType<typeof createApiRouteTestHarness>,
    maxBoundParametersPerStatement = 100
  ) {
    const originalPrepare = harness.d1Database.prepare.bind(harness.d1Database)

    vi.spyOn(harness.d1Database, 'prepare').mockImplementation((sql: string) => {
      const boundParameterCount = (sql.match(/\?/g) ?? []).length

      if (boundParameterCount > maxBoundParametersPerStatement) {
        throw new Error(`D1 bind parameter limit exceeded: ${boundParameterCount}`)
      }

      return originalPrepare(sql)
    })
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

  async function seedCurrentPlatformConsent(
    harness: ReturnType<typeof createApiRouteTestHarness>,
    userId: string
  ) {
    await harness.database.insert(platformDocuments).values([
      {
        id: 'privacy_v1',
        documentType: 'privacy_policy',
        version: 1,
        title: 'Privacy Policy v1',
        content: 'Privacy',
        publishedAt: '2026-03-01T00:00:00.000Z'
      },
      {
        id: 'terms_v1',
        documentType: 'platform_terms',
        version: 1,
        title: 'Platform Terms v1',
        content: 'Terms',
        publishedAt: '2026-03-02T00:00:00.000Z'
      }
    ])
    await harness.database.insert(userPlatformDocumentAcceptances).values([
      {
        id: `acceptance_${userId}_privacy`,
        userId,
        platformDocumentId: 'privacy_v1',
        acceptedAt: '2026-03-03T00:00:00.000Z'
      },
      {
        id: `acceptance_${userId}_terms`,
        userId,
        platformDocumentId: 'terms_v1',
        acceptedAt: '2026-03-03T00:00:00.000Z'
      }
    ])
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
        country: 'Austria',
        address: 'Address',
        registrationOpensAt: '2026-03-20T12:00:00.000Z',
        registrationClosesAt: '2026-03-23T12:00:00.000Z',
        submissionOpensAt: '2026-03-23T12:00:00.000Z',
        submissionClosesAt: '2026-03-25T12:00:00.000Z',
        state: 'registration_open',
        maxTeamMembers: 5,
        blindReviewCount: 2,
        pitchReviewEnabled: true,
        blindScoreWeightPercent: 60,
        pitchScoreWeightPercent: 40,
        createdByUserId: 'creator_1'
      },
      {
        id: 'hackathon_draft',
        name: 'Draft Hackathon',
        slug: 'draft-hackathon',
        description: 'Draft',
        city: 'Vienna',
        country: 'Austria',
        address: 'Address',
        registrationOpensAt: '2026-03-20T12:00:00.000Z',
        registrationClosesAt: '2026-03-23T12:00:00.000Z',
        submissionOpensAt: '2026-03-23T12:00:00.000Z',
        submissionClosesAt: '2026-03-25T12:00:00.000Z',
        state: 'draft',
        maxTeamMembers: 5,
        blindReviewCount: 1,
        pitchReviewEnabled: false,
        blindScoreWeightPercent: 70,
        pitchScoreWeightPercent: 30,
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
          slug: 'public-hackathon',
          state: 'registration_open',
          blindReviewCount: 2,
          pitchReviewEnabled: true,
          blindScoreWeightPercent: 60,
          pitchScoreWeightPercent: 40
        })
      ],
      meta: {
        total: 1
      }
    })
  })

  test('internal draft workspace endpoints resolve for authorized actors while public draft endpoints stay hidden', async () => {
    const harness = createApiRouteTestHarness({
      routes: [
        { method: 'get', path: '/api/hackathons/slug/:slug', handler: hackathonBySlugGetHandler },
        { method: 'get', path: '/api/hackathons/:hackathonId/evaluation-criteria', handler: hackathonCriteriaGetHandler },
        { method: 'get', path: '/api/hackathons/:hackathonId/prizes', handler: hackathonPrizesGetHandler },
        { method: 'get', path: '/api/public/hackathons/:slug', handler: publicHackathonDetailGetHandler },
        { method: 'get', path: '/api/public/hackathons/:slug/evaluation-criteria', handler: publicHackathonCriteriaGetHandler },
        { method: 'get', path: '/api/public/hackathons/:slug/prizes', handler: publicHackathonPrizesGetHandler }
      ],
      sessionUser: {
        sub: 'auth0|internal_admin',
        email: 'internal-admin@example.com',
        name: 'Internal Admin'
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
        id: 'internal_admin',
        auth0Subject: 'auth0|internal_admin',
        email: 'internal-admin@example.com',
        displayName: 'Internal Admin'
      }
    ])
    await harness.database.insert(hackathons).values({
      id: 'hackathon_draft_internal',
      name: 'Draft Internal Hackathon',
      slug: 'draft-internal-hackathon',
      description: 'Draft only',
      city: 'Vienna',
      country: 'Austria',
      address: 'Address',
      lumaEventUrl: 'https://luma.com/a4i7qtbo',
      registrationOpensAt: '2026-03-20T12:00:00.000Z',
      registrationClosesAt: '2026-03-23T12:00:00.000Z',
      submissionOpensAt: '2026-03-23T12:00:00.000Z',
      submissionClosesAt: '2026-03-25T12:00:00.000Z',
      state: 'draft',
      maxTeamMembers: 5,
      requireLumaEmail: true,
      createdByUserId: 'creator_1'
    })
    await harness.database.insert(hackathonRoleAssignments).values({
      id: 'role_draft_internal_admin',
      hackathonId: 'hackathon_draft_internal',
      userId: 'internal_admin',
      role: 'hackathon_admin',
      isInJudgePool: false,
      createdAt: '2026-03-20T12:30:00.000Z'
    })
    await harness.database.insert(evaluationCriteria).values({
      id: 'criterion_draft_internal',
      hackathonId: 'hackathon_draft_internal',
      name: 'Craft',
      description: 'Quality',
      weight: 100,
      displayOrder: 1,
      createdAt: '2026-03-20T12:31:00.000Z'
    })
    await harness.database.insert(prizes).values({
      id: 'prize_draft_internal',
      hackathonId: 'hackathon_draft_internal',
      name: 'Internal Prize',
      description: 'Internal only',
      rewardType: 'api_credits',
      rewardValue: '100',
      rewardCurrency: 'USD',
      awardScope: 'team',
      rankStart: 1,
      rankEnd: 1,
      createdAt: '2026-03-20T12:32:00.000Z'
    })

    const internalDetailResponse = await harness.request('/api/hackathons/slug/draft-internal-hackathon')
    expect(internalDetailResponse.status).toBe(200)
    expect(await internalDetailResponse.json()).toMatchObject({
      data: {
        id: 'hackathon_draft_internal',
        slug: 'draft-internal-hackathon',
        state: 'draft',
        lumaEventUrl: 'https://luma.com/a4i7qtbo',
        requireLumaEmail: true
      }
    })

    const internalCriteriaResponse = await harness.request('/api/hackathons/hackathon_draft_internal/evaluation-criteria')
    expect(internalCriteriaResponse.status).toBe(200)
    expect(await internalCriteriaResponse.json()).toMatchObject({
      data: [
        {
          id: 'criterion_draft_internal',
          name: 'Craft'
        }
      ]
    })

    const internalPrizesResponse = await harness.request('/api/hackathons/hackathon_draft_internal/prizes')
    expect(internalPrizesResponse.status).toBe(200)
    expect(await internalPrizesResponse.json()).toMatchObject({
      data: [
        {
          id: 'prize_draft_internal',
          name: 'Internal Prize'
        }
      ]
    })

    const publicDetailResponse = await harness.request('/api/public/hackathons/draft-internal-hackathon')
    expect(publicDetailResponse.status).toBe(404)

    const publicCriteriaResponse = await harness.request('/api/public/hackathons/draft-internal-hackathon/evaluation-criteria')
    expect(publicCriteriaResponse.status).toBe(404)

    const publicPrizesResponse = await harness.request('/api/public/hackathons/draft-internal-hackathon/prizes')
    expect(publicPrizesResponse.status).toBe(404)
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
      },
      {
        id: 'participant_2',
        auth0Subject: 'auth0|participant_2',
        email: 'participant-two@example.com',
        displayName: 'Participant Two'
      }
    ])

    await harness.database.insert(hackathons).values([
      {
        id: 'hackathon_current',
        name: 'Current Hackathon',
        slug: 'current-hackathon',
        description: 'Current program',
        city: 'Vienna',
        country: 'Austria',
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
        country: 'United Kingdom',
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
      },
      {
        id: 'team_past_other',
        hackathonId: 'hackathon_past',
        name: 'Other Past Team',
        slug: 'other-past-team',
        createdByUserId: 'participant_2'
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
      },
      {
        id: 'membership_past_other',
        teamId: 'team_past_other',
        userId: 'participant_2',
        role: 'admin',
        joinedAt: '2026-01-10T16:05:00.000Z',
        leftAt: null
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
      },
      {
        id: 'submission_past_other',
        teamId: 'team_past_other',
        status: 'locked',
        projectName: 'Other Past Project',
        submittedAt: '2026-01-14T11:05:00.000Z',
        lockedAt: '2026-01-15T11:00:00.000Z',
        createdAt: '2026-01-14T10:05:00.000Z',
        updatedAt: '2026-01-15T11:00:00.000Z'
      }
    ])

    await harness.database.insert(evaluationCriteria).values({
      id: 'criterion_past',
      hackathonId: 'hackathon_past',
      name: 'Execution',
      description: 'Execution quality',
      weight: 100,
      displayOrder: 1,
      createdAt: '2026-01-13T09:00:00.000Z'
    })

    await harness.database.insert(judgeAssignments).values([
      {
        id: 'assignment_past_1',
        hackathonId: 'hackathon_past',
        submissionId: 'submission_past',
        judgeUserId: 'creator_1',
        reviewStage: 'blind_review',
        blindReviewSlot: 1,
        status: 'judge_completed',
        assignedAt: '2026-01-15T09:00:00.000Z',
        startedAt: '2026-01-15T09:01:00.000Z',
        completedAt: '2026-01-15T09:02:00.000Z',
        createdAt: '2026-01-15T09:00:00.000Z'
      },
      {
        id: 'assignment_past_2',
        hackathonId: 'hackathon_past',
        submissionId: 'submission_past_other',
        judgeUserId: 'creator_1',
        reviewStage: 'blind_review',
        blindReviewSlot: 1,
        status: 'judge_completed',
        assignedAt: '2026-01-15T09:03:00.000Z',
        startedAt: '2026-01-15T09:04:00.000Z',
        completedAt: '2026-01-15T09:05:00.000Z',
        createdAt: '2026-01-15T09:03:00.000Z'
      }
    ])

    await harness.database.insert(judgeCriterionScores).values([
      {
        id: 'score_past_1',
        judgeAssignmentId: 'assignment_past_1',
        evaluationCriterionId: 'criterion_past',
        score: 4,
        comment: 'Solid',
        createdAt: '2026-01-15T09:02:00.000Z',
        updatedAt: '2026-01-15T09:02:00.000Z'
      },
      {
        id: 'score_past_2',
        judgeAssignmentId: 'assignment_past_2',
        evaluationCriterionId: 'criterion_past',
        score: 5,
        comment: 'Excellent',
        createdAt: '2026-01-15T09:05:00.000Z',
        updatedAt: '2026-01-15T09:05:00.000Z'
      }
    ])

    await harness.database.insert(prizes).values({
      id: 'prize_past_1',
      hackathonId: 'hackathon_past',
      name: 'Grand Prize',
      description: 'Top-ranked team',
      rewardType: 'api_credits',
      rewardValue: '1000',
      rewardCurrency: 'USD',
      awardScope: 'team',
      rankStart: 1,
      rankEnd: 1,
      displayOrder: 1,
      createdAt: '2026-01-15T09:06:00.000Z'
    })

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
            },
            outcome: null
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
            },
            outcome: {
              isShortlisted: false,
              isWinner: false,
              finalRank: 2,
              rankedTeamCount: 2,
              prizes: []
            }
          }
        ]
      }
    })
  })

  test('GET /api/hackathons/:hackathonId/rank/me returns the blind-review placement for completed post-shortlist teams', async () => {
    const harness = createApiRouteTestHarness({
      routes: [
        { method: 'get', path: '/api/hackathons/:hackathonId/rank/me', handler: ownHackathonRankGetHandler }
      ],
      sessionUser: {
        sub: 'auth0|participant_rank_1',
        email: 'participant-rank@example.com'
      }
    })
    harnesses.push(harness)

    await harness.database.insert(users).values([
      {
        id: 'creator_rank_1',
        auth0Subject: 'auth0|creator_rank_1',
        email: 'creator-rank@example.com',
        displayName: 'Creator Rank'
      },
      {
        id: 'participant_rank_1',
        auth0Subject: 'auth0|participant_rank_1',
        email: 'participant-rank@example.com',
        displayName: 'Participant Rank'
      },
      {
        id: 'judge_rank_1',
        auth0Subject: 'auth0|judge_rank_1',
        email: 'judge-rank@example.com',
        displayName: 'Judge Rank'
      },
      {
        id: 'active_unranked_rank_1',
        auth0Subject: 'auth0|active_unranked_rank_1',
        email: 'active-unranked-rank@example.com',
        displayName: 'Active Unranked Rank'
      },
      {
        id: 'dissolved_rank_1',
        auth0Subject: 'auth0|dissolved_rank_1',
        email: 'dissolved-rank@example.com',
        displayName: 'Dissolved Rank'
      }
    ])

    await harness.database.insert(hackathons).values({
      id: 'hackathon_rank_1',
      name: 'Ranked Hackathon',
      slug: 'ranked-hackathon',
      description: 'Completed pitch hackathon',
      city: 'Vienna',
      country: 'Austria',
      address: 'Address',
      registrationOpensAt: '2026-03-01T09:00:00.000Z',
      registrationClosesAt: '2026-03-05T09:00:00.000Z',
      submissionOpensAt: '2026-03-05T09:00:00.000Z',
      submissionClosesAt: '2026-03-10T09:00:00.000Z',
      state: 'completed',
      maxTeamMembers: 5,
      blindReviewCount: 1,
      pitchReviewEnabled: true,
      pitchFinalistSubmissionIdsJson: JSON.stringify(['submission_rank_top', 'submission_rank_runner_up']),
      finalRankingSubmissionIdsJson: JSON.stringify(['submission_rank_top', 'submission_rank_runner_up']),
      createdByUserId: 'creator_rank_1'
    })

    await harness.database.insert(hackathonTermsDocuments).values({
      id: 'terms_rank_1',
      hackathonId: 'hackathon_rank_1',
      documentType: 'application_terms',
      version: 1,
      title: 'Rank terms',
      content: 'Terms',
      publishedAt: '2026-02-28T09:00:00.000Z'
    })

    await harness.database.insert(userApplications).values({
      id: 'application_rank_1',
      hackathonId: 'hackathon_rank_1',
      userId: 'participant_rank_1',
      status: 'approved',
      submittedAt: '2026-03-01T10:00:00.000Z',
      reviewedAt: '2026-03-01T12:00:00.000Z',
      applicationTermsDocumentId: 'terms_rank_1',
      applicationTermsAcceptedAt: '2026-03-01T10:00:00.000Z',
      updatedAt: '2026-03-01T12:00:00.000Z'
    })

    await harness.database.insert(teams).values([
      {
        id: 'team_rank_user',
        hackathonId: 'hackathon_rank_1',
        name: 'User Team',
        slug: 'user-team',
        createdByUserId: 'participant_rank_1'
      },
      {
        id: 'team_rank_top',
        hackathonId: 'hackathon_rank_1',
        name: 'Top Team',
        slug: 'top-team',
        createdByUserId: 'creator_rank_1'
      },
      {
        id: 'team_rank_runner_up',
        hackathonId: 'hackathon_rank_1',
        name: 'Runner Up Team',
        slug: 'runner-up-team',
        createdByUserId: 'creator_rank_1'
      },
      {
        id: 'team_rank_active_unranked',
        hackathonId: 'hackathon_rank_1',
        name: 'Active Unranked Team',
        slug: 'active-unranked-team',
        createdByUserId: 'creator_rank_1'
      },
      {
        id: 'team_rank_dissolved',
        hackathonId: 'hackathon_rank_1',
        name: 'Dissolved Team',
        slug: 'dissolved-team',
        createdByUserId: 'creator_rank_1'
      }
    ])

    await harness.database.insert(teamMembers).values([
      {
        id: 'membership_rank_user',
        teamId: 'team_rank_user',
        userId: 'participant_rank_1',
        role: 'admin',
        joinedAt: '2026-03-01T12:30:00.000Z',
        leftAt: null
      },
      {
        id: 'membership_rank_top',
        teamId: 'team_rank_top',
        userId: 'creator_rank_1',
        role: 'admin',
        joinedAt: '2026-03-01T12:31:00.000Z',
        leftAt: null
      },
      {
        id: 'membership_rank_runner_up',
        teamId: 'team_rank_runner_up',
        userId: 'judge_rank_1',
        role: 'admin',
        joinedAt: '2026-03-01T12:32:00.000Z',
        leftAt: null
      },
      {
        id: 'membership_rank_active_unranked',
        teamId: 'team_rank_active_unranked',
        userId: 'active_unranked_rank_1',
        role: 'member',
        joinedAt: '2026-03-01T12:33:00.000Z',
        leftAt: null
      },
      {
        id: 'membership_rank_dissolved',
        teamId: 'team_rank_dissolved',
        userId: 'dissolved_rank_1',
        role: 'member',
        joinedAt: '2026-03-01T12:34:00.000Z',
        leftAt: '2026-03-02T12:34:00.000Z'
      }
    ])

    await harness.database.insert(submissions).values([
      {
        id: 'submission_rank_user',
        teamId: 'team_rank_user',
        status: 'locked',
        projectName: 'User Project',
        submittedAt: '2026-03-09T12:00:00.000Z',
        lockedAt: '2026-03-10T09:00:00.000Z',
        createdAt: '2026-03-09T11:00:00.000Z',
        updatedAt: '2026-03-10T09:00:00.000Z'
      },
      {
        id: 'submission_rank_top',
        teamId: 'team_rank_top',
        status: 'locked',
        projectName: 'Top Project',
        submittedAt: '2026-03-09T12:05:00.000Z',
        lockedAt: '2026-03-10T09:00:00.000Z',
        createdAt: '2026-03-09T11:05:00.000Z',
        updatedAt: '2026-03-10T09:00:00.000Z'
      },
      {
        id: 'submission_rank_runner_up',
        teamId: 'team_rank_runner_up',
        status: 'locked',
        projectName: 'Runner Up Project',
        submittedAt: '2026-03-09T12:10:00.000Z',
        lockedAt: '2026-03-10T09:00:00.000Z',
        createdAt: '2026-03-09T11:10:00.000Z',
        updatedAt: '2026-03-10T09:00:00.000Z'
      }
    ])

    await harness.database.insert(evaluationCriteria).values({
      id: 'criterion_rank_1',
      hackathonId: 'hackathon_rank_1',
      name: 'Execution',
      description: 'Execution quality',
      weight: 100,
      displayOrder: 1,
      createdAt: '2026-03-08T09:00:00.000Z'
    })

    await harness.database.insert(judgeAssignments).values([
      {
        id: 'assignment_rank_user_blind',
        hackathonId: 'hackathon_rank_1',
        submissionId: 'submission_rank_user',
        judgeUserId: 'judge_rank_1',
        reviewStage: 'blind_review',
        blindReviewSlot: 1,
        status: 'judge_completed',
        assignedAt: '2026-03-10T10:00:00.000Z',
        startedAt: '2026-03-10T10:01:00.000Z',
        completedAt: '2026-03-10T10:02:00.000Z',
        createdAt: '2026-03-10T10:00:00.000Z'
      },
      {
        id: 'assignment_rank_top_blind',
        hackathonId: 'hackathon_rank_1',
        submissionId: 'submission_rank_top',
        judgeUserId: 'judge_rank_1',
        reviewStage: 'blind_review',
        blindReviewSlot: 1,
        status: 'judge_completed',
        assignedAt: '2026-03-10T10:03:00.000Z',
        startedAt: '2026-03-10T10:04:00.000Z',
        completedAt: '2026-03-10T10:05:00.000Z',
        createdAt: '2026-03-10T10:03:00.000Z'
      },
      {
        id: 'assignment_rank_runner_up_blind',
        hackathonId: 'hackathon_rank_1',
        submissionId: 'submission_rank_runner_up',
        judgeUserId: 'judge_rank_1',
        reviewStage: 'blind_review',
        blindReviewSlot: 1,
        status: 'judge_completed',
        assignedAt: '2026-03-10T10:06:00.000Z',
        startedAt: '2026-03-10T10:07:00.000Z',
        completedAt: '2026-03-10T10:08:00.000Z',
        createdAt: '2026-03-10T10:06:00.000Z'
      },
      {
        id: 'assignment_rank_top_pitch',
        hackathonId: 'hackathon_rank_1',
        submissionId: 'submission_rank_top',
        judgeUserId: 'judge_rank_1',
        reviewStage: 'pitch_review',
        blindReviewSlot: null,
        status: 'judge_completed',
        pitchScore: 5,
        pitchComment: 'Strong pitch',
        assignedAt: '2026-03-10T11:00:00.000Z',
        startedAt: '2026-03-10T11:01:00.000Z',
        completedAt: '2026-03-10T11:02:00.000Z',
        createdAt: '2026-03-10T11:00:00.000Z'
      },
      {
        id: 'assignment_rank_runner_up_pitch',
        hackathonId: 'hackathon_rank_1',
        submissionId: 'submission_rank_runner_up',
        judgeUserId: 'judge_rank_1',
        reviewStage: 'pitch_review',
        blindReviewSlot: null,
        status: 'judge_completed',
        pitchScore: 4,
        pitchComment: 'Good pitch',
        assignedAt: '2026-03-10T11:03:00.000Z',
        startedAt: '2026-03-10T11:04:00.000Z',
        completedAt: '2026-03-10T11:05:00.000Z',
        createdAt: '2026-03-10T11:03:00.000Z'
      }
    ])

    await harness.database.insert(judgeCriterionScores).values([
      {
        id: 'score_rank_user',
        judgeAssignmentId: 'assignment_rank_user_blind',
        evaluationCriterionId: 'criterion_rank_1',
        score: 3,
        comment: 'Solid',
        createdAt: '2026-03-10T10:02:00.000Z',
        updatedAt: '2026-03-10T10:02:00.000Z'
      },
      {
        id: 'score_rank_top',
        judgeAssignmentId: 'assignment_rank_top_blind',
        evaluationCriterionId: 'criterion_rank_1',
        score: 5,
        comment: 'Excellent',
        createdAt: '2026-03-10T10:05:00.000Z',
        updatedAt: '2026-03-10T10:05:00.000Z'
      },
      {
        id: 'score_rank_runner_up',
        judgeAssignmentId: 'assignment_rank_runner_up_blind',
        evaluationCriterionId: 'criterion_rank_1',
        score: 4,
        comment: 'Great',
        createdAt: '2026-03-10T10:08:00.000Z',
        updatedAt: '2026-03-10T10:08:00.000Z'
      }
    ])

    const response = await harness.request('/api/hackathons/hackathon_rank_1/rank/me')

    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({
      data: {
        basis: 'blind_review',
        rank: 3,
        rankedTeamCount: 3,
        totalTeamCount: 4
      }
    })
  })

  test('workspace users can read published judge and staff rosters without admin-only fields', async () => {
    const harness = createApiRouteTestHarness({
      routes: [
        { method: 'get', path: '/api/hackathons/:hackathonId/judges', handler: hackathonJudgesGetHandler },
        { method: 'get', path: '/api/hackathons/:hackathonId/staff', handler: hackathonStaffGetHandler }
      ],
      sessionUser: {
        sub: 'auth0|participant_viewer',
        email: 'participant-viewer@example.com'
      }
    })
    harnesses.push(harness)

    await harness.database.insert(users).values([
      {
        id: 'participant_viewer',
        auth0Subject: 'auth0|participant_viewer',
        email: 'participant-viewer@example.com',
        displayName: 'Participant Viewer',
        firstName: 'Participant',
        familyName: 'Viewer'
      },
      {
        id: 'judge_user',
        auth0Subject: 'auth0|judge_user',
        email: 'judge@example.com',
        displayName: 'Judge User',
        firstName: 'Judge',
        familyName: 'User',
        company: 'Codex Labs',
        bio: 'Reviews technical execution.',
        xProfileUrl: 'https://x.com/judge-user',
        profileIconUpdatedAt: '2026-03-15T10:00:00.000Z'
      },
      {
        id: 'staff_user',
        auth0Subject: 'auth0|staff_user',
        email: 'staff@example.com',
        displayName: 'Staff User',
        firstName: 'Staff',
        familyName: 'User',
        company: 'Community Ops',
        bio: 'Keeps the event moving.',
        linkedinProfileUrl: 'https://linkedin.com/in/staff-user'
      },
      {
        id: 'admin_user',
        auth0Subject: 'auth0|admin_user',
        email: 'admin@example.com',
        displayName: 'Admin User',
        firstName: 'Admin',
        familyName: 'User',
        company: 'Codex Community',
        bio: 'Supports operations and judging.',
        githubProfileUrl: 'https://github.com/admin-user'
      }
    ])
    await seedCurrentPlatformConsent(harness, 'participant_viewer')
    await harness.database.insert(hackathons).values({
      id: 'hackathon_1',
      name: 'Fixture Hackathon',
      slug: 'fixture-hackathon',
      description: 'Fixture hackathon',
      city: 'Vienna',
      country: 'Austria',
      address: 'Fixture Address',
      registrationOpensAt: '2026-03-20T12:00:00.000Z',
      registrationClosesAt: '2026-03-23T12:00:00.000Z',
      submissionOpensAt: '2026-03-23T12:00:00.000Z',
      submissionClosesAt: '2026-03-25T12:00:00.000Z',
      state: 'registration_open',
      maxTeamMembers: 5,
      currentApplicationTermsDocumentId: null,
      currentWinnerTermsDocumentId: null,
      createdByUserId: 'admin_user'
    })
    await harness.database.insert(hackathonTermsDocuments).values({
      id: 'terms_app_1',
      hackathonId: 'hackathon_1',
      documentType: 'application_terms',
      version: 1,
      title: 'Application Terms v1',
      content: 'Terms',
      publishedAt: '2026-03-03T00:00:00.000Z'
    })
    await harness.database.insert(userApplications).values({
      id: 'application_viewer',
      hackathonId: 'hackathon_1',
      userId: 'participant_viewer',
      status: 'submitted',
      applicationTermsDocumentId: 'terms_app_1',
      applicationTermsAcceptedAt: '2026-03-03T00:00:00.000Z'
    })
    await harness.database.insert(hackathonRoleAssignments).values([
      {
        id: 'assignment_judge_user',
        hackathonId: 'hackathon_1',
        userId: 'judge_user',
        role: 'judge',
        isInJudgePool: true,
        isStaff: false,
        createdAt: '2026-03-10T09:00:00.000Z'
      },
      {
        id: 'assignment_staff_user',
        hackathonId: 'hackathon_1',
        userId: 'staff_user',
        role: 'staff',
        isInJudgePool: false,
        isStaff: true,
        createdAt: '2026-03-10T09:05:00.000Z'
      },
      {
        id: 'assignment_admin_user',
        hackathonId: 'hackathon_1',
        userId: 'admin_user',
        role: 'hackathon_admin',
        isInJudgePool: true,
        isStaff: true,
        createdAt: '2026-03-10T09:10:00.000Z'
      }
    ])

    const judgesResponse = await harness.request('/api/hackathons/hackathon_1/judges')
    expect(judgesResponse.status).toBe(200)
    const judgesPayload = await judgesResponse.json()
    expect(judgesPayload).toMatchObject({
      meta: {
        total: 2
      }
    })
    expect(judgesPayload.data).toEqual([
      {
        id: 'admin_user',
        fullName: 'Admin User',
        company: 'Codex Community',
        bio: 'Supports operations and judging.',
        xProfileUrl: null,
        linkedinProfileUrl: null,
        githubProfileUrl: 'https://github.com/admin-user',
        profileIconUpdatedAt: null
      },
      {
        id: 'judge_user',
        fullName: 'Judge User',
        company: 'Codex Labs',
        bio: 'Reviews technical execution.',
        xProfileUrl: 'https://x.com/judge-user',
        linkedinProfileUrl: null,
        githubProfileUrl: null,
        profileIconUpdatedAt: '2026-03-15T10:00:00.000Z'
      }
    ])
    expect(judgesPayload.data[0]).not.toHaveProperty('email')
    expect(judgesPayload.data[0]).not.toHaveProperty('isPlatformAdmin')
    expect(judgesPayload.data[0]).not.toHaveProperty('chatgptEmail')
    expect(judgesPayload.data[0]).not.toHaveProperty('openaiOrgId')
    expect(judgesPayload.data[0]).not.toHaveProperty('lumaEmail')

    const staffResponse = await harness.request('/api/hackathons/hackathon_1/staff')
    expect(staffResponse.status).toBe(200)
    expect(await staffResponse.json()).toMatchObject({
      data: [
        {
          id: 'admin_user',
          fullName: 'Admin User',
          githubProfileUrl: 'https://github.com/admin-user'
        },
        {
          id: 'staff_user',
          fullName: 'Staff User',
          linkedinProfileUrl: 'https://linkedin.com/in/staff-user'
        }
      ],
      meta: {
        total: 2
      }
    })
  })

  test('published roster reads require workspace access for the hackathon', async () => {
    const harness = createApiRouteTestHarness({
      routes: [
        { method: 'get', path: '/api/hackathons/:hackathonId/judges', handler: hackathonJudgesGetHandler }
      ],
      sessionUser: {
        sub: 'auth0|unrelated_user',
        email: 'unrelated@example.com'
      }
    })
    harnesses.push(harness)

    await harness.database.insert(users).values([
      {
        id: 'unrelated_user',
        auth0Subject: 'auth0|unrelated_user',
        email: 'unrelated@example.com',
        displayName: 'Unrelated User'
      },
      {
        id: 'admin_user',
        auth0Subject: 'auth0|admin_user',
        email: 'admin@example.com',
        displayName: 'Admin User'
      }
    ])
    await seedCurrentPlatformConsent(harness, 'unrelated_user')
    await harness.database.insert(hackathons).values({
      id: 'hackathon_1',
      name: 'Fixture Hackathon',
      slug: 'fixture-hackathon',
      description: 'Fixture hackathon',
      city: 'Vienna',
      country: 'Austria',
      address: 'Fixture Address',
      registrationOpensAt: '2026-03-20T12:00:00.000Z',
      registrationClosesAt: '2026-03-23T12:00:00.000Z',
      submissionOpensAt: '2026-03-23T12:00:00.000Z',
      submissionClosesAt: '2026-03-25T12:00:00.000Z',
      state: 'registration_open',
      maxTeamMembers: 5,
      currentApplicationTermsDocumentId: null,
      currentWinnerTermsDocumentId: null,
      createdByUserId: 'admin_user'
    })
    await harness.database.insert(hackathonRoleAssignments).values({
      id: 'assignment_admin_user',
      hackathonId: 'hackathon_1',
      userId: 'admin_user',
      role: 'hackathon_admin',
      isInJudgePool: true,
      isStaff: true,
      createdAt: '2026-03-10T09:10:00.000Z'
    })

    const response = await harness.request('/api/hackathons/hackathon_1/judges')
    expect(response.status).toBe(403)
    expect(await response.json()).toMatchObject({
      error: {
        code: 'hackathon_workspace_access_required'
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
        country: 'Austria',
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
        country: 'Austria',
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
        country: 'Austria',
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
        discordServerUrl: 'https://discord.gg/private-codex',
        city: 'Vienna',
        country: 'Austria',
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
    expect(payload.data.address).toBe('')
    expect(payload.data).not.toHaveProperty('discordServerUrl')
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
      discordServerUrl: 'https://discord.gg/private-codex',
      city: 'Vienna',
      country: 'Austria',
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
    await harness.database.insert(prizes).values([
      {
        id: 'prize_public_1',
        hackathonId: 'hackathon_public',
        name: 'Launch Award',
        description: 'Launch support.',
        rewardType: 'api_credits',
        rewardValue: '5000',
        rewardCurrency: null,
        awardScope: 'team',
        rankStart: 1,
        rankEnd: 1
      },
      {
        id: 'prize_public_2',
        hackathonId: 'hackathon_public',
        name: 'Top 3 Teams Benefit',
        description: 'Shared finalist benefit.',
        rewardType: 'other',
        rewardValue: 'Mentorship',
        rewardCurrency: null,
        awardScope: 'team',
        rankStart: 1,
        rankEnd: 3
      },
      {
        id: 'prize_public_3',
        hackathonId: 'hackathon_public',
        name: 'Second Place Award',
        description: 'Runner-up support.',
        rewardType: 'api_credits',
        rewardValue: '3000',
        rewardCurrency: null,
        awardScope: 'team',
        rankStart: 2,
        rankEnd: 2
      },
      {
        id: 'prize_public_4',
        hackathonId: 'hackathon_public',
        name: 'Third Place Award',
        description: 'Third-place support.',
        rewardType: 'api_credits',
        rewardValue: '1500',
        rewardCurrency: null,
        awardScope: 'team',
        rankStart: 3,
        rankEnd: 3
      }
    ])

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
        },
        {
          name: 'Second Place Award',
          description: 'Runner-up support.',
          rewardType: 'api_credits',
          rewardValue: '3000',
          rewardCurrency: null,
          awardScope: 'team',
          rankStart: 2,
          rankEnd: 2
        },
        {
          name: 'Third Place Award',
          description: 'Third-place support.',
          rewardType: 'api_credits',
          rewardValue: '1500',
          rewardCurrency: null,
          awardScope: 'team',
          rankStart: 3,
          rankEnd: 3
        },
        {
          name: 'Top 3 Teams Benefit',
          description: 'Shared finalist benefit.',
          rewardType: 'other',
          rewardValue: 'Mentorship',
          rewardCurrency: null,
          awardScope: 'team',
          rankStart: 1,
          rankEnd: 3
        }
      ]
    })
    expect(prizePayload.data[0]).not.toHaveProperty('id')
    expect(prizePayload.data[0]).not.toHaveProperty('hackathonId')
    expect(prizePayload.data[0]).not.toHaveProperty('createdAt')
    expect(prizePayload.data.map((prize: { name: string }) => prize.name)).toEqual([
      'Launch Award',
      'Second Place Award',
      'Third Place Award',
      'Top 3 Teams Benefit'
    ])
  })

  test('GET /api/public/hackathons/:slug/winners and winner profile icons stay hidden until completion', async () => {
    const profileIconsBucket = new InMemoryR2Bucket()
    const harness = createApiRouteTestHarness({
      routes: [
        { method: 'get', path: '/api/public/hackathons/:slug/winners', handler: publicHackathonWinnersGetHandler },
        { method: 'get', path: '/api/public/hackathons/:slug/winners/:userId/profile-icon', handler: publicHackathonWinnerProfileIconGetHandler },
        { method: 'get', path: '/api/public/hackathons/:slug/published-projects', handler: publicHackathonPublishedProjectsGetHandler },
        { method: 'get', path: '/api/public/hackathons/:slug/published-projects/:userId/profile-icon', handler: publicHackathonPublishedProjectProfileIconGetHandler }
      ],
      cloudflareEnv: {
        PROFILE_ICONS: profileIconsBucket
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
        id: 'judge_1',
        auth0Subject: 'auth0|judge_1',
        email: 'judge@example.com',
        displayName: 'Judge One'
      },
      {
        id: 'winner_user',
        auth0Subject: 'auth0|winner_user',
        email: 'winner@example.com',
        displayName: 'Winner User',
        firstName: 'Winner',
        familyName: 'User',
        bio: 'Builds thoughtful AI prototypes.',
        xProfileUrl: 'https://x.com/winner-user',
        linkedinProfileUrl: 'https://linkedin.com/in/winner-user',
        githubProfileUrl: 'https://github.com/winner-user',
        profileIconUpdatedAt: '2026-03-18T15:00:00.000Z'
      },
      {
        id: 'published_user',
        auth0Subject: 'auth0|published_user',
        email: 'published@example.com',
        displayName: 'Published User',
        firstName: 'Published',
        familyName: 'User',
        bio: 'Shares finished hackathon projects.',
        xProfileUrl: 'https://x.com/published-user',
        linkedinProfileUrl: 'https://linkedin.com/in/published-user',
        githubProfileUrl: 'https://github.com/published-user',
        profileIconUpdatedAt: '2026-03-18T16:00:00.000Z'
      }
    ])
    await harness.database.insert(hackathons).values({
      id: 'hackathon_completed_public',
      name: 'Public Winners Hackathon',
      slug: 'public-winners-hackathon',
      description: 'Public winners showcase',
      city: 'Vienna',
      country: 'Austria',
      address: 'Address',
      registrationOpensAt: '2026-03-20T12:00:00.000Z',
      registrationClosesAt: '2026-03-23T12:00:00.000Z',
      submissionOpensAt: '2026-03-23T12:00:00.000Z',
      submissionClosesAt: '2026-03-25T12:00:00.000Z',
      state: 'winners_announced',
      blindReviewCount: 0,
      pitchReviewEnabled: true,
      blindScoreWeightPercent: 0,
      pitchScoreWeightPercent: 100,
      finalRankingSubmissionIdsJson: JSON.stringify(['submission_public_winner']),
      maxTeamMembers: 5,
      createdByUserId: 'creator_1'
    })
    await harness.database.insert(teams).values([{
      id: 'team_public_winner',
      hackathonId: 'hackathon_completed_public',
      name: 'Public Winners',
      slug: 'public-winners',
      isOpenToJoinRequests: false,
      createdByUserId: 'winner_user',
      createdAt: '2026-03-24T10:00:00.000Z',
      updatedAt: '2026-03-24T10:00:00.000Z'
    }, {
      id: 'team_public_showcase',
      hackathonId: 'hackathon_completed_public',
      name: 'Published Builders',
      slug: 'published-builders',
      isOpenToJoinRequests: false,
      createdByUserId: 'published_user',
      createdAt: '2026-03-24T10:30:00.000Z',
      updatedAt: '2026-03-24T10:30:00.000Z'
    }])
    await harness.database.insert(teamMembers).values([{
      id: 'membership_public_winner',
      teamId: 'team_public_winner',
      userId: 'winner_user',
      role: 'admin',
      joinedAt: '2026-03-24T10:00:00.000Z',
      createdAt: '2026-03-24T10:00:00.000Z'
    }, {
      id: 'membership_public_showcase',
      teamId: 'team_public_showcase',
      userId: 'published_user',
      role: 'admin',
      joinedAt: '2026-03-24T10:30:00.000Z',
      createdAt: '2026-03-24T10:30:00.000Z'
    }])
    await harness.database.insert(submissions).values([{
      id: 'submission_public_winner',
      teamId: 'team_public_winner',
      status: 'locked',
      projectName: 'Public Winner Project',
      summary: 'Public winner summary',
      repositoryUrl: 'https://example.com/public-winner-repo',
      demoUrl: 'https://example.com/public-winner-demo',
      isPubliclyVisible: false,
      submittedAt: '2026-03-24T12:00:00.000Z',
      lockedAt: '2026-03-25T12:00:00.000Z',
      createdAt: '2026-03-24T12:00:00.000Z',
      updatedAt: '2026-03-25T12:00:00.000Z'
    }, {
      id: 'submission_public_showcase',
      teamId: 'team_public_showcase',
      status: 'locked',
      projectName: 'Published Showcase Project',
      summary: 'Published showcase summary',
      repositoryUrl: 'https://example.com/published-showcase-repo',
      demoUrl: 'https://example.com/published-showcase-demo',
      isPubliclyVisible: true,
      submittedAt: '2026-03-24T12:10:00.000Z',
      lockedAt: '2026-03-25T12:10:00.000Z',
      createdAt: '2026-03-24T12:10:00.000Z',
      updatedAt: '2026-03-25T12:10:00.000Z'
    }])
    await harness.database.insert(judgeAssignments).values({
      id: 'pitch_public_winner_assignment',
      hackathonId: 'hackathon_completed_public',
      submissionId: 'submission_public_winner',
      judgeUserId: 'judge_1',
      reviewStage: 'pitch_review',
      blindReviewSlot: null,
      status: 'judge_completed',
      pitchScore: 5,
      assignedAt: '2026-03-25T13:00:00.000Z',
      startedAt: '2026-03-25T13:01:00.000Z',
      completedAt: '2026-03-25T13:02:00.000Z',
      ineligibilityStatus: 'eligible',
      createdAt: '2026-03-25T13:00:00.000Z'
    })
    await harness.database.insert(prizes).values({
      id: 'prize_public_winner',
      hackathonId: 'hackathon_completed_public',
      name: 'Public Grand Prize',
      description: 'Public prize description',
      rewardType: 'api_credits',
      rewardValue: '5000',
      rewardCurrency: 'USD',
      awardScope: 'team',
      rankStart: 1,
      rankEnd: 1
    })
    await harness.database.insert(prizeEligibilitySnapshots).values([{
      id: 'snapshot_public_winner',
      hackathonId: 'hackathon_completed_public',
      teamId: 'team_public_winner',
      userId: 'winner_user',
      snapshotAt: '2026-03-25T13:05:00.000Z',
      createdAt: '2026-03-25T13:05:00.000Z'
    }, {
      id: 'snapshot_public_showcase',
      hackathonId: 'hackathon_completed_public',
      teamId: 'team_public_showcase',
      userId: 'published_user',
      snapshotAt: '2026-03-25T13:06:00.000Z',
      createdAt: '2026-03-25T13:06:00.000Z'
    }])
    await harness.database.insert(prizeRedemptions).values({
      id: 'redemption_public_winner',
      prizeId: 'prize_public_winner',
      userId: null,
      teamId: 'team_public_winner',
      status: 'pending',
      createdAt: '2026-03-25T13:10:00.000Z',
      updatedAt: '2026-03-25T13:10:00.000Z'
    })
    await profileIconsBucket.put(
      'users/winner_user/profile-icon',
      pngSignatureBytes,
      {
        httpMetadata: {
          contentType: 'image/png'
        }
      }
    )
    await profileIconsBucket.put(
      'users/published_user/profile-icon',
      pngSignatureBytes,
      {
        httpMetadata: {
          contentType: 'image/png'
        }
      }
    )

    const preCompletionResponse = await harness.request('/api/public/hackathons/public-winners-hackathon/winners')
    const preCompletionPublishedProjectsResponse = await harness.request('/api/public/hackathons/public-winners-hackathon/published-projects')

    expect(preCompletionResponse.status).toBe(409)
    expect(preCompletionPublishedProjectsResponse.status).toBe(409)

    await harness.database
      .update(hackathons)
      .set({
        state: 'completed'
      })
      .where(eq(hackathons.id, 'hackathon_completed_public'))

    const winnersResponse = await harness.request('/api/public/hackathons/public-winners-hackathon/winners')

    expect(winnersResponse.status).toBe(200)
    expect(await winnersResponse.json()).toMatchObject({
      data: [
        {
          teamId: 'team_public_winner',
          teamName: 'Public Winners',
          submissionId: 'submission_public_winner',
          projectName: 'Public Winner Project',
          summary: 'Public winner summary',
          repositoryUrl: 'https://example.com/public-winner-repo',
          demoUrl: 'https://example.com/public-winner-demo',
          finalRank: 1,
          prizes: [
            expect.objectContaining({
              id: 'prize_public_winner',
              name: 'Public Grand Prize'
            })
          ],
          teamMembers: [
            expect.objectContaining({
              id: 'winner_user',
              fullName: 'Winner User',
              bio: 'Builds thoughtful AI prototypes.',
              xProfileUrl: 'https://x.com/winner-user',
              linkedinProfileUrl: 'https://linkedin.com/in/winner-user',
              githubProfileUrl: 'https://github.com/winner-user',
              profileIconUrl: '/api/public/hackathons/public-winners-hackathon/winners/winner_user/profile-icon?v=2026-03-18T15%3A00%3A00.000Z'
            })
          ]
        }
      ]
    })

    const publishedProjectsResponse = await harness.request('/api/public/hackathons/public-winners-hackathon/published-projects')

    expect(publishedProjectsResponse.status).toBe(200)
    expect(await publishedProjectsResponse.json()).toMatchObject({
      data: [
        {
          teamId: 'team_public_showcase',
          teamName: 'Published Builders',
          submissionId: 'submission_public_showcase',
          projectName: 'Published Showcase Project',
          summary: 'Published showcase summary',
          repositoryUrl: 'https://example.com/published-showcase-repo',
          demoUrl: 'https://example.com/published-showcase-demo',
          teamMembers: [
            expect.objectContaining({
              id: 'published_user',
              fullName: 'Published User',
              bio: 'Shares finished hackathon projects.',
              xProfileUrl: 'https://x.com/published-user',
              linkedinProfileUrl: 'https://linkedin.com/in/published-user',
              githubProfileUrl: 'https://github.com/published-user',
              profileIconUrl: '/api/public/hackathons/public-winners-hackathon/published-projects/published_user/profile-icon?v=2026-03-18T16%3A00%3A00.000Z'
            })
          ]
        }
      ]
    })

    const iconResponse = await harness.request(
      '/api/public/hackathons/public-winners-hackathon/winners/winner_user/profile-icon?v=2026-03-18T15%3A00%3A00.000Z'
    )

    expect(iconResponse.status).toBe(200)
    expect(iconResponse.headers.get('cache-control')).toBe('public, max-age=31536000, immutable')
    expect(iconResponse.headers.get('content-type')).toBe('image/png')

    const missingIconResponse = await harness.request(
      '/api/public/hackathons/public-winners-hackathon/winners/unknown_user/profile-icon?v=2026-03-18T15%3A00%3A00.000Z'
    )

    expect(missingIconResponse.status).toBe(404)

    const publishedIconResponse = await harness.request(
      '/api/public/hackathons/public-winners-hackathon/published-projects/published_user/profile-icon?v=2026-03-18T16%3A00%3A00.000Z'
    )

    expect(publishedIconResponse.status).toBe(200)
    expect(publishedIconResponse.headers.get('cache-control')).toBe('public, max-age=31536000, immutable')
    expect(publishedIconResponse.headers.get('content-type')).toBe('image/png')
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
      country: 'Austria',
      address: 'Address',
      registrationOpensAt: '2026-03-20T12:00:00.000Z',
      registrationClosesAt: '2026-03-23T12:00:00.000Z',
      submissionOpensAt: '2026-03-23T12:00:00.000Z',
      submissionClosesAt: '2026-03-25T12:00:00.000Z',
      state: 'registration_open',
      maxTeamMembers: 5,
      blindReviewCount: 2,
      pitchReviewEnabled: true,
      blindScoreWeightPercent: 60,
      pitchScoreWeightPercent: 40,
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
        address: '',
        state: 'registration_open',
        discordServerUrl: null,
        blindReviewCount: 2,
        pitchReviewEnabled: true,
        blindScoreWeightPercent: 60,
        pitchScoreWeightPercent: 40,
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

  test('GET /api/hackathons/slug/:slug exposes discordServerUrl to approved participants only', async () => {
    const approvedHarness = createApiRouteTestHarness({
      routes: [
        { method: 'get', path: '/api/hackathons/slug/:slug', handler: hackathonBySlugGetHandler }
      ],
      sessionUser: {
        sub: 'auth0|approved_participant',
        email: 'approved@example.com'
      }
    })
    harnesses.push(approvedHarness)

    await approvedHarness.database.insert(users).values([
      {
        id: 'creator_1',
        auth0Subject: 'auth0|creator_1',
        email: 'creator@example.com',
        displayName: 'Creator'
      },
      {
        id: 'approved_participant',
        auth0Subject: 'auth0|approved_participant',
        email: 'approved@example.com',
        displayName: 'Approved Participant'
      }
    ])
    await seedCurrentPlatformConsent(approvedHarness, 'approved_participant')
    await approvedHarness.database.insert(hackathons).values({
      id: 'hackathon_private_discord',
      name: 'Private Discord Hackathon',
      slug: 'private-discord-hackathon',
      description: 'Private Discord Hackathon',
      discordServerUrl: 'https://discord.gg/private-codex',
      city: 'Vienna',
      country: 'Austria',
      address: 'Address',
      registrationOpensAt: '2026-03-20T12:00:00.000Z',
      registrationClosesAt: '2026-03-23T12:00:00.000Z',
      submissionOpensAt: '2026-03-23T12:00:00.000Z',
      submissionClosesAt: '2026-03-25T12:00:00.000Z',
      state: 'registration_open',
      maxTeamMembers: 5,
      createdByUserId: 'creator_1'
    })
    await approvedHarness.database.insert(hackathonTermsDocuments).values({
      id: 'terms_1',
      hackathonId: 'hackathon_private_discord',
      documentType: 'application_terms',
      version: 1,
      title: 'Application Terms',
      content: 'Application terms',
      publishedAt: '2026-03-20T00:00:00.000Z'
    })
    await approvedHarness.database.insert(userApplications).values({
      id: 'application_approved',
      hackathonId: 'hackathon_private_discord',
      userId: 'approved_participant',
      status: 'approved',
      submittedAt: '2026-03-21T12:00:00.000Z',
      withdrawnAt: null,
      reviewedAt: '2026-03-22T12:00:00.000Z',
      reviewedByUserId: 'creator_1',
      applicationTermsDocumentId: 'terms_1',
      applicationTermsAcceptedAt: '2026-03-21T12:00:00.000Z',
      registrationDetailsJson: '{}',
      createdAt: '2026-03-21T12:00:00.000Z',
      updatedAt: '2026-03-22T12:00:00.000Z'
    })

    const approvedResponse = await approvedHarness.request('/api/hackathons/slug/private-discord-hackathon')
    expect(approvedResponse.status).toBe(200)
    expect(await approvedResponse.json()).toMatchObject({
      data: {
        address: 'Address',
        discordServerUrl: 'https://discord.gg/private-codex',
        hasPhotos: false
      }
    })

    const submittedHarness = createApiRouteTestHarness({
      routes: [
        { method: 'get', path: '/api/hackathons/slug/:slug', handler: hackathonBySlugGetHandler }
      ],
      sessionUser: {
        sub: 'auth0|submitted_participant',
        email: 'submitted@example.com'
      }
    })
    harnesses.push(submittedHarness)

    await submittedHarness.database.insert(users).values([
      {
        id: 'creator_1',
        auth0Subject: 'auth0|creator_1',
        email: 'creator@example.com',
        displayName: 'Creator'
      },
      {
        id: 'submitted_participant',
        auth0Subject: 'auth0|submitted_participant',
        email: 'submitted@example.com',
        displayName: 'Submitted Participant'
      }
    ])
    await seedCurrentPlatformConsent(submittedHarness, 'submitted_participant')
    await submittedHarness.database.insert(hackathons).values({
      id: 'hackathon_private_discord',
      name: 'Private Discord Hackathon',
      slug: 'private-discord-hackathon',
      description: 'Private Discord Hackathon',
      discordServerUrl: 'https://discord.gg/private-codex',
      city: 'Vienna',
      country: 'Austria',
      address: 'Address',
      registrationOpensAt: '2026-03-20T12:00:00.000Z',
      registrationClosesAt: '2026-03-23T12:00:00.000Z',
      submissionOpensAt: '2026-03-23T12:00:00.000Z',
      submissionClosesAt: '2026-03-25T12:00:00.000Z',
      state: 'registration_open',
      maxTeamMembers: 5,
      createdByUserId: 'creator_1'
    })
    await submittedHarness.database.insert(hackathonTermsDocuments).values({
      id: 'terms_1',
      hackathonId: 'hackathon_private_discord',
      documentType: 'application_terms',
      version: 1,
      title: 'Application Terms',
      content: 'Application terms',
      publishedAt: '2026-03-20T00:00:00.000Z'
    })
    await submittedHarness.database.insert(userApplications).values({
      id: 'application_submitted',
      hackathonId: 'hackathon_private_discord',
      userId: 'submitted_participant',
      status: 'submitted',
      submittedAt: '2026-03-21T12:00:00.000Z',
      withdrawnAt: null,
      reviewedAt: null,
      reviewedByUserId: null,
      applicationTermsDocumentId: 'terms_1',
      applicationTermsAcceptedAt: '2026-03-21T12:00:00.000Z',
      registrationDetailsJson: '{}',
      createdAt: '2026-03-21T12:00:00.000Z',
      updatedAt: '2026-03-21T12:00:00.000Z'
    })

    const submittedResponse = await submittedHarness.request('/api/hackathons/slug/private-discord-hackathon')
    expect(submittedResponse.status).toBe(200)
    const submittedPayload = await submittedResponse.json()
    expect(submittedPayload).toMatchObject({
      data: {
        address: '',
        discordServerUrl: null
      }
    })
    expect(submittedPayload.data).not.toHaveProperty('hasPhotos')
  })

  test('GET /api/hackathons/slug/:slug exposes discordServerUrl to judges', async () => {
    const harness = createApiRouteTestHarness({
      routes: [
        { method: 'get', path: '/api/hackathons/slug/:slug', handler: hackathonBySlugGetHandler }
      ],
      sessionUser: {
        sub: 'auth0|judge_user',
        email: 'judge@example.com'
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
        id: 'judge_user',
        auth0Subject: 'auth0|judge_user',
        email: 'judge@example.com',
        displayName: 'Judge User'
      }
    ])
    await seedCurrentPlatformConsent(harness, 'judge_user')
    await harness.database.insert(hackathons).values({
      id: 'hackathon_private_discord',
      name: 'Private Discord Hackathon',
      slug: 'private-discord-hackathon',
      description: 'Private Discord Hackathon',
      discordServerUrl: 'https://discord.gg/private-codex',
      city: 'Vienna',
      country: 'Austria',
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
      id: 'role_judge',
      hackathonId: 'hackathon_private_discord',
      userId: 'judge_user',
      role: 'judge',
      isInJudgePool: true,
      isStaff: false,
      createdAt: '2026-03-21T12:00:00.000Z'
    })

    const response = await harness.request('/api/hackathons/slug/private-discord-hackathon')
    expect(response.status).toBe(200)
    expect(await response.json()).toMatchObject({
      data: {
        address: 'Address',
        discordServerUrl: 'https://discord.gg/private-codex',
        hasPhotos: false
      }
    })
  })

  test('GET /api/hackathons/slug/:slug exposes hasPhotos to approved participants when gallery images exist', async () => {
    const harness = createApiRouteTestHarness({
      routes: [
        { method: 'get', path: '/api/hackathons/slug/:slug', handler: hackathonBySlugGetHandler }
      ],
      sessionUser: {
        sub: 'auth0|approved_participant',
        email: 'approved@example.com'
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
        id: 'approved_participant',
        auth0Subject: 'auth0|approved_participant',
        email: 'approved@example.com',
        displayName: 'Approved Participant'
      }
    ])
    await seedCurrentPlatformConsent(harness, 'approved_participant')
    await harness.database.insert(hackathons).values({
      id: 'hackathon_private_photos',
      name: 'Private Photos Hackathon',
      slug: 'private-photos-hackathon',
      description: 'Private Photos Hackathon',
      city: 'Vienna',
      country: 'Austria',
      address: 'Address',
      registrationOpensAt: '2026-03-20T12:00:00.000Z',
      registrationClosesAt: '2026-03-23T12:00:00.000Z',
      submissionOpensAt: '2026-03-23T12:00:00.000Z',
      submissionClosesAt: '2026-03-25T12:00:00.000Z',
      state: 'registration_open',
      maxTeamMembers: 5,
      createdByUserId: 'creator_1'
    })
    await harness.database.insert(hackathonTermsDocuments).values({
      id: 'terms_photos',
      hackathonId: 'hackathon_private_photos',
      documentType: 'application_terms',
      version: 1,
      title: 'Application Terms',
      content: 'Application terms',
      publishedAt: '2026-03-20T00:00:00.000Z'
    })
    await harness.database.insert(userApplications).values({
      id: 'application_approved_photos',
      hackathonId: 'hackathon_private_photos',
      userId: 'approved_participant',
      status: 'approved',
      submittedAt: '2026-03-21T12:00:00.000Z',
      reviewedAt: '2026-03-22T12:00:00.000Z',
      reviewedByUserId: 'creator_1',
      applicationTermsDocumentId: 'terms_photos',
      applicationTermsAcceptedAt: '2026-03-21T12:00:00.000Z',
      registrationDetailsJson: '{}',
      createdAt: '2026-03-21T12:00:00.000Z',
      updatedAt: '2026-03-22T12:00:00.000Z'
    })
    await harness.database.insert(hackathonPhotos).values({
      id: 'photo_approved_visibility',
      hackathonId: 'hackathon_private_photos',
      uploadedByUserId: 'creator_1',
      fileName: 'gallery-photo.png',
      contentType: 'image/png',
      width: 1600,
      height: 900,
      createdAt: '2026-04-01T12:00:00.000Z'
    })

    const response = await harness.request('/api/hackathons/slug/private-photos-hackathon')

    expect(response.status).toBe(200)
    expect(await response.json()).toMatchObject({
      data: {
        hasPhotos: true
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
        discordServerUrl: 'https://discord.gg/new-hackathon',
        lumaEventUrl: 'https://lu.ma/new-hackathon',
        lumaEventApiId: 'evt-newhackathon123',
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
        country: 'Austria',
        address: 'Address',
        registrationOpensAt: '2026-03-20T12:00:00.000Z',
        registrationClosesAt: '2026-03-23T12:00:00.000Z',
        submissionOpensAt: '2026-03-23T12:00:00.000Z',
        submissionClosesAt: '2026-03-25T12:00:00.000Z',
        maxTeamMembers: 5,
        blindReviewCount: 2,
        pitchReviewEnabled: true,
        blindScoreWeightPercent: 60,
        pitchScoreWeightPercent: 40,
        inPersonEvent: true,
        requireXProfile: true,
        requireLinkedinProfile: false,
        requireGithubProfile: true,
        requireChatgptEmail: true,
        requireOpenaiOrgId: true,
        requireLumaEmail: true,
        requireWhyThisHackathon: true,
        requireProofOfExecution: true,
        requireSubmissionSummary: true,
        requireSubmissionRepositoryUrl: true,
        requireSubmissionDemoUrl: true
      })
    })

    expect(response.status).toBe(200)
    const payload = await response.json()
    expect(payload).toMatchObject({
      data: {
        name: 'New Hackathon',
        slug: 'new-hackathon',
        lumaEventUrl: 'https://lu.ma/new-hackathon',
        lumaEventApiId: 'evt-newhackathon123',
        state: 'draft',
        blindReviewCount: 2,
        pitchReviewEnabled: true,
        blindScoreWeightPercent: 60,
        pitchScoreWeightPercent: 40,
        createdByUserId: 'platform_admin',
        agendaItems: [
          expect.objectContaining({
            id: 'agenda_item_1',
            title: 'Opening'
          })
        ],
        inPersonEvent: true,
        requireChatgptEmail: true,
        requireOpenaiOrgId: true,
        requireLumaEmail: true,
        requireWhyThisHackathon: true,
        requireProofOfExecution: true,
        requireSubmissionSummary: true,
        requireSubmissionRepositoryUrl: true,
        requireSubmissionDemoUrl: true
      }
    })

    const createdHackathon = await harness.database.query.hackathons.findFirst({
      where: eq(hackathons.slug, 'new-hackathon')
    })

    expect(createdHackathon).toMatchObject({
      discordServerUrl: 'https://discord.gg/new-hackathon',
      lumaEventUrl: 'https://lu.ma/new-hackathon',
      lumaEventApiId: 'evt-newhackathon123',
      blindReviewCount: 2,
      pitchReviewEnabled: true,
      blindScoreWeightPercent: 60,
      pitchScoreWeightPercent: 40
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
      country: 'Austria',
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
        discordServerUrl: 'https://discord.gg/patch-hackathon',
        lumaEventUrl: 'https://lu.ma/patch-hackathon',
        lumaEventApiId: 'evt-patchhackathon123',
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
        country: 'Germany',
        maxTeamMembers: 7,
        blindReviewCount: 0,
        pitchReviewEnabled: true,
        blindScoreWeightPercent: 0,
        pitchScoreWeightPercent: 100,
        inPersonEvent: true,
        requireChatgptEmail: true,
        requireOpenaiOrgId: true,
        requireLumaEmail: true,
        requireWhyThisHackathon: true,
        requireProofOfExecution: true,
        requireSubmissionSummary: true,
        requireSubmissionRepositoryUrl: true,
        requireSubmissionDemoUrl: true
      })
    })

    expect(response.status).toBe(200)
    expect(await response.json()).toMatchObject({
      data: {
        id: 'hackathon_patch',
        state: 'registration_open',
        description: 'Updated description',
        lumaEventUrl: 'https://lu.ma/patch-hackathon',
        lumaEventApiId: 'evt-patchhackathon123',
        agendaItems: [
          expect.objectContaining({
            id: 'agenda_item_2',
            title: 'Updated item'
          })
        ],
        city: 'Berlin',
        country: 'Germany',
        maxTeamMembers: 7,
        blindReviewCount: 0,
        pitchReviewEnabled: true,
        blindScoreWeightPercent: 0,
        pitchScoreWeightPercent: 100,
        inPersonEvent: true,
        requireChatgptEmail: true,
        requireOpenaiOrgId: true,
        requireLumaEmail: true,
        requireWhyThisHackathon: true,
        requireProofOfExecution: true
      }
    })

    const updatedHackathon = await harness.database.query.hackathons.findFirst({
      where: eq(hackathons.id, 'hackathon_patch')
    })

    expect(updatedHackathon).toMatchObject({
      discordServerUrl: 'https://discord.gg/patch-hackathon',
      lumaEventUrl: 'https://lu.ma/patch-hackathon',
      lumaEventApiId: 'evt-patchhackathon123',
      blindReviewCount: 0,
      pitchReviewEnabled: true,
      blindScoreWeightPercent: 0,
      pitchScoreWeightPercent: 100
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
      country: 'Austria',
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
        [hackathonImagesBindingName]: hackathonImagesBucket,
        [authenticatedUploadRateLimitBindingName]: createRateLimiter()
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
      country: 'Austria',
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
      new Blob([pngSignatureBytes], { type: 'image/png' }),
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
    expect(backgroundResponse.headers.get('x-content-type-options')).toBe('nosniff')
    expect(new Uint8Array(await backgroundResponse.arrayBuffer())).toEqual(pngSignatureBytes)

    const bannerUploadForm = new FormData()
    bannerUploadForm.append(
      'file',
      new Blob([pngSignatureBytes], { type: 'image/png' }),
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
    expect(bannerResponse.headers.get('x-content-type-options')).toBe('nosniff')
    expect(new Uint8Array(await bannerResponse.arrayBuffer())).toEqual(pngSignatureBytes)

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

  test('hackathon photo routes let approved participants read but not manage the protected gallery', async () => {
    const hackathonImagesBucket = new InMemoryR2Bucket()
    const previewBytes = new Uint8Array([1, 2, 3, 4])
    const harness = createApiRouteTestHarness({
      routes: [
        { method: 'get', path: '/api/hackathons/:hackathonId/photos', handler: hackathonPhotosGetHandler },
        { method: 'post', path: '/api/hackathons/:hackathonId/photos', handler: hackathonPhotosPostHandler },
        { method: 'delete', path: '/api/hackathons/:hackathonId/photos/:photoId', handler: hackathonPhotoDeleteHandler },
        { method: 'get', path: '/api/hackathons/:hackathonId/photos/:photoId/image', handler: hackathonPhotoImageGetHandler }
      ],
      sessionUser: {
        sub: 'auth0|participant_user',
        email: 'participant@example.com'
      },
      cloudflareEnv: {
        [hackathonImagesBindingName]: hackathonImagesBucket,
        IMAGES: createImagesBinding({
          previewBytes
        }),
        [authenticatedUploadRateLimitBindingName]: createRateLimiter()
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
        id: 'participant_user',
        auth0Subject: 'auth0|participant_user',
        email: 'participant@example.com',
        displayName: 'Participant User'
      }
    ])
    await seedCurrentPlatformConsent(harness, 'participant_user')
    await harness.database.insert(hackathons).values({
      id: 'hackathon_photos_read',
      name: 'Photo Read Hackathon',
      slug: 'photo-read-hackathon',
      description: 'Hackathon with protected photos',
      city: 'Vienna',
      country: 'Austria',
      address: 'Address',
      registrationOpensAt: '2026-03-20T12:00:00.000Z',
      registrationClosesAt: '2026-03-23T12:00:00.000Z',
      submissionOpensAt: '2026-03-23T12:00:00.000Z',
      submissionClosesAt: '2026-03-25T12:00:00.000Z',
      state: 'registration_open',
      maxTeamMembers: 5,
      createdByUserId: 'creator_1'
    })
    await harness.database.insert(hackathonTermsDocuments).values({
      id: 'application_terms_photo_read',
      hackathonId: 'hackathon_photos_read',
      documentType: 'application_terms',
      version: 1,
      title: 'Photo Read Application Terms',
      content: 'Terms',
      publishedAt: '2026-03-01T00:00:00.000Z'
    })
    await harness.database.insert(userApplications).values({
      id: 'application_participant_photo_read',
      hackathonId: 'hackathon_photos_read',
      userId: 'participant_user',
      status: 'approved',
      applicationTermsDocumentId: 'application_terms_photo_read',
      applicationTermsAcceptedAt: '2026-03-02T00:00:00.000Z'
    })
    await hackathonImagesBucket.put('hackathons/hackathon_photos_read/photos/photo_1', pngSignatureBytes, {
      httpMetadata: {
        contentType: 'image/png'
      }
    })
    await harness.database.insert(hackathonPhotos).values({
      id: 'photo_1',
      hackathonId: 'hackathon_photos_read',
      uploadedByUserId: 'creator_1',
      fileName: 'gallery-photo.png',
      contentType: 'image/png',
      width: 1600,
      height: 900,
      createdAt: '2026-04-01T12:00:00.000Z'
    })

    const listResponse = await harness.request('/api/hackathons/hackathon_photos_read/photos')

    expect(listResponse.status).toBe(200)
    expect(await listResponse.json()).toMatchObject({
      data: [
        expect.objectContaining({
          id: 'photo_1',
          fileName: 'gallery-photo.png',
          previewUrl: '/api/hackathons/hackathon_photos_read/photos/photo_1/image?variant=preview&v=2026-04-01T12%3A00%3A00.000Z',
          originalUrl: '/api/hackathons/hackathon_photos_read/photos/photo_1/image?variant=original&v=2026-04-01T12%3A00%3A00.000Z'
        })
      ]
    })

    const previewResponse = await harness.request('/api/hackathons/hackathon_photos_read/photos/photo_1/image?variant=preview')

    expect(previewResponse.status).toBe(200)
    expect(previewResponse.headers.get('content-type')).toBe('image/webp')
    expect(previewResponse.headers.get('cache-control')).toBe('private, max-age=31536000, immutable')
    expect(new Uint8Array(await previewResponse.arrayBuffer())).toEqual(previewBytes)

    const originalResponse = await harness.request('/api/hackathons/hackathon_photos_read/photos/photo_1/image?variant=original')

    expect(originalResponse.status).toBe(200)
    expect(originalResponse.headers.get('content-type')).toBe('image/png')
    expect(new Uint8Array(await originalResponse.arrayBuffer())).toEqual(pngSignatureBytes)

    const uploadForm = new FormData()
    uploadForm.append('file', new Blob([pngSignatureBytes], { type: 'image/png' }), 'blocked-upload.png')

    const uploadResponse = await harness.request('/api/hackathons/hackathon_photos_read/photos', {
      method: 'POST',
      body: uploadForm
    })

    expect(uploadResponse.status).toBe(403)
    expect(await uploadResponse.json()).toMatchObject({
      error: {
        code: 'hackathon_photo_manage_required'
      }
    })

    const deleteResponse = await harness.request('/api/hackathons/hackathon_photos_read/photos/photo_1', {
      method: 'DELETE'
    })

    expect(deleteResponse.status).toBe(403)
    expect(await deleteResponse.json()).toMatchObject({
      error: {
        code: 'hackathon_photo_manage_required'
      }
    })
  })

  test('hackathon photo routes let judges upload and delete gallery photos', async () => {
    const hackathonImagesBucket = new InMemoryR2Bucket()
    const harness = createApiRouteTestHarness({
      routes: [
        { method: 'get', path: '/api/hackathons/:hackathonId/photos', handler: hackathonPhotosGetHandler },
        { method: 'post', path: '/api/hackathons/:hackathonId/photos', handler: hackathonPhotosPostHandler },
        { method: 'delete', path: '/api/hackathons/:hackathonId/photos/:photoId', handler: hackathonPhotoDeleteHandler }
      ],
      sessionUser: {
        sub: 'auth0|judge_user',
        email: 'judge@example.com'
      },
      cloudflareEnv: {
        [hackathonImagesBindingName]: hackathonImagesBucket,
        IMAGES: createImagesBinding(),
        [authenticatedUploadRateLimitBindingName]: createRateLimiter()
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
        id: 'judge_user',
        auth0Subject: 'auth0|judge_user',
        email: 'judge@example.com',
        displayName: 'Judge User'
      }
    ])
    await seedCurrentPlatformConsent(harness, 'judge_user')
    await harness.database.insert(hackathons).values({
      id: 'hackathon_photos_judge',
      name: 'Photo Judge Hackathon',
      slug: 'photo-judge-hackathon',
      description: 'Hackathon with judge-managed photos',
      city: 'Vienna',
      country: 'Austria',
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
      id: 'role_judge_photo_gallery',
      hackathonId: 'hackathon_photos_judge',
      userId: 'judge_user',
      role: 'judge',
      isInJudgePool: true,
      isStaff: false,
      createdAt: '2026-03-22T12:00:00.000Z'
    })

    const uploadForm = new FormData()
    uploadForm.append('file', new Blob([pngSignatureBytes], { type: 'image/png' }), 'judge-upload.png')

    const uploadResponse = await harness.request('/api/hackathons/hackathon_photos_judge/photos', {
      method: 'POST',
      body: uploadForm
    })

    expect(uploadResponse.status).toBe(200)
    const uploadPayload = await uploadResponse.json()
    expect(uploadPayload).toMatchObject({
      data: [
        expect.objectContaining({
          fileName: 'judge-upload.png',
          contentType: 'image/png',
          width: 1600,
          height: 900,
          uploadedByUserId: 'judge_user'
        })
      ]
    })

    const createdPhotoId = uploadPayload.data[0].id as string
    const storedPhotoObject = await hackathonImagesBucket.get(`hackathons/hackathon_photos_judge/photos/${createdPhotoId}`)

    expect(storedPhotoObject).not.toBeNull()
    expect(new Uint8Array(await storedPhotoObject!.arrayBuffer())).toEqual(pngSignatureBytes)

    const deleteResponse = await harness.request(
      `/api/hackathons/hackathon_photos_judge/photos/${createdPhotoId}`,
      {
        method: 'DELETE'
      }
    )

    expect(deleteResponse.status).toBe(200)
    expect(await deleteResponse.json()).toMatchObject({
      data: {
        id: createdPhotoId
      }
    })

    const remainingPhotos = await harness.database.select().from(hackathonPhotos)
    expect(remainingPhotos).toEqual([])

    const auditEntries = await harness.database.select().from(auditLogs)
    expect(auditEntries).toEqual([
      expect.objectContaining({
        actorUserId: 'judge_user',
        entityType: 'hackathon_photo',
        action: 'hackathon_photo.created'
      }),
      expect.objectContaining({
        actorUserId: 'judge_user',
        entityType: 'hackathon_photo',
        action: 'hackathon_photo.deleted'
      })
    ])
  })

  test('hackathon photo routes let staff upload gallery photos', async () => {
    const hackathonImagesBucket = new InMemoryR2Bucket()
    const harness = createApiRouteTestHarness({
      routes: [
        { method: 'post', path: '/api/hackathons/:hackathonId/photos', handler: hackathonPhotosPostHandler }
      ],
      sessionUser: {
        sub: 'auth0|staff_user',
        email: 'staff@example.com'
      },
      cloudflareEnv: {
        [hackathonImagesBindingName]: hackathonImagesBucket,
        IMAGES: createImagesBinding(),
        [authenticatedUploadRateLimitBindingName]: createRateLimiter()
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
        id: 'staff_user',
        auth0Subject: 'auth0|staff_user',
        email: 'staff@example.com',
        displayName: 'Staff User'
      }
    ])
    await seedCurrentPlatformConsent(harness, 'staff_user')
    await harness.database.insert(hackathons).values({
      id: 'hackathon_photos_staff',
      name: 'Photo Staff Hackathon',
      slug: 'photo-staff-hackathon',
      description: 'Hackathon with staff-managed photos',
      city: 'Vienna',
      country: 'Austria',
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
      id: 'role_staff_photo_gallery',
      hackathonId: 'hackathon_photos_staff',
      userId: 'staff_user',
      role: 'staff',
      isInJudgePool: false,
      isStaff: true,
      createdAt: '2026-03-22T12:00:00.000Z'
    })

    const uploadForm = new FormData()
    uploadForm.append('file', new Blob([pngSignatureBytes], { type: 'image/png' }), 'staff-upload.png')

    const uploadResponse = await harness.request('/api/hackathons/hackathon_photos_staff/photos', {
      method: 'POST',
      body: uploadForm
    })

    expect(uploadResponse.status).toBe(200)
    expect(await uploadResponse.json()).toMatchObject({
      data: [
        expect.objectContaining({
          fileName: 'staff-upload.png',
          uploadedByUserId: 'staff_user'
        })
      ]
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
        [hackathonImagesBindingName]: hackathonImagesBucket,
        [authenticatedUploadRateLimitBindingName]: createRateLimiter()
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
      country: 'Austria',
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

    const invalidImageForm = new FormData()
    invalidImageForm.append(
      'file',
      new Blob([new Uint8Array([1, 2, 3, 4])], { type: 'image/png' }),
      'background.png'
    )

    const invalidTypeResponse = await harness.request('/api/hackathons/hackathon_images/images/background', {
      method: 'POST',
      body: invalidImageForm
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
      new Blob([createOversizedPngBytes((5 * 1024 * 1024) + 1)], { type: 'image/png' }),
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

  test('POST /api/hackathons/:hackathonId/images/background returns 429 when the authenticated upload rate limit is exceeded', async () => {
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
        [hackathonImagesBindingName]: hackathonImagesBucket,
        [authenticatedUploadRateLimitBindingName]: createRateLimiter(false)
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
      country: 'Austria',
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

    const uploadForm = new FormData()
    uploadForm.append(
      'file',
      new Blob([pngSignatureBytes], { type: 'image/png' }),
      'background.png'
    )

    const response = await harness.request('/api/hackathons/hackathon_images/images/background', {
      method: 'POST',
      body: uploadForm
    })

    expect(response.status).toBe(429)
    expect(await response.json()).toEqual({
      error: {
        code: 'upload_rate_limited',
        message: 'Too many uploads were submitted. Please wait before trying again.'
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
      country: 'Austria',
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

  test('POST /api/hackathons/:hackathonId/actions/open-registration opens registration and audits the state change', async () => {
    const harness = createApiRouteTestHarness({
      routes: [
        {
          method: 'post',
          path: '/api/hackathons/:hackathonId/actions/open-registration',
          handler: openRegistrationPostHandler
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
      id: 'hackathon_open_registration',
      name: 'Open Registration Hackathon',
      slug: 'open-registration-hackathon',
      description: 'Open registration',
      city: 'Vienna',
      country: 'Austria',
      address: 'Address',
      registrationOpensAt: new Date(now - 86_400_000).toISOString(),
      registrationClosesAt: new Date(now + 86_400_000).toISOString(),
      submissionOpensAt: new Date(now + 86_400_000).toISOString(),
      submissionClosesAt: new Date(now + 172_800_000).toISOString(),
      state: 'draft',
      maxTeamMembers: 5,
      createdByUserId: 'platform_admin'
    })

    const response = await harness.request('/api/hackathons/hackathon_open_registration/actions/open-registration', {
      method: 'POST'
    })

    expect(response.status).toBe(200)
    expect(await response.json()).toMatchObject({
      data: {
        id: 'hackathon_open_registration',
        state: 'registration_open'
      }
    })

    const updatedHackathon = await harness.database.query.hackathons.findFirst({
      where: eq(hackathons.id, 'hackathon_open_registration')
    })
    const auditEntries = await harness.database.select().from(auditLogs)

    expect(updatedHackathon?.state).toBe('registration_open')
    expect(auditEntries).toEqual([
      expect.objectContaining({
        actorUserId: 'platform_admin',
        entityType: 'hackathon',
        entityId: 'hackathon_open_registration',
        action: 'hackathon.open_registration'
      })
    ])
  })

  test('POST /api/hackathons/:hackathonId/actions/start-judging-preparation transitions to judging preparation without locking submissions and audits', async () => {
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
      country: 'Austria',
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
    const storedSubmissions = await harness.database.select().from(submissions)
    const snapshotRows = await harness.database.select().from(prizeEligibilitySnapshots)
    const assignmentRows = await harness.database.select().from(judgeAssignments)
    const auditEntries = await harness.database.select().from(auditLogs)

    expect(updatedHackathon?.state).toBe('judging_preparation')
    expect(storedSubmissions).toEqual(expect.arrayContaining([
      expect.objectContaining({
        id: 'submission_1',
        status: 'submitted'
      }),
      expect.objectContaining({
        id: 'submission_2',
        status: 'submitted'
      })
    ]))
    expect(snapshotRows).toHaveLength(0)
    expect(assignmentRows).toHaveLength(0)
    expect(auditEntries).toEqual([
      expect.objectContaining({
        actorUserId: 'platform_admin',
        entityType: 'hackathon',
        entityId: 'hackathon_judging_prep',
        action: 'hackathon.start_judging_preparation'
      })
    ])
  })

  test('POST /api/hackathons/:hackathonId/actions/start-blind-review rejects two blind reviews when the judge pool lacks distinct judges', async () => {
    const harness = createApiRouteTestHarness({
      routes: [
        {
          method: 'post',
          path: '/api/hackathons/:hackathonId/actions/start-blind-review',
          handler: startBlindReviewPostHandler
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
      id: 'hackathon_insufficient_judges',
      name: 'Insufficient Judges Hackathon',
      slug: 'insufficient-judges-hackathon',
      description: 'Judging preparation',
      city: 'Vienna',
      country: 'Austria',
      address: 'Address',
      registrationOpensAt: '2026-03-18T12:00:00.000Z',
      registrationClosesAt: '2026-03-19T12:00:00.000Z',
      submissionOpensAt: '2026-03-19T12:00:00.000Z',
      submissionClosesAt: '2026-03-21T12:00:00.000Z',
      state: 'judging_preparation',
      blindReviewCount: 2,
      pitchReviewEnabled: false,
      blindScoreWeightPercent: 100,
      pitchScoreWeightPercent: 0,
      maxTeamMembers: 5,
      createdByUserId: 'platform_admin'
    })

    await harness.database.insert(hackathonRoleAssignments).values({
      id: 'role_judge_a',
      hackathonId: 'hackathon_insufficient_judges',
      userId: 'judge_a',
      role: 'judge',
      isInJudgePool: true,
      createdAt: '2026-03-22T12:00:00.000Z'
    })

    await harness.database.insert(teams).values({
      id: 'team_1',
      hackathonId: 'hackathon_insufficient_judges',
      name: 'Alpha Team',
      slug: 'alpha-team',
      isOpenToJoinRequests: false,
      createdByUserId: 'team_admin',
      createdAt: '2026-03-22T12:00:00.000Z',
      updatedAt: '2026-03-22T12:00:00.000Z'
    })

    await harness.database.insert(teamMembers).values({
      id: 'membership_admin',
      teamId: 'team_1',
      userId: 'team_admin',
      role: 'admin',
      joinedAt: '2026-03-22T12:00:00.000Z',
      createdAt: '2026-03-22T12:00:00.000Z'
    })

    await harness.database.insert(submissions).values({
      id: 'submission_1',
      teamId: 'team_1',
      status: 'submitted',
      projectName: 'Project One',
      submittedAt: '2026-03-24T12:00:00.000Z',
      createdAt: '2026-03-24T12:00:00.000Z',
      updatedAt: '2026-03-24T12:00:00.000Z'
    })

    const response = await harness.request('/api/hackathons/hackathon_insufficient_judges/actions/start-blind-review', {
      method: 'POST'
    })

    expect(response.status).toBe(409)
    expect(await response.json()).toMatchObject({
      error: {
        code: 'distinct_blind_review_judges_required'
      }
    })

    const storedHackathon = await harness.database.query.hackathons.findFirst({
      where: eq(hackathons.id, 'hackathon_insufficient_judges')
    })
    const storedSubmission = await harness.database.query.submissions.findFirst({
      where: eq(submissions.id, 'submission_1')
    })
    const assignmentRows = await harness.database.select().from(judgeAssignments)

    expect(storedHackathon?.state).toBe('judging_preparation')
    expect(storedSubmission?.status).toBe('submitted')
    expect(assignmentRows).toHaveLength(0)
  })

  test('POST /api/hackathons/:hackathonId/actions/start-blind-review locks submissions, snapshots members, creates assignments, and audits', async () => {
    const harness = createApiRouteTestHarness({
      routes: [
        {
          method: 'post',
          path: '/api/hackathons/:hackathonId/actions/start-blind-review',
          handler: startBlindReviewPostHandler
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
      id: 'hackathon_blind_review',
      name: 'Blind Review Hackathon',
      slug: 'blind-review-hackathon',
      description: 'Blind review',
      city: 'Vienna',
      country: 'Austria',
      address: 'Address',
      registrationOpensAt: '2026-03-20T12:00:00.000Z',
      registrationClosesAt: '2026-03-23T12:00:00.000Z',
      submissionOpensAt: '2026-03-23T12:00:00.000Z',
      submissionClosesAt: '2026-03-25T12:00:00.000Z',
      state: 'judging_preparation',
      blindReviewCount: 1,
      maxTeamMembers: 5,
      createdByUserId: 'platform_admin'
    })

    await harness.database.insert(hackathonRoleAssignments).values({
      id: 'role_judge_a',
      hackathonId: 'hackathon_blind_review',
      userId: 'judge_a',
      role: 'judge',
      isInJudgePool: true,
      createdAt: '2026-03-25T12:15:00.000Z'
    })

    await harness.database.insert(teams).values({
      id: 'team_1',
      hackathonId: 'hackathon_blind_review',
      name: 'Alpha Team',
      slug: 'alpha-team',
      isOpenToJoinRequests: false,
      createdByUserId: 'team_admin',
      createdAt: '2026-03-22T12:00:00.000Z',
      updatedAt: '2026-03-22T12:00:00.000Z'
    })

    await harness.database.insert(teamMembers).values({
      id: 'membership_admin',
      teamId: 'team_1',
      userId: 'team_admin',
      role: 'admin',
      joinedAt: '2026-03-22T12:00:00.000Z',
      createdAt: '2026-03-22T12:00:00.000Z'
    })

    await harness.database.insert(submissions).values({
      id: 'submission_1',
      teamId: 'team_1',
      status: 'submitted',
      projectName: 'Project One',
      submittedAt: '2026-03-24T12:00:00.000Z',
      createdAt: '2026-03-24T12:00:00.000Z',
      updatedAt: '2026-03-24T12:00:00.000Z'
    })

    const response = await harness.request('/api/hackathons/hackathon_blind_review/actions/start-blind-review', {
      method: 'POST'
    })

    expect(response.status).toBe(200)
    expect(await response.json()).toMatchObject({
      data: {
        id: 'hackathon_blind_review',
        state: 'blind_review'
      }
    })

    const updatedHackathon = await harness.database.query.hackathons.findFirst({
      where: eq(hackathons.id, 'hackathon_blind_review')
    })
    const storedSubmission = await harness.database.query.submissions.findFirst({
      where: eq(submissions.id, 'submission_1')
    })
    const snapshotRows = await harness.database.select().from(prizeEligibilitySnapshots)
    const assignmentRows = await harness.database.select().from(judgeAssignments)
    const auditEntries = await harness.database.select().from(auditLogs)

    expect(updatedHackathon?.state).toBe('blind_review')
    expect(storedSubmission?.status).toBe('locked')
    expect(storedSubmission?.lockedAt).toBeTruthy()
    expect(snapshotRows).toHaveLength(1)
    expect(assignmentRows).toEqual([
      expect.objectContaining({
        submissionId: 'submission_1',
        judgeUserId: 'judge_a',
        reviewStage: 'blind_review',
        blindReviewSlot: 1,
        status: 'assigned'
      })
    ])
    expect(auditEntries).toEqual([
      expect.objectContaining({
        actorUserId: 'platform_admin',
        entityType: 'hackathon',
        entityId: 'hackathon_blind_review',
        action: 'hackathon.start_blind_review'
      })
    ])
  })

  test('POST /api/hackathons/:hackathonId/actions/start-blind-review chunks bulk inserts to stay within D1 bind limits', async () => {
    const harness = createApiRouteTestHarness({
      routes: [
        {
          method: 'post',
          path: '/api/hackathons/:hackathonId/actions/start-blind-review',
          handler: startBlindReviewPostHandler
        }
      ],
      sessionUser: {
        sub: 'auth0|platform_admin',
        email: 'platform-admin@example.com'
      }
    })
    harnesses.push(harness)

    const participantCount = 17

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
      ...Array.from({ length: participantCount }, (_, index) => ({
        id: `team_admin_${index + 1}`,
        auth0Subject: `auth0|team_admin_${index + 1}`,
        email: `team-admin-${index + 1}@example.com`,
        displayName: `Team Admin ${index + 1}`
      }))
    ])

    await harness.database.insert(hackathons).values({
      id: 'hackathon_blind_review_large',
      name: 'Blind Review Large Hackathon',
      slug: 'blind-review-large-hackathon',
      description: 'Blind review',
      city: 'Vienna',
      country: 'Austria',
      address: 'Address',
      registrationOpensAt: '2026-03-20T12:00:00.000Z',
      registrationClosesAt: '2026-03-23T12:00:00.000Z',
      submissionOpensAt: '2026-03-23T12:00:00.000Z',
      submissionClosesAt: '2026-03-25T12:00:00.000Z',
      state: 'judging_preparation',
      blindReviewCount: 1,
      maxTeamMembers: 5,
      createdByUserId: 'platform_admin'
    })

    await harness.database.insert(hackathonRoleAssignments).values({
      id: 'role_judge_a',
      hackathonId: 'hackathon_blind_review_large',
      userId: 'judge_a',
      role: 'judge',
      isInJudgePool: true,
      createdAt: '2026-03-25T12:15:00.000Z'
    })

    await harness.database.insert(teams).values(
      Array.from({ length: participantCount }, (_, index) => ({
        id: `team_${index + 1}`,
        hackathonId: 'hackathon_blind_review_large',
        name: `Team ${index + 1}`,
        slug: `team-${index + 1}`,
        isOpenToJoinRequests: false,
        createdByUserId: `team_admin_${index + 1}`,
        createdAt: `2026-03-22T${String(index).padStart(2, '0')}:00:00.000Z`,
        updatedAt: `2026-03-22T${String(index).padStart(2, '0')}:00:00.000Z`
      }))
    )

    await harness.database.insert(teamMembers).values(
      Array.from({ length: participantCount }, (_, index) => ({
        id: `membership_${index + 1}`,
        teamId: `team_${index + 1}`,
        userId: `team_admin_${index + 1}`,
        role: 'admin' as const,
        joinedAt: `2026-03-22T${String(index).padStart(2, '0')}:00:00.000Z`,
        createdAt: `2026-03-22T${String(index).padStart(2, '0')}:00:00.000Z`
      }))
    )

    await harness.database.insert(submissions).values(
      Array.from({ length: participantCount }, (_, index) => ({
        id: `submission_${index + 1}`,
        teamId: `team_${index + 1}`,
        status: 'submitted' as const,
        projectName: `Project ${index + 1}`,
        submittedAt: `2026-03-24T${String(index).padStart(2, '0')}:00:00.000Z`,
        createdAt: `2026-03-24T${String(index).padStart(2, '0')}:00:00.000Z`,
        updatedAt: `2026-03-24T${String(index).padStart(2, '0')}:00:00.000Z`
      }))
    )

    enforceD1BindParameterLimit(harness)

    const response = await harness.request('/api/hackathons/hackathon_blind_review_large/actions/start-blind-review', {
      method: 'POST'
    })

    expect(response.status).toBe(200)
    expect(await response.json()).toMatchObject({
      data: {
        id: 'hackathon_blind_review_large',
        state: 'blind_review'
      }
    })

    const updatedHackathon = await harness.database.query.hackathons.findFirst({
      where: eq(hackathons.id, 'hackathon_blind_review_large')
    })
    const storedSubmissions = await harness.database.select().from(submissions)
    const snapshotRows = await harness.database.select().from(prizeEligibilitySnapshots)
    const assignmentRows = await harness.database.select().from(judgeAssignments)
    const auditEntries = await harness.database.select().from(auditLogs)

    expect(updatedHackathon?.state).toBe('blind_review')
    expect(storedSubmissions.every(submission => submission.status === 'locked')).toBe(true)
    expect(snapshotRows).toHaveLength(participantCount)
    expect(assignmentRows).toHaveLength(participantCount)
    expect(assignmentRows.every(row => row.reviewStage === 'blind_review')).toBe(true)
    expect(auditEntries).toEqual([
      expect.objectContaining({
        actorUserId: 'platform_admin',
        entityType: 'hackathon',
        entityId: 'hackathon_blind_review_large',
        action: 'hackathon.start_blind_review'
      })
    ])
  })

  test('POST /api/hackathons/:hackathonId/actions/start-pitch opens the live pitch stage, locks submitted work, and avoids judge assignments in pitch-only hackathons', async () => {
    const harness = createApiRouteTestHarness({
      routes: [
        {
          method: 'post',
          path: '/api/hackathons/:hackathonId/actions/start-pitch',
          handler: startPitchPostHandler
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
      id: 'hackathon_pitch_only',
      name: 'Pitch Only Hackathon',
      slug: 'pitch-only-hackathon',
      description: 'Pitch only',
      city: 'Vienna',
      country: 'Austria',
      address: 'Address',
      registrationOpensAt: '2026-03-20T12:00:00.000Z',
      registrationClosesAt: '2026-03-23T12:00:00.000Z',
      submissionOpensAt: '2026-03-23T12:00:00.000Z',
      submissionClosesAt: '2026-03-25T12:00:00.000Z',
      state: 'judging_preparation',
      blindReviewCount: 0,
      pitchReviewEnabled: true,
      blindScoreWeightPercent: 0,
      pitchScoreWeightPercent: 100,
      maxTeamMembers: 5,
      createdByUserId: 'platform_admin'
    })

    await harness.database.insert(hackathonRoleAssignments).values([
      {
        id: 'role_judge_a',
        hackathonId: 'hackathon_pitch_only',
        userId: 'judge_a',
        role: 'judge',
        isInJudgePool: true,
        createdAt: '2026-03-22T12:00:00.000Z'
      },
      {
        id: 'role_judge_b',
        hackathonId: 'hackathon_pitch_only',
        userId: 'judge_b',
        role: 'judge',
        isInJudgePool: true,
        createdAt: '2026-03-22T12:01:00.000Z'
      }
    ])

    await harness.database.insert(teams).values([
      {
        id: 'team_pitch_1',
        hackathonId: 'hackathon_pitch_only',
        name: 'Alpha Team',
        slug: 'alpha-team',
        isOpenToJoinRequests: false,
        createdByUserId: 'team_admin_one',
        createdAt: '2026-03-22T12:00:00.000Z',
        updatedAt: '2026-03-22T12:00:00.000Z'
      },
      {
        id: 'team_pitch_2',
        hackathonId: 'hackathon_pitch_only',
        name: 'Beta Team',
        slug: 'beta-team',
        isOpenToJoinRequests: false,
        createdByUserId: 'team_admin_two',
        createdAt: '2026-03-22T12:01:00.000Z',
        updatedAt: '2026-03-22T12:01:00.000Z'
      }
    ])

    await harness.database.insert(teamMembers).values([
      {
        id: 'membership_pitch_1',
        teamId: 'team_pitch_1',
        userId: 'team_admin_one',
        role: 'admin',
        joinedAt: '2026-03-22T12:00:00.000Z',
        createdAt: '2026-03-22T12:00:00.000Z'
      },
      {
        id: 'membership_pitch_2',
        teamId: 'team_pitch_2',
        userId: 'team_admin_two',
        role: 'admin',
        joinedAt: '2026-03-22T12:01:00.000Z',
        createdAt: '2026-03-22T12:01:00.000Z'
      }
    ])

    await harness.database.insert(submissions).values([
      {
        id: 'submission_pitch_1',
        teamId: 'team_pitch_1',
        status: 'submitted',
        projectName: 'Project One',
        submittedAt: '2026-03-24T12:00:00.000Z',
        createdAt: '2026-03-24T12:00:00.000Z',
        updatedAt: '2026-03-24T12:00:00.000Z'
      },
      {
        id: 'submission_pitch_2',
        teamId: 'team_pitch_2',
        status: 'submitted',
        projectName: 'Project Two',
        submittedAt: '2026-03-24T12:05:00.000Z',
        createdAt: '2026-03-24T12:05:00.000Z',
        updatedAt: '2026-03-24T12:05:00.000Z'
      }
    ])

    const response = await harness.request('/api/hackathons/hackathon_pitch_only/actions/start-pitch', {
      method: 'POST'
    })

    expect(response.status).toBe(200)
    expect(await response.json()).toMatchObject({
      data: {
        id: 'hackathon_pitch_only',
        state: 'pitch',
        pitchPresentationSubmissionIds: ['submission_pitch_1', 'submission_pitch_2'],
        activePitchPresentationSubmissionId: null,
        pitchPresentationsCompletedAt: null
      }
    })

    const updatedHackathon = await harness.database.query.hackathons.findFirst({
      where: eq(hackathons.id, 'hackathon_pitch_only')
    })
    const storedSubmissions = await harness.database.select().from(submissions)
    const snapshotRows = await harness.database.select().from(prizeEligibilitySnapshots)
    const assignmentRows = await harness.database.select().from(judgeAssignments)
    const auditEntries = await harness.database.select().from(auditLogs)

    expect(updatedHackathon?.state).toBe('pitch')
    expect(updatedHackathon?.pitchFinalistSubmissionIdsJson).toBe(JSON.stringify(['submission_pitch_1', 'submission_pitch_2']))
    expect(updatedHackathon?.activePitchPresentationSubmissionId).toBeNull()
    expect(updatedHackathon?.pitchPresentationsCompletedAt).toBeNull()
    expect(storedSubmissions).toEqual(expect.arrayContaining([
      expect.objectContaining({
        id: 'submission_pitch_1',
        status: 'locked'
      }),
      expect.objectContaining({
        id: 'submission_pitch_2',
        status: 'locked'
      })
    ]))
    expect(snapshotRows).toHaveLength(2)
    expect(assignmentRows).toHaveLength(0)
    expect(auditEntries).toEqual([
      expect.objectContaining({
        actorUserId: 'platform_admin',
        entityType: 'hackathon',
        entityId: 'hackathon_pitch_only',
        action: 'hackathon.start_pitch'
      })
    ])
  })

  test('POST /api/hackathons/:hackathonId/actions/advance-pitch-presentation steps through the live pitch lineup and completes it after the last team', async () => {
    const harness = createApiRouteTestHarness({
      routes: [
        {
          method: 'post',
          path: '/api/hackathons/:hackathonId/actions/advance-pitch-presentation',
          handler: advancePitchPresentationPostHandler
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
      id: 'hackathon_pitch_only',
      name: 'Pitch Only Hackathon',
      slug: 'pitch-only-hackathon',
      description: 'Pitch only',
      city: 'Vienna',
      country: 'Austria',
      address: 'Address',
      registrationOpensAt: '2026-03-20T12:00:00.000Z',
      registrationClosesAt: '2026-03-23T12:00:00.000Z',
      submissionOpensAt: '2026-03-23T12:00:00.000Z',
      submissionClosesAt: '2026-03-25T12:00:00.000Z',
      state: 'pitch',
      blindReviewCount: 0,
      pitchReviewEnabled: true,
      blindScoreWeightPercent: 0,
      pitchScoreWeightPercent: 100,
      pitchFinalistSubmissionIdsJson: JSON.stringify(['submission_pitch_1', 'submission_pitch_2']),
      maxTeamMembers: 5,
      createdByUserId: 'platform_admin'
    })

    await harness.database.insert(teams).values([
      {
        id: 'team_pitch_1',
        hackathonId: 'hackathon_pitch_only',
        name: 'Alpha Team',
        slug: 'alpha-team',
        isOpenToJoinRequests: false,
        createdByUserId: 'team_admin_one',
        createdAt: '2026-03-22T12:00:00.000Z',
        updatedAt: '2026-03-22T12:00:00.000Z'
      },
      {
        id: 'team_pitch_2',
        hackathonId: 'hackathon_pitch_only',
        name: 'Beta Team',
        slug: 'beta-team',
        isOpenToJoinRequests: false,
        createdByUserId: 'team_admin_two',
        createdAt: '2026-03-22T12:01:00.000Z',
        updatedAt: '2026-03-22T12:01:00.000Z'
      }
    ])

    await harness.database.insert(submissions).values([
      {
        id: 'submission_pitch_1',
        teamId: 'team_pitch_1',
        status: 'locked',
        projectName: 'Project One',
        submittedAt: '2026-03-24T12:00:00.000Z',
        lockedAt: '2026-03-25T12:30:00.000Z',
        createdAt: '2026-03-24T12:00:00.000Z',
        updatedAt: '2026-03-25T12:30:00.000Z'
      },
      {
        id: 'submission_pitch_2',
        teamId: 'team_pitch_2',
        status: 'locked',
        projectName: 'Project Two',
        submittedAt: '2026-03-24T12:05:00.000Z',
        lockedAt: '2026-03-25T12:30:00.000Z',
        createdAt: '2026-03-24T12:05:00.000Z',
        updatedAt: '2026-03-25T12:30:00.000Z'
      }
    ])

    const firstResponse = await harness.request('/api/hackathons/hackathon_pitch_only/actions/advance-pitch-presentation', {
      method: 'POST'
    })

    expect(firstResponse.status).toBe(200)
    expect(await firstResponse.json()).toMatchObject({
      data: {
        activePitchPresentationSubmissionId: 'submission_pitch_1',
        pitchPresentationsCompletedAt: null
      }
    })

    const secondResponse = await harness.request('/api/hackathons/hackathon_pitch_only/actions/advance-pitch-presentation', {
      method: 'POST'
    })

    expect(secondResponse.status).toBe(200)
    expect(await secondResponse.json()).toMatchObject({
      data: {
        activePitchPresentationSubmissionId: 'submission_pitch_2',
        pitchPresentationsCompletedAt: null
      }
    })

    const finalResponse = await harness.request('/api/hackathons/hackathon_pitch_only/actions/advance-pitch-presentation', {
      method: 'POST'
    })

    expect(finalResponse.status).toBe(200)
    const finalPayload = await finalResponse.json()
    expect(finalPayload).toMatchObject({
      data: {
        activePitchPresentationSubmissionId: null
      }
    })
    expect(finalPayload.data.pitchPresentationsCompletedAt).toMatch(/2026-/)

    const updatedHackathon = await harness.database.query.hackathons.findFirst({
      where: eq(hackathons.id, 'hackathon_pitch_only')
    })
    const auditEntries = await harness.database.select().from(auditLogs)

    expect(updatedHackathon?.activePitchPresentationSubmissionId).toBeNull()
    expect(updatedHackathon?.pitchPresentationsCompletedAt).toBeTruthy()
    expect(auditEntries.filter(entry => entry.action === 'hackathon.advance_pitch_presentation')).toHaveLength(3)
  })

  test('POST /api/hackathons/:hackathonId/actions/start-pitch-review rejects pitch-only hackathons until the live lineup is completed', async () => {
    const harness = createApiRouteTestHarness({
      routes: [
        {
          method: 'post',
          path: '/api/hackathons/:hackathonId/actions/start-pitch-review',
          handler: startPitchReviewPostHandler
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
        id: 'team_admin_one',
        auth0Subject: 'auth0|team_admin_one',
        email: 'team-admin-one@example.com',
        displayName: 'Team Admin One'
      }
    ])

    await harness.database.insert(hackathons).values({
      id: 'hackathon_pitch_only',
      name: 'Pitch Only Hackathon',
      slug: 'pitch-only-hackathon',
      description: 'Pitch only',
      city: 'Vienna',
      country: 'Austria',
      address: 'Address',
      registrationOpensAt: '2026-03-20T12:00:00.000Z',
      registrationClosesAt: '2026-03-23T12:00:00.000Z',
      submissionOpensAt: '2026-03-23T12:00:00.000Z',
      submissionClosesAt: '2026-03-25T12:00:00.000Z',
      state: 'pitch',
      blindReviewCount: 0,
      pitchReviewEnabled: true,
      blindScoreWeightPercent: 0,
      pitchScoreWeightPercent: 100,
      pitchFinalistSubmissionIdsJson: JSON.stringify(['submission_pitch_1']),
      activePitchPresentationSubmissionId: 'submission_pitch_1',
      maxTeamMembers: 5,
      createdByUserId: 'platform_admin'
    })

    await harness.database.insert(hackathonRoleAssignments).values({
      id: 'role_judge_a',
      hackathonId: 'hackathon_pitch_only',
      userId: 'judge_a',
      role: 'judge',
      isInJudgePool: true,
      createdAt: '2026-03-22T12:00:00.000Z'
    })

    await harness.database.insert(teams).values({
      id: 'team_pitch_1',
      hackathonId: 'hackathon_pitch_only',
      name: 'Alpha Team',
      slug: 'alpha-team',
      isOpenToJoinRequests: false,
      createdByUserId: 'team_admin_one',
      createdAt: '2026-03-22T12:00:00.000Z',
      updatedAt: '2026-03-22T12:00:00.000Z'
    })

    await harness.database.insert(submissions).values({
      id: 'submission_pitch_1',
      teamId: 'team_pitch_1',
      status: 'locked',
      projectName: 'Project One',
      submittedAt: '2026-03-24T12:00:00.000Z',
      lockedAt: '2026-03-25T12:30:00.000Z',
      createdAt: '2026-03-24T12:00:00.000Z',
      updatedAt: '2026-03-25T12:30:00.000Z'
    })

    const response = await harness.request('/api/hackathons/hackathon_pitch_only/actions/start-pitch-review', {
      method: 'POST'
    })

    expect(response.status).toBe(409)
    expect(await response.json()).toMatchObject({
      error: {
        code: 'pitch_presentations_incomplete'
      }
    })
  })

  test('POST /api/hackathons/:hackathonId/actions/start-pitch-review creates pitch-panel assignments for every locked submission in pitch-only hackathons after the live lineup is completed', async () => {
    const harness = createApiRouteTestHarness({
      routes: [
        {
          method: 'post',
          path: '/api/hackathons/:hackathonId/actions/start-pitch-review',
          handler: startPitchReviewPostHandler
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
      id: 'hackathon_pitch_only',
      name: 'Pitch Only Hackathon',
      slug: 'pitch-only-hackathon',
      description: 'Pitch only',
      city: 'Vienna',
      country: 'Austria',
      address: 'Address',
      registrationOpensAt: '2026-03-20T12:00:00.000Z',
      registrationClosesAt: '2026-03-23T12:00:00.000Z',
      submissionOpensAt: '2026-03-23T12:00:00.000Z',
      submissionClosesAt: '2026-03-25T12:00:00.000Z',
      state: 'pitch',
      blindReviewCount: 0,
      pitchReviewEnabled: true,
      blindScoreWeightPercent: 0,
      pitchScoreWeightPercent: 100,
      pitchFinalistSubmissionIdsJson: JSON.stringify(['submission_pitch_1', 'submission_pitch_2']),
      pitchPresentationsCompletedAt: '2026-03-26T12:20:00.000Z',
      maxTeamMembers: 5,
      createdByUserId: 'platform_admin'
    })

    await harness.database.insert(hackathonRoleAssignments).values([
      {
        id: 'role_judge_a',
        hackathonId: 'hackathon_pitch_only',
        userId: 'judge_a',
        role: 'judge',
        isInJudgePool: true,
        createdAt: '2026-03-22T12:00:00.000Z'
      },
      {
        id: 'role_judge_b',
        hackathonId: 'hackathon_pitch_only',
        userId: 'judge_b',
        role: 'judge',
        isInJudgePool: true,
        createdAt: '2026-03-22T12:01:00.000Z'
      }
    ])

    await harness.database.insert(teams).values([
      {
        id: 'team_pitch_1',
        hackathonId: 'hackathon_pitch_only',
        name: 'Alpha Team',
        slug: 'alpha-team',
        isOpenToJoinRequests: false,
        createdByUserId: 'team_admin_one',
        createdAt: '2026-03-22T12:00:00.000Z',
        updatedAt: '2026-03-22T12:00:00.000Z'
      },
      {
        id: 'team_pitch_2',
        hackathonId: 'hackathon_pitch_only',
        name: 'Beta Team',
        slug: 'beta-team',
        isOpenToJoinRequests: false,
        createdByUserId: 'team_admin_two',
        createdAt: '2026-03-22T12:01:00.000Z',
        updatedAt: '2026-03-22T12:01:00.000Z'
      }
    ])

    await harness.database.insert(submissions).values([
      {
        id: 'submission_pitch_1',
        teamId: 'team_pitch_1',
        status: 'locked',
        projectName: 'Project One',
        submittedAt: '2026-03-24T12:00:00.000Z',
        lockedAt: '2026-03-25T12:30:00.000Z',
        createdAt: '2026-03-24T12:00:00.000Z',
        updatedAt: '2026-03-25T12:30:00.000Z'
      },
      {
        id: 'submission_pitch_2',
        teamId: 'team_pitch_2',
        status: 'locked',
        projectName: 'Project Two',
        submittedAt: '2026-03-24T12:05:00.000Z',
        lockedAt: '2026-03-25T12:30:00.000Z',
        createdAt: '2026-03-24T12:05:00.000Z',
        updatedAt: '2026-03-25T12:30:00.000Z'
      }
    ])

    const response = await harness.request('/api/hackathons/hackathon_pitch_only/actions/start-pitch-review', {
      method: 'POST'
    })

    expect(response.status).toBe(200)
    expect(await response.json()).toMatchObject({
      data: {
        id: 'hackathon_pitch_only',
        state: 'pitch_review'
      }
    })

    const updatedHackathon = await harness.database.query.hackathons.findFirst({
      where: eq(hackathons.id, 'hackathon_pitch_only')
    })
    const assignmentRows = await harness.database.select().from(judgeAssignments)
    const auditEntries = await harness.database.select().from(auditLogs)

    expect(updatedHackathon?.state).toBe('pitch_review')
    expect(assignmentRows).toHaveLength(4)
    expect(assignmentRows.every(row => row.reviewStage === 'pitch_review')).toBe(true)
    expect(assignmentRows.every(row => row.blindReviewSlot === null)).toBe(true)
    expect(new Set(assignmentRows.map(row => row.submissionId))).toEqual(new Set(['submission_pitch_1', 'submission_pitch_2']))
    expect(new Set(assignmentRows.map(row => row.judgeUserId))).toEqual(new Set(['judge_a', 'judge_b']))
    expect(auditEntries).toEqual([
      expect.objectContaining({
        actorUserId: 'platform_admin',
        entityType: 'hackathon',
        entityId: 'hackathon_pitch_only',
        action: 'hackathon.start_pitch_review'
      })
    ])
  })

  test('POST /api/hackathons/:hackathonId/actions/start-pitch-review chunks bulk inserts to stay within D1 bind limits', async () => {
    const harness = createApiRouteTestHarness({
      routes: [
        {
          method: 'post',
          path: '/api/hackathons/:hackathonId/actions/start-pitch-review',
          handler: startPitchReviewPostHandler
        }
      ],
      sessionUser: {
        sub: 'auth0|platform_admin',
        email: 'platform-admin@example.com'
      }
    })
    harnesses.push(harness)

    const finalistCount = 12
    const finalistSubmissionIds = Array.from({ length: finalistCount }, (_, index) => `submission_pitch_${index + 1}`)

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
      ...Array.from({ length: finalistCount }, (_, index) => ({
        id: `team_admin_pitch_${index + 1}`,
        auth0Subject: `auth0|team_admin_pitch_${index + 1}`,
        email: `team-admin-pitch-${index + 1}@example.com`,
        displayName: `Pitch Team Admin ${index + 1}`
      }))
    ])

    await harness.database.insert(hackathons).values({
      id: 'hackathon_pitch_review_large',
      name: 'Pitch Review Large Hackathon',
      slug: 'pitch-review-large-hackathon',
      description: 'Pitch review',
      city: 'Vienna',
      country: 'Austria',
      address: 'Address',
      registrationOpensAt: '2026-03-20T12:00:00.000Z',
      registrationClosesAt: '2026-03-23T12:00:00.000Z',
      submissionOpensAt: '2026-03-23T12:00:00.000Z',
      submissionClosesAt: '2026-03-25T12:00:00.000Z',
      state: 'pitch',
      blindReviewCount: 0,
      pitchReviewEnabled: true,
      blindScoreWeightPercent: 0,
      pitchScoreWeightPercent: 100,
      pitchFinalistSubmissionIdsJson: JSON.stringify(finalistSubmissionIds),
      pitchPresentationsCompletedAt: '2026-03-26T12:20:00.000Z',
      maxTeamMembers: 5,
      createdByUserId: 'platform_admin'
    })

    await harness.database.insert(hackathonRoleAssignments).values({
      id: 'role_judge_a',
      hackathonId: 'hackathon_pitch_review_large',
      userId: 'judge_a',
      role: 'judge',
      isInJudgePool: true,
      createdAt: '2026-03-22T12:00:00.000Z'
    })

    await harness.database.insert(teams).values(
      Array.from({ length: finalistCount }, (_, index) => ({
        id: `team_pitch_${index + 1}`,
        hackathonId: 'hackathon_pitch_review_large',
        name: `Pitch Team ${index + 1}`,
        slug: `pitch-team-${index + 1}`,
        isOpenToJoinRequests: false,
        createdByUserId: `team_admin_pitch_${index + 1}`,
        createdAt: `2026-03-22T${String(index).padStart(2, '0')}:00:00.000Z`,
        updatedAt: `2026-03-22T${String(index).padStart(2, '0')}:00:00.000Z`
      }))
    )

    await harness.database.insert(submissions).values(
      Array.from({ length: finalistCount }, (_, index) => ({
        id: finalistSubmissionIds[index]!,
        teamId: `team_pitch_${index + 1}`,
        status: 'locked' as const,
        projectName: `Pitch Project ${index + 1}`,
        submittedAt: `2026-03-24T${String(index).padStart(2, '0')}:00:00.000Z`,
        lockedAt: '2026-03-25T12:30:00.000Z',
        createdAt: `2026-03-24T${String(index).padStart(2, '0')}:00:00.000Z`,
        updatedAt: '2026-03-25T12:30:00.000Z'
      }))
    )

    enforceD1BindParameterLimit(harness)

    const response = await harness.request('/api/hackathons/hackathon_pitch_review_large/actions/start-pitch-review', {
      method: 'POST'
    })

    expect(response.status).toBe(200)
    expect(await response.json()).toMatchObject({
      data: {
        id: 'hackathon_pitch_review_large',
        state: 'pitch_review'
      }
    })

    const updatedHackathon = await harness.database.query.hackathons.findFirst({
      where: eq(hackathons.id, 'hackathon_pitch_review_large')
    })
    const assignmentRows = await harness.database.select().from(judgeAssignments)
    const auditEntries = await harness.database.select().from(auditLogs)

    expect(updatedHackathon?.state).toBe('pitch_review')
    expect(assignmentRows).toHaveLength(finalistCount)
    expect(assignmentRows.every(row => row.reviewStage === 'pitch_review')).toBe(true)
    expect(new Set(assignmentRows.map(row => row.submissionId))).toEqual(new Set(finalistSubmissionIds))
    expect(auditEntries).toEqual([
      expect.objectContaining({
        actorUserId: 'platform_admin',
        entityType: 'hackathon',
        entityId: 'hackathon_pitch_review_large',
        action: 'hackathon.start_pitch_review'
      })
    ])
  })

  test('POST /api/hackathons/:hackathonId/actions/start-pitch-review uses the persisted shortlist finalists for blind-plus-pitch hackathons after pitch starts', async () => {
    const harness = createApiRouteTestHarness({
      routes: [
        {
          method: 'post',
          path: '/api/hackathons/:hackathonId/actions/start-pitch-review',
          handler: startPitchReviewPostHandler
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
      },
      {
        id: 'team_admin_three',
        auth0Subject: 'auth0|team_admin_three',
        email: 'team-admin-three@example.com',
        displayName: 'Team Admin Three'
      }
    ])

    await harness.database.insert(hackathons).values({
      id: 'hackathon_blind_pitch',
      name: 'Blind Plus Pitch Hackathon',
      slug: 'blind-plus-pitch-hackathon',
      description: 'Blind plus pitch',
      city: 'Vienna',
      country: 'Austria',
      address: 'Address',
      registrationOpensAt: '2026-03-20T12:00:00.000Z',
      registrationClosesAt: '2026-03-23T12:00:00.000Z',
      submissionOpensAt: '2026-03-23T12:00:00.000Z',
      submissionClosesAt: '2026-03-25T12:00:00.000Z',
      state: 'pitch',
      blindReviewCount: 1,
      pitchReviewEnabled: true,
      blindScoreWeightPercent: 70,
      pitchScoreWeightPercent: 30,
      pitchFinalistSubmissionIdsJson: JSON.stringify(['submission_pitch_finalist_2', 'submission_pitch_finalist_1']),
      pitchPresentationsCompletedAt: '2026-03-26T12:20:00.000Z',
      maxTeamMembers: 5,
      createdByUserId: 'platform_admin'
    })

    await harness.database.insert(hackathonRoleAssignments).values([
      {
        id: 'role_judge_a',
        hackathonId: 'hackathon_blind_pitch',
        userId: 'judge_a',
        role: 'judge',
        isInJudgePool: true,
        createdAt: '2026-03-22T12:00:00.000Z'
      },
      {
        id: 'role_judge_b',
        hackathonId: 'hackathon_blind_pitch',
        userId: 'judge_b',
        role: 'judge',
        isInJudgePool: true,
        createdAt: '2026-03-22T12:01:00.000Z'
      }
    ])

    await harness.database.insert(teams).values([
      {
        id: 'team_pitch_finalist_1',
        hackathonId: 'hackathon_blind_pitch',
        name: 'Alpha Team',
        slug: 'alpha-team',
        isOpenToJoinRequests: false,
        createdByUserId: 'team_admin_one',
        createdAt: '2026-03-22T12:00:00.000Z',
        updatedAt: '2026-03-22T12:00:00.000Z'
      },
      {
        id: 'team_pitch_finalist_2',
        hackathonId: 'hackathon_blind_pitch',
        name: 'Beta Team',
        slug: 'beta-team',
        isOpenToJoinRequests: false,
        createdByUserId: 'team_admin_two',
        createdAt: '2026-03-22T12:01:00.000Z',
        updatedAt: '2026-03-22T12:01:00.000Z'
      },
      {
        id: 'team_pitch_non_finalist',
        hackathonId: 'hackathon_blind_pitch',
        name: 'Gamma Team',
        slug: 'gamma-team',
        isOpenToJoinRequests: false,
        createdByUserId: 'team_admin_three',
        createdAt: '2026-03-22T12:02:00.000Z',
        updatedAt: '2026-03-22T12:02:00.000Z'
      }
    ])

    await harness.database.insert(submissions).values([
      {
        id: 'submission_pitch_finalist_1',
        teamId: 'team_pitch_finalist_1',
        status: 'locked',
        projectName: 'Project One',
        submittedAt: '2026-03-24T12:00:00.000Z',
        lockedAt: '2026-03-25T12:30:00.000Z',
        createdAt: '2026-03-24T12:00:00.000Z',
        updatedAt: '2026-03-25T12:30:00.000Z'
      },
      {
        id: 'submission_pitch_finalist_2',
        teamId: 'team_pitch_finalist_2',
        status: 'locked',
        projectName: 'Project Two',
        submittedAt: '2026-03-24T12:05:00.000Z',
        lockedAt: '2026-03-25T12:30:00.000Z',
        createdAt: '2026-03-24T12:05:00.000Z',
        updatedAt: '2026-03-25T12:30:00.000Z'
      },
      {
        id: 'submission_pitch_non_finalist',
        teamId: 'team_pitch_non_finalist',
        status: 'locked',
        projectName: 'Project Three',
        submittedAt: '2026-03-24T12:10:00.000Z',
        lockedAt: '2026-03-25T12:30:00.000Z',
        createdAt: '2026-03-24T12:10:00.000Z',
        updatedAt: '2026-03-25T12:30:00.000Z'
      }
    ])

    const response = await harness.request('/api/hackathons/hackathon_blind_pitch/actions/start-pitch-review', {
      method: 'POST'
    })

    expect(response.status).toBe(200)
    expect(await response.json()).toMatchObject({
      data: {
        id: 'hackathon_blind_pitch',
        state: 'pitch_review'
      }
    })

    const assignmentRows = await harness.database.select().from(judgeAssignments)

    expect(assignmentRows).toHaveLength(4)
    expect(new Set(assignmentRows.map(row => row.submissionId))).toEqual(
      new Set(['submission_pitch_finalist_1', 'submission_pitch_finalist_2'])
    )
    expect(assignmentRows.some(row => row.submissionId === 'submission_pitch_non_finalist')).toBe(false)
    expect(assignmentRows.every(row => row.reviewStage === 'pitch_review')).toBe(true)
  })
})
