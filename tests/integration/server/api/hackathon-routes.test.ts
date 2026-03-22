import { afterEach, describe, expect, test, vi } from 'vitest'

import { eq } from 'drizzle-orm'

import hackathonsGetHandler from '../../../../server/api/hackathons/index.get'
import hackathonsPostHandler from '../../../../server/api/hackathons/index.post'
import hackathonDetailGetHandler from '../../../../server/api/hackathons/[hackathonId]/index.get'
import hackathonPatchHandler from '../../../../server/api/hackathons/[hackathonId]/index.patch'
import openSubmissionPostHandler from '../../../../server/api/hackathons/[hackathonId]/actions/open-submission.post'
import {
  auditLogs,
  hackathonRoleAssignments,
  hackathonTermsDocuments,
  hackathons,
  users
} from '../../../../server/database/schema'
import { createApiRouteTestHarness } from '../../../support/backend/api-route'

describe('TASK-3.5 hackathon CRUD routes', () => {
  const harnesses: Array<ReturnType<typeof createApiRouteTestHarness>> = []

  afterEach(() => {
    vi.unstubAllGlobals()

    while (harnesses.length > 0) {
      harnesses.pop()?.d1Database.close()
    }
  })

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
    expect(await response.json()).toMatchObject({
      data: [
        expect.objectContaining({
          id: 'hackathon_public',
          slug: 'public-hackathon'
        })
      ],
      meta: {
        total: 1
      }
    })
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
        city: 'Vienna',
        address: 'Address',
        registrationOpensAt: '2026-03-20T12:00:00.000Z',
        registrationClosesAt: '2026-03-23T12:00:00.000Z',
        submissionOpensAt: '2026-03-23T12:00:00.000Z',
        submissionClosesAt: '2026-03-25T12:00:00.000Z',
        maxTeamMembers: 5,
        requireXProfile: true,
        requireLinkedinProfile: false,
        requireGithubProfile: true
      })
    })

    expect(response.status).toBe(200)
    const payload = await response.json()
    expect(payload).toMatchObject({
      data: {
        name: 'New Hackathon',
        slug: 'new-hackathon',
        state: 'draft',
        createdByUserId: 'platform_admin'
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
        city: 'Berlin',
        maxTeamMembers: 7
      })
    })

    expect(response.status).toBe(200)
    expect(await response.json()).toMatchObject({
      data: {
        id: 'hackathon_patch',
        description: 'Updated description',
        city: 'Berlin',
        maxTeamMembers: 7
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
})
