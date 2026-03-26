import { afterEach, describe, expect, test, vi } from 'vitest'

import { and, eq } from 'drizzle-orm'

import applicationsListHandler from '../../../../server/api/hackathons/[hackathonId]/applications/index.get'
import applicationsPostHandler from '../../../../server/api/hackathons/[hackathonId]/applications/index.post'
import ownApplicationHandler from '../../../../server/api/hackathons/[hackathonId]/applications/me.get'
import approveApplicationHandler from '../../../../server/api/hackathons/[hackathonId]/applications/[applicationId]/actions/approve.post'
import rejectApplicationHandler from '../../../../server/api/hackathons/[hackathonId]/applications/[applicationId]/actions/reject.post'
import {
  auditLogs,
  hackathonRoleAssignments,
  hackathonTermsDocuments,
  hackathons,
  userApplications,
  users
} from '../../../../server/database/schema'
import { createApiRouteTestHarness } from '../../../support/backend/api-route'

async function seedApplicationContext(
  harness: ReturnType<typeof createApiRouteTestHarness>,
  options?: {
    requireGithubProfile?: boolean
    requireChatgptEmail?: boolean
    requireOpenaiOrgId?: boolean
    requireLumaProfile?: boolean
  }
) {
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
      id: 'regular_user',
      auth0Subject: 'auth0|regular_user',
      email: 'regular@example.com',
      displayName: 'Regular User',
      xProfileUrl: 'https://x.example/regular',
      githubProfileUrl: 'https://github.com/regular',
      chatgptEmail: 'regular@chatgpt.example',
      openaiOrgId: 'org_regular'
    },
    {
      id: 'missing_profile_user',
      auth0Subject: 'auth0|missing_profile',
      email: 'missing-profile@example.com',
      displayName: 'Missing Profile User'
    }
  ])

  await harness.database.insert(hackathons).values({
    id: 'hackathon_1',
    name: 'Fixture Hackathon',
    slug: 'fixture-hackathon',
    description: 'Fixture hackathon',
    city: 'Vienna',
    address: 'Fixture Address',
    registrationOpensAt: '2026-03-20T12:00:00.000Z',
    registrationClosesAt: '2026-03-23T12:00:00.000Z',
    submissionOpensAt: '2026-03-23T12:00:00.000Z',
    submissionClosesAt: '2026-03-25T12:00:00.000Z',
    state: 'registration_open',
    maxTeamMembers: 5,
    requireGithubProfile: options?.requireGithubProfile ?? false,
    requireChatgptEmail: options?.requireChatgptEmail ?? false,
    requireOpenaiOrgId: options?.requireOpenaiOrgId ?? false,
    requireLumaProfile: options?.requireLumaProfile ?? false,
    currentApplicationTermsDocumentId: null,
    currentWinnerTermsDocumentId: null,
    createdByUserId: 'platform_admin'
  })

  await harness.database.insert(hackathonRoleAssignments).values({
    id: 'role_hackathon_admin',
    hackathonId: 'hackathon_1',
    userId: 'hackathon_admin',
    role: 'hackathon_admin',
    isInJudgePool: false,
    createdAt: '2026-03-22T12:00:00.000Z'
  })

  await harness.database.insert(hackathonTermsDocuments).values([
    {
      id: 'terms_app_1',
      hackathonId: 'hackathon_1',
      documentType: 'application_terms',
      version: 1,
      title: 'Application Terms v1',
      content: 'Application terms one',
      publishedAt: '2026-03-01T00:00:00.000Z'
    },
    {
      id: 'terms_app_2',
      hackathonId: 'hackathon_1',
      documentType: 'application_terms',
      version: 2,
      title: 'Application Terms v2',
      content: 'Application terms two',
      publishedAt: '2026-03-02T00:00:00.000Z'
    }
  ])

  await harness.database
    .update(hackathons)
    .set({
      currentApplicationTermsDocumentId: 'terms_app_2'
    })
    .where(eq(hackathons.id, 'hackathon_1'))
}

