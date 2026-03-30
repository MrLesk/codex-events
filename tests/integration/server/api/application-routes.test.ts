import { afterEach, describe, expect, test, vi } from 'vitest'

import { and, eq } from 'drizzle-orm'

import applicationsListHandler from '../../../../server/api/hackathons/[hackathonId]/applications/index.get'
import applicationsPostHandler from '../../../../server/api/hackathons/[hackathonId]/applications/index.post'
import ownApplicationHandler from '../../../../server/api/hackathons/[hackathonId]/applications/me.get'
import approveApplicationHandler from '../../../../server/api/hackathons/[hackathonId]/applications/[applicationId]/actions/approve.post'
import applyStagedDecisionsHandler from '../../../../server/api/hackathons/[hackathonId]/applications/actions/apply-staged-decisions.post'
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

const fixtureRegistrationOpensAt = '2020-03-20T12:00:00.000Z'
const fixtureRegistrationClosesAt = '2099-03-23T12:00:00.000Z'
const fixtureSubmissionOpensAt = '2099-03-23T12:00:00.000Z'
const fixtureSubmissionClosesAt = '2099-03-25T12:00:00.000Z'

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

async function seedApplicationContext(
  harness: ReturnType<typeof createApiRouteTestHarness>,
  options?: {
    requireGithubProfile?: boolean
    requireChatgptEmail?: boolean
    requireOpenaiOrgId?: boolean
    requireLumaProfile?: boolean
    requireWhyThisHackathon?: boolean
    requireProofOfExecution?: boolean
    lumaEventUrl?: string | null
    inPersonEvent?: boolean
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
      id: 'staff_user',
      auth0Subject: 'auth0|staff',
      email: 'staff@example.com',
      displayName: 'Staff User'
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
    country: 'Austria',
    address: 'Fixture Address',
    registrationOpensAt: fixtureRegistrationOpensAt,
    registrationClosesAt: fixtureRegistrationClosesAt,
    submissionOpensAt: fixtureSubmissionOpensAt,
    submissionClosesAt: fixtureSubmissionClosesAt,
    state: 'registration_open',
    maxTeamMembers: 5,
    inPersonEvent: options?.inPersonEvent ?? false,
    requireGithubProfile: options?.requireGithubProfile ?? false,
    requireChatgptEmail: options?.requireChatgptEmail ?? false,
    requireOpenaiOrgId: options?.requireOpenaiOrgId ?? false,
    requireLumaProfile: options?.requireLumaProfile ?? false,
    requireWhyThisHackathon: options?.requireWhyThisHackathon ?? false,
    requireProofOfExecution: options?.requireProofOfExecution ?? false,
    lumaEventUrl: options?.lumaEventUrl ?? null,
    currentApplicationTermsDocumentId: null,
    currentWinnerTermsDocumentId: null,
    createdByUserId: 'platform_admin'
  })

  await harness.database.insert(hackathonRoleAssignments).values([
    {
      id: 'role_hackathon_admin',
      hackathonId: 'hackathon_1',
      userId: 'hackathon_admin',
      role: 'hackathon_admin',
      isInJudgePool: false,
      isStaff: false,
      createdAt: '2026-03-22T12:00:00.000Z'
    },
    {
      id: 'role_staff',
      hackathonId: 'hackathon_1',
      userId: 'staff_user',
      role: 'staff',
      isInJudgePool: false,
      isStaff: true,
      createdAt: '2026-03-22T12:01:00.000Z'
    }
  ])

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
        applicationTermsDocumentId: 'terms_app_2',
        registrationTeamIntent: 'team',
        registrationTeamMembers: [
          {
            fullName: 'Ada Lovelace',
            email: 'ada@example.com'
          },
          {
            fullName: 'Grace Hopper',
            email: null
          }
        ],
        whyThisHackathon: 'I want to build a practical project with other builders.',
        proofOfExecutionUrl: 'https://github.com/regular/previous-project, https://demo.example.com/regular/project'
      })
    })

    expect(successResponse.status).toBe(200)
    expect(await successResponse.json()).toMatchObject({
      data: {
        userId: 'regular_user',
        status: 'submitted',
        preApprovalStatus: null,
        applicationTermsDocumentId: 'terms_app_2',
        registrationDetailsJson: expect.any(String)
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
      applicationTermsDocumentId: 'terms_app_2',
      registrationDetailsJson: JSON.stringify({
        teamIntent: 'team',
        teamMembers: [
          {
            fullName: 'Ada Lovelace',
            email: 'ada@example.com'
          },
          {
            fullName: 'Grace Hopper'
          }
        ],
        inPersonAttendanceCommitment: false,
        whyThisHackathon: 'I want to build a practical project with other builders.',
        proofOfExecutionUrl: 'https://github.com/regular/previous-project, https://demo.example.com/regular/project'
      })
    })
  })

  test('POST /api/hackathons/:hackathonId/applications requires in-person attendance commitment when configured', async () => {
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
    await seedApplicationContext(harness, {
      inPersonEvent: true
    })

    const missingCommitmentResponse = await harness.request('/api/hackathons/hackathon_1/applications', {
      method: 'POST',
      body: JSON.stringify({
        applicationTermsDocumentId: 'terms_app_2'
      })
    })

    expect(missingCommitmentResponse.status).toBe(409)
    expect(await missingCommitmentResponse.json()).toMatchObject({
      error: {
        code: 'in_person_attendance_commitment_required'
      }
    })

    const committedResponse = await harness.request('/api/hackathons/hackathon_1/applications', {
      method: 'POST',
      body: JSON.stringify({
        applicationTermsDocumentId: 'terms_app_2',
        inPersonAttendanceCommitment: true
      })
    })

    expect(committedResponse.status).toBe(200)

    const storedApplication = await harness.database.query.userApplications.findFirst({
      where: and(
        eq(userApplications.hackathonId, 'hackathon_1'),
        eq(userApplications.userId, 'regular_user')
      )
    })

    expect(storedApplication?.registrationDetailsJson).toBe(JSON.stringify({
      teamIntent: 'unknown',
      teamMembers: [],
      inPersonAttendanceCommitment: true,
      whyThisHackathon: '',
      proofOfExecutionUrl: ''
    }))
  })

  test('POST /api/hackathons/:hackathonId/applications enforces why-this-hackathon and proof-of-execution requirements when configured', async () => {
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
    await seedApplicationContext(harness, {
      requireWhyThisHackathon: true,
      requireProofOfExecution: true
    })

    const missingResponse = await harness.request('/api/hackathons/hackathon_1/applications', {
      method: 'POST',
      body: JSON.stringify({
        applicationTermsDocumentId: 'terms_app_2'
      })
    })

    expect(missingResponse.status).toBe(409)
    expect(await missingResponse.json()).toMatchObject({
      error: {
        code: 'why_this_hackathon_required'
      }
    })

    const missingProofResponse = await harness.request('/api/hackathons/hackathon_1/applications', {
      method: 'POST',
      body: JSON.stringify({
        applicationTermsDocumentId: 'terms_app_2',
        whyThisHackathon: 'I want to collaborate and build.'
      })
    })

    expect(missingProofResponse.status).toBe(409)
    expect(await missingProofResponse.json()).toMatchObject({
      error: {
        code: 'proof_of_execution_required'
      }
    })

    const successResponse = await harness.request('/api/hackathons/hackathon_1/applications', {
      method: 'POST',
      body: JSON.stringify({
        applicationTermsDocumentId: 'terms_app_2',
        whyThisHackathon: 'I want to collaborate and build.',
        proofOfExecutionUrl: 'https://github.com/regular/shipped-work, https://demo.example.com/regular/work'
      })
    })

    expect(successResponse.status).toBe(200)

    const storedApplication = await harness.database.query.userApplications.findFirst({
      where: and(
        eq(userApplications.hackathonId, 'hackathon_1'),
        eq(userApplications.userId, 'regular_user')
      )
    })

    expect(storedApplication?.registrationDetailsJson).toBe(JSON.stringify({
      teamIntent: 'unknown',
      teamMembers: [],
      inPersonAttendanceCommitment: false,
      whyThisHackathon: 'I want to collaborate and build.',
      proofOfExecutionUrl: 'https://github.com/regular/shipped-work, https://demo.example.com/regular/work'
    }))
  })

  test('POST /api/hackathons/:hackathonId/applications rejects invalid proof-of-execution links', async () => {
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

    const response = await harness.request('/api/hackathons/hackathon_1/applications', {
      method: 'POST',
      body: JSON.stringify({
        applicationTermsDocumentId: 'terms_app_2',
        proofOfExecutionUrl: 'https://github.com/regular/work, ftp://example.com/work'
      })
    })

    expect(response.status).toBe(409)
    expect(await response.json()).toMatchObject({
      error: {
        code: 'proof_of_execution_url_invalid'
      }
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

  test('POST /api/hackathons/:hackathonId/applications rejects registration team-member hints beyond max team members', async () => {
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

    const response = await harness.request('/api/hackathons/hackathon_1/applications', {
      method: 'POST',
      body: JSON.stringify({
        applicationTermsDocumentId: 'terms_app_2',
        registrationTeamIntent: 'team',
        registrationTeamMembers: Array.from({ length: 6 }, (_, index) => ({
          fullName: `Member ${index + 1}`,
          email: null
        }))
      })
    })

    expect(response.status).toBe(409)
    expect(await response.json()).toMatchObject({
      error: {
        code: 'registration_team_members_invalid'
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
      requireLumaProfile: true,
      lumaEventUrl: 'https://luma.com/codex'
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

  test('POST /api/hackathons/:hackathonId/applications does not require luma username when no luma event URL is configured', async () => {
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
      requireLumaProfile: true,
      lumaEventUrl: null
    })

    const response = await harness.request('/api/hackathons/hackathon_1/applications', {
      method: 'POST',
      body: JSON.stringify({
        applicationTermsDocumentId: 'terms_app_2'
      })
    })

    expect(response.status).toBe(200)
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

  test('admin application routes list, stage decisions, and apply them with audit logging', async () => {
    const queueProducer = createQueueProducerStub()
    const harness = createApiRouteTestHarness({
      routes: [
        { method: 'get', path: '/api/hackathons/:hackathonId/applications', handler: applicationsListHandler },
        {
          method: 'post',
          path: '/api/hackathons/:hackathonId/applications/:applicationId/actions/approve',
          handler: approveApplicationHandler
        },
        {
          method: 'post',
          path: '/api/hackathons/:hackathonId/applications/actions/apply-staged-decisions',
          handler: applyStagedDecisionsHandler
        }
      ],
      sessionUser: {
        sub: 'auth0|hackathon_admin',
        email: 'hackathon-admin@example.com'
      },
      cloudflareEnv: {
        APPLICATION_REVIEW_EMAIL_QUEUE: queueProducer
      },
      runtimeConfig: {
        applicationReviewEmails: {
          queueBinding: 'APPLICATION_REVIEW_EMAIL_QUEUE'
        }
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
        status: 'submitted',
        preApprovalStatus: 'approved',
        reviewedByUserId: null
      }
    })
    expect(queueProducer.send).toHaveBeenCalledTimes(0)

    const applyResponse = await harness.request('/api/hackathons/hackathon_1/applications/actions/apply-staged-decisions', {
      method: 'POST'
    })
    expect(applyResponse.status).toBe(200)
    expect(await applyResponse.json()).toMatchObject({
      data: {
        appliedCount: 1,
        approvedCount: 1,
        rejectedCount: 0
      }
    })

    const auditRows = await harness.database.select().from(auditLogs)
    expect(auditRows).toEqual(expect.arrayContaining([
      expect.objectContaining({
        entityType: 'user_application',
        entityId: 'application_1',
        action: 'user_application.review_decision_staged'
      }),
      expect.objectContaining({
        entityType: 'user_application',
        entityId: 'application_1',
        action: 'user_application.approved'
      }),
      expect.objectContaining({
        entityType: 'user_application',
        entityId: 'application_1',
        action: 'user_application.review_email_enqueued',
        metadata: expect.objectContaining({
          decision: 'approved',
          enqueue: expect.objectContaining({
            status: 'enqueued'
          })
        })
      })
    ]))

    expect(queueProducer.send).toHaveBeenCalledTimes(1)
    expect(queueProducer.send).toHaveBeenCalledWith(expect.objectContaining({
      applicationId: 'application_1',
      decision: 'approved',
      recipientEmail: 'regular@example.com',
      hackathonName: 'Fixture Hackathon',
      hackathonSlug: 'fixture-hackathon'
    }), {
      contentType: 'json'
    })
  })

  test('staff can list applications but cannot stage review decisions', async () => {
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
        sub: 'auth0|staff',
        email: 'staff@example.com'
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
    expect(await listResponse.json()).toMatchObject({
      data: [
        expect.objectContaining({
          id: 'application_1',
          user: expect.objectContaining({
            id: 'regular_user'
          })
        })
      ],
      meta: {
        total: 1
      }
    })

    const approveResponse = await harness.request('/api/hackathons/hackathon_1/applications/application_1/actions/approve', {
      method: 'POST'
    })
    expect(approveResponse.status).toBe(403)
    expect(await approveResponse.json()).toMatchObject({
      error: {
        code: 'hackathon_admin_required'
      }
    })
  })

  test('staging approval toggles off when the same submitted application is approved again', async () => {
    const harness = createApiRouteTestHarness({
      routes: [
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

    const firstResponse = await harness.request('/api/hackathons/hackathon_1/applications/application_1/actions/approve', {
      method: 'POST'
    })
    expect(firstResponse.status).toBe(200)
    expect(await firstResponse.json()).toMatchObject({
      data: {
        id: 'application_1',
        preApprovalStatus: 'approved'
      }
    })

    const secondResponse = await harness.request('/api/hackathons/hackathon_1/applications/application_1/actions/approve', {
      method: 'POST'
    })
    expect(secondResponse.status).toBe(200)
    expect(await secondResponse.json()).toMatchObject({
      data: {
        id: 'application_1',
        preApprovalStatus: null
      }
    })

    const auditRows = await harness.database.select().from(auditLogs)
    expect(auditRows).toEqual(expect.arrayContaining([
      expect.objectContaining({
        entityType: 'user_application',
        entityId: 'application_1',
        action: 'user_application.review_decision_staged',
        metadata: expect.objectContaining({
          decision: 'approved',
          previousDecision: null
        })
      }),
      expect.objectContaining({
        entityType: 'user_application',
        entityId: 'application_1',
        action: 'user_application.review_decision_cleared',
        metadata: expect.objectContaining({
          decision: null,
          previousDecision: 'approved'
        })
      })
    ]))
  })

  test('admin can stage rejection and apply it in batch', async () => {
    const queueProducer = createQueueProducerStub()
    const harness = createApiRouteTestHarness({
      routes: [
        {
          method: 'post',
          path: '/api/hackathons/:hackathonId/applications/:applicationId/actions/reject',
          handler: rejectApplicationHandler
        },
        {
          method: 'post',
          path: '/api/hackathons/:hackathonId/applications/actions/apply-staged-decisions',
          handler: applyStagedDecisionsHandler
        }
      ],
      sessionUser: {
        sub: 'auth0|platform_admin',
        email: 'platform-admin@example.com'
      },
      cloudflareEnv: {
        APPLICATION_REVIEW_EMAIL_QUEUE: queueProducer
      },
      runtimeConfig: {
        applicationReviewEmails: {
          queueBinding: 'APPLICATION_REVIEW_EMAIL_QUEUE'
        }
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
        status: 'submitted',
        preApprovalStatus: 'rejected',
        reviewedByUserId: null
      }
    })
    expect(queueProducer.send).toHaveBeenCalledTimes(0)

    const applyResponse = await harness.request('/api/hackathons/hackathon_1/applications/actions/apply-staged-decisions', {
      method: 'POST'
    })
    expect(applyResponse.status).toBe(200)
    expect(await applyResponse.json()).toMatchObject({
      data: {
        appliedCount: 1,
        approvedCount: 0,
        rejectedCount: 1
      }
    })

    expect(queueProducer.send).toHaveBeenCalledTimes(1)
    expect(queueProducer.send).toHaveBeenCalledWith(expect.objectContaining({
      applicationId: 'application_1',
      decision: 'rejected',
      recipientEmail: 'regular@example.com'
    }), {
      contentType: 'json'
    })
  })

  test('staging rejection toggles off when the same submitted application is rejected again', async () => {
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

    const firstResponse = await harness.request('/api/hackathons/hackathon_1/applications/application_1/actions/reject', {
      method: 'POST'
    })
    expect(firstResponse.status).toBe(200)
    expect(await firstResponse.json()).toMatchObject({
      data: {
        id: 'application_1',
        preApprovalStatus: 'rejected'
      }
    })

    const secondResponse = await harness.request('/api/hackathons/hackathon_1/applications/application_1/actions/reject', {
      method: 'POST'
    })
    expect(secondResponse.status).toBe(200)
    expect(await secondResponse.json()).toMatchObject({
      data: {
        id: 'application_1',
        preApprovalStatus: null
      }
    })

    const auditRows = await harness.database.select().from(auditLogs)
    expect(auditRows).toEqual(expect.arrayContaining([
      expect.objectContaining({
        entityType: 'user_application',
        entityId: 'application_1',
        action: 'user_application.review_decision_staged',
        metadata: expect.objectContaining({
          decision: 'rejected',
          previousDecision: null
        })
      }),
      expect.objectContaining({
        entityType: 'user_application',
        entityId: 'application_1',
        action: 'user_application.review_decision_cleared',
        metadata: expect.objectContaining({
          decision: null,
          previousDecision: 'rejected'
        })
      })
    ]))
  })

  test('applying staged decisions remains successful when queue enqueue fails', async () => {
    const queueProducer = createQueueProducerStub({ failSend: true })
    const harness = createApiRouteTestHarness({
      routes: [
        {
          method: 'post',
          path: '/api/hackathons/:hackathonId/applications/:applicationId/actions/reject',
          handler: rejectApplicationHandler
        },
        {
          method: 'post',
          path: '/api/hackathons/:hackathonId/applications/actions/apply-staged-decisions',
          handler: applyStagedDecisionsHandler
        }
      ],
      sessionUser: {
        sub: 'auth0|platform_admin',
        email: 'platform-admin@example.com'
      },
      cloudflareEnv: {
        APPLICATION_REVIEW_EMAIL_QUEUE: queueProducer
      },
      runtimeConfig: {
        applicationReviewEmails: {
          queueBinding: 'APPLICATION_REVIEW_EMAIL_QUEUE'
        }
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
    expect(queueProducer.send).toHaveBeenCalledTimes(0)

    const applyResponse = await harness.request('/api/hackathons/hackathon_1/applications/actions/apply-staged-decisions', {
      method: 'POST'
    })
    expect(applyResponse.status).toBe(200)
    expect(queueProducer.send).toHaveBeenCalledTimes(1)

    const auditRows = await harness.database.select().from(auditLogs)
    expect(auditRows).toEqual(expect.arrayContaining([
      expect.objectContaining({
        entityType: 'user_application',
        entityId: 'application_1',
        action: 'user_application.review_email_enqueued',
        metadata: expect.objectContaining({
          decision: 'rejected',
          enqueue: expect.objectContaining({
            status: 'failed',
            reason: 'queue_send_error'
          })
        })
      })
    ]))
  })

  test('hackathon admins can stage rejection for submitted applications', async () => {
    const harness = createApiRouteTestHarness({
      routes: [
        {
          method: 'post',
          path: '/api/hackathons/:hackathonId/applications/:applicationId/actions/reject',
          handler: rejectApplicationHandler
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

    const response = await harness.request('/api/hackathons/hackathon_1/applications/application_1/actions/reject', {
      method: 'POST'
    })

    expect(response.status).toBe(200)
    expect(await response.json()).toMatchObject({
      data: {
        id: 'application_1',
        status: 'submitted',
        preApprovalStatus: 'rejected',
        reviewedByUserId: null
      }
    })
  })
})