describe('TASK-3.6 application routes', () => {
  const harnesses: Array<ReturnType<typeof createApiRouteTestHarness>> = []

  afterEach(async () => {
    vi.unstubAllGlobals()

    while (harnesses.length > 0) {
      await harnesses.pop()?.d1Database.close()
    }
  })

  test('POST /api/hackathons/:hackathonId/applications enforces current terms and records the submission', async () => {
    const harness = createApiRouteTestHarness({
      routes: [
        { method: 'post', path: '/api/hackathons/:hackathonId/applications', handler: applicationsPostHandler }
      ],
      sessionUser: {
        sub: 'auth0|regular_user',
        email: 'regular@example.com'
      }
    })
    harnesses.push(harness)
    await seedApplicationContext(harness)

    const outdatedResponse = await harness.request('/api/hackathons/hackathon_1/applications', {
      method: 'POST',
      body: JSON.stringify({
        applicationTermsDocumentId: 'terms_app_1'
      })
    })

    expect(outdatedResponse.status).toBe(409)
    expect(await outdatedResponse.json()).toMatchObject({
      error: {
        code: 'application_terms_document_outdated'
      }
    })

    const successResponse = await harness.request('/api/hackathons/hackathon_1/applications', {
      method: 'POST',
      body: JSON.stringify({
        applicationTermsDocumentId: 'terms_app_2'
      })
    })

    expect(successResponse.status).toBe(200)
    expect(await successResponse.json()).toMatchObject({
      data: {
        userId: 'regular_user',
        status: 'submitted',
        applicationTermsDocumentId: 'terms_app_2'
      }
    })

    const storedApplication = await harness.database.query.userApplications.findFirst({
      where: and(
        eq(userApplications.hackathonId, 'hackathon_1'),
        eq(userApplications.userId, 'regular_user')
      )
    })

    expect(storedApplication).toMatchObject({
      status: 'submitted',
      applicationTermsDocumentId: 'terms_app_2'
    })
  })

  test('POST /api/hackathons/:hackathonId/applications rejects users missing required profile fields', async () => {
    const harness = createApiRouteTestHarness({
      routes: [
        { method: 'post', path: '/api/hackathons/:hackathonId/applications', handler: applicationsPostHandler }
      ],
      sessionUser: {
        sub: 'auth0|missing_profile',
        email: 'missing-profile@example.com'
      }
    })
    harnesses.push(harness)
    await seedApplicationContext(harness, {
      requireGithubProfile: true
    })

    const response = await harness.request('/api/hackathons/hackathon_1/applications', {
      method: 'POST',
      body: JSON.stringify({
        applicationTermsDocumentId: 'terms_app_2'
      })
    })

    expect(response.status).toBe(409)
    expect(await response.json()).toMatchObject({
      error: {
        code: 'required_profile_fields_missing',
        details: {
          missingFields: ['githubProfileUrl']
        }
      }
    })
  })

  test('POST /api/hackathons/:hackathonId/applications rejects users with incomplete onboarding', async () => {
    const harness = createApiRouteTestHarness({
      routes: [
        { method: 'post', path: '/api/hackathons/:hackathonId/applications', handler: applicationsPostHandler }
      ],
      sessionUser: {
        sub: 'auth0|regular_user',
        email: 'regular@example.com'
      }
    })
    harnesses.push(harness)
    await seedApplicationContext(harness)

    await harness.database
      .update(users)
      .set({
        onboardingState: 'profile_pending'
      })
      .where(eq(users.id, 'regular_user'))

    const response = await harness.request('/api/hackathons/hackathon_1/applications', {
      method: 'POST',
      body: JSON.stringify({
        applicationTermsDocumentId: 'terms_app_2'
      })
    })

    expect(response.status).toBe(403)
    expect(await response.json()).toMatchObject({
      error: {
        code: 'platform_onboarding_incomplete',
        details: {
          onboardingState: 'profile_pending',
          userId: 'regular_user'
        }
      }
    })
  })

  test('POST /api/hackathons/:hackathonId/applications rejects users missing a required luma username', async () => {
    const harness = createApiRouteTestHarness({
      routes: [
        { method: 'post', path: '/api/hackathons/:hackathonId/applications', handler: applicationsPostHandler }
      ],
      sessionUser: {
        sub: 'auth0|missing_profile',
        email: 'missing-profile@example.com'
      }
    })
    harnesses.push(harness)
    await seedApplicationContext(harness, {
      requireLumaProfile: true
    })

    const response = await harness.request('/api/hackathons/hackathon_1/applications', {
      method: 'POST',
      body: JSON.stringify({
        applicationTermsDocumentId: 'terms_app_2'
      })
    })

    expect(response.status).toBe(409)
    expect(await response.json()).toMatchObject({
      error: {
        code: 'required_profile_fields_missing',
        details: {
          missingFields: ['lumaUsername']
        }
      }
    })
  })

  test('POST /api/hackathons/:hackathonId/applications rejects users missing a required ChatGPT email and OpenAI org ID', async () => {
    const harness = createApiRouteTestHarness({
      routes: [
        { method: 'post', path: '/api/hackathons/:hackathonId/applications', handler: applicationsPostHandler }
      ],
      sessionUser: {
        sub: 'auth0|missing_profile',
        email: 'missing-profile@example.com'
      }
    })
    harnesses.push(harness)
    await seedApplicationContext(harness, {
      requireChatgptEmail: true,
      requireOpenaiOrgId: true
    })

    const response = await harness.request('/api/hackathons/hackathon_1/applications', {
      method: 'POST',
      body: JSON.stringify({
        applicationTermsDocumentId: 'terms_app_2'
      })
    })

    expect(response.status).toBe(409)
    expect(await response.json()).toMatchObject({
      error: {
        code: 'required_profile_fields_missing',
        details: {
          missingFields: ['chatgptEmail', 'openaiOrgId']
        }
      }
    })
  })

  test('GET /api/hackathons/:hackathonId/applications/me returns the caller application or null', async () => {
    const harness = createApiRouteTestHarness({
      routes: [
        { method: 'get', path: '/api/hackathons/:hackathonId/applications/me', handler: ownApplicationHandler }
      ],
      sessionUser: {
        sub: 'auth0|regular_user',
        email: 'regular@example.com'
      }
    })
    harnesses.push(harness)
    await seedApplicationContext(harness)

    const emptyResponse = await harness.request('/api/hackathons/hackathon_1/applications/me')
    expect(emptyResponse.status).toBe(200)
    expect(await emptyResponse.json()).toMatchObject({
      data: null
    })

    await harness.database.insert(userApplications).values({
      id: 'application_1',
      hackathonId: 'hackathon_1',
      userId: 'regular_user',
      status: 'submitted',
      submittedAt: '2026-03-22T12:10:00.000Z',
      applicationTermsDocumentId: 'terms_app_2',
      applicationTermsAcceptedAt: '2026-03-22T12:10:00.000Z',
      createdAt: '2026-03-22T12:10:00.000Z',
      updatedAt: '2026-03-22T12:10:00.000Z'
    })

    const response = await harness.request('/api/hackathons/hackathon_1/applications/me')
    expect(response.status).toBe(200)
    expect(await response.json()).toMatchObject({
      data: {
        id: 'application_1',
        userId: 'regular_user',
        applicationTermsDocument: {
          id: 'terms_app_2'
        }
      }
    })
  })

  test('admin application routes list and approve submitted applications with audit logging', async () => {
    const harness = createApiRouteTestHarness({
      routes: [
        { method: 'get', path: '/api/hackathons/:hackathonId/applications', handler: applicationsListHandler },
        {
          method: 'post',
          path: '/api/hackathons/:hackathonId/applications/:applicationId/actions/approve',
          handler: approveApplicationHandler
        }
      ],
      sessionUser: {
        sub: 'auth0|hackathon_admin',
        email: 'hackathon-admin@example.com'
      }
    })
    harnesses.push(harness)
    await seedApplicationContext(harness)

    await harness.database.insert(userApplications).values({
      id: 'application_1',
      hackathonId: 'hackathon_1',
      userId: 'regular_user',
      status: 'submitted',
      submittedAt: '2026-03-22T12:10:00.000Z',
      applicationTermsDocumentId: 'terms_app_2',
      applicationTermsAcceptedAt: '2026-03-22T12:10:00.000Z',
      createdAt: '2026-03-22T12:10:00.000Z',
      updatedAt: '2026-03-22T12:10:00.000Z'
    })

    const listResponse = await harness.request('/api/hackathons/hackathon_1/applications')
    expect(listResponse.status).toBe(200)
    const listPayload = await listResponse.json()
    expect(listPayload.meta).toMatchObject({
      total: 1
    })
    expect(listPayload.data).toEqual(expect.arrayContaining([
      expect.objectContaining({
        id: 'application_1',
        user: expect.objectContaining({
          id: 'regular_user'
        })
      })
    ]))

    const approveResponse = await harness.request('/api/hackathons/hackathon_1/applications/application_1/actions/approve', {
      method: 'POST'
    })
    expect(approveResponse.status).toBe(200)
    expect(await approveResponse.json()).toMatchObject({
      data: {
        id: 'application_1',
        status: 'approved',
        reviewedByUserId: 'hackathon_admin'
      }
    })

    const auditRows = await harness.database.select().from(auditLogs)
    expect(auditRows).toEqual(expect.arrayContaining([
      expect.objectContaining({
        entityType: 'user_application',
        entityId: 'application_1',
        action: 'user_application.approved'
      })
    ]))
  })

  test('admin application routes reject submitted applications', async () => {
    const harness = createApiRouteTestHarness({
      routes: [
        {
          method: 'post',
          path: '/api/hackathons/:hackathonId/applications/:applicationId/actions/reject',
          handler: rejectApplicationHandler
        }
      ],
      sessionUser: {
        sub: 'auth0|platform_admin',
        email: 'platform-admin@example.com'
      }
    })
    harnesses.push(harness)
    await seedApplicationContext(harness)

    await harness.database.insert(userApplications).values({
      id: 'application_1',
      hackathonId: 'hackathon_1',
      userId: 'regular_user',
      status: 'submitted',
      submittedAt: '2026-03-22T12:10:00.000Z',
      applicationTermsDocumentId: 'terms_app_2',
      applicationTermsAcceptedAt: '2026-03-22T12:10:00.000Z',
      createdAt: '2026-03-22T12:10:00.000Z',
      updatedAt: '2026-03-22T12:10:00.000Z'
    })

    const response = await harness.request('/api/hackathons/hackathon_1/applications/application_1/actions/reject', {
      method: 'POST'
    })

    expect(response.status).toBe(200)
    expect(await response.json()).toMatchObject({
      data: {
        id: 'application_1',
        status: 'rejected',
        reviewedByUserId: 'platform_admin'
      }
    })
  })
})
