import { afterEach, describe, expect, test, vi } from 'vitest'

import { and, eq } from 'drizzle-orm'

import applicationsListHandler from '../../../../server/api/events/[eventId]/applications/index.get'
import applicationsPostHandler from '../../../../server/api/events/[eventId]/applications/index.post'
import ownApplicationHandler from '../../../../server/api/events/[eventId]/applications/me.get'
import withdrawOwnApplicationHandler from '../../../../server/api/events/[eventId]/applications/me/actions/withdraw.post'
import approveApplicationHandler from '../../../../server/api/events/[eventId]/applications/[applicationId]/actions/approve.post'
import adminWithdrawApplicationHandler from '../../../../server/api/events/[eventId]/applications/[applicationId]/actions/withdraw.post'
import applyStagedDecisionsHandler from '../../../../server/api/events/[eventId]/applications/actions/apply-staged-decisions.post'
import rejectApplicationHandler from '../../../../server/api/events/[eventId]/applications/[applicationId]/actions/reject.post'
import {
  auditLogs,
  eventRoleAssignments,
  eventTermsDocuments,
  events,
  submissions,
  teamJoinRequests,
  teamMembers,
  teams,
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
    applicationChatgptEmailVisible?: boolean
    requireChatgptEmail?: boolean
    applicationOpenaiOrgIdVisible?: boolean
    requireOpenaiOrgId?: boolean
    applicationLumaEmailVisible?: boolean
    requireLumaEmail?: boolean
    applicationWhyThisEventVisible?: boolean
    requireWhyThisEvent?: boolean
    applicationProofOfExecutionVisible?: boolean
    requireProofOfExecution?: boolean
    applicationTeamIntentVisible?: boolean
    requireTeamIntent?: boolean
    lumaEventUrl?: string | null
    lumaEventApiId?: string | null
    inPersonEvent?: boolean
    autoApproveApplications?: boolean
    currentApplicationTerms?: boolean
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
      id: 'event_admin',
      auth0Subject: 'auth0|event_admin',
      email: 'event-admin@example.com',
      displayName: 'Event Admin'
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
      openaiOrgId: 'org_regular',
      lumaEmail: 'regular@luma.example',
      lumaUsername: 'bpirvu'
    },
    {
      id: 'missing_profile_user',
      auth0Subject: 'auth0|missing_profile',
      email: 'missing-profile@example.com',
      displayName: 'Missing Profile User'
    }
  ])

  await harness.database.insert(events).values({
    id: 'event_1',
    eventType: 'hackathon',
    name: 'Fixture Event',
    slug: 'fixture-event',
    description: 'Fixture event',
    city: 'Vienna',
    country: 'Austria',
    address: 'Fixture Address',
    registrationOpensAt: fixtureRegistrationOpensAt,
    registrationClosesAt: fixtureRegistrationClosesAt,
    submissionOpensAt: fixtureSubmissionOpensAt,
    submissionClosesAt: fixtureSubmissionClosesAt,
    state: 'registration_open',
    maxTeamMembers: 5,
    autoApproveApplications: options?.autoApproveApplications ?? false,
    inPersonEvent: options?.inPersonEvent ?? false,
    applicationChatgptEmailVisible: options?.applicationChatgptEmailVisible ?? Boolean(options?.requireChatgptEmail),
    applicationOpenaiOrgIdVisible: options?.applicationOpenaiOrgIdVisible ?? Boolean(options?.requireOpenaiOrgId),
    applicationLumaEmailVisible: options?.applicationLumaEmailVisible ?? Boolean(options?.requireLumaEmail),
    applicationWhyThisEventVisible: options?.applicationWhyThisEventVisible ?? true,
    applicationProofOfExecutionVisible: options?.applicationProofOfExecutionVisible ?? true,
    applicationTeamIntentVisible: options?.applicationTeamIntentVisible ?? true,
    requireGithubProfile: options?.requireGithubProfile ?? false,
    requireChatgptEmail: options?.requireChatgptEmail ?? false,
    requireOpenaiOrgId: options?.requireOpenaiOrgId ?? false,
    requireLumaEmail: options?.requireLumaEmail ?? false,
    requireWhyThisEvent: options?.requireWhyThisEvent ?? false,
    requireProofOfExecution: options?.requireProofOfExecution ?? false,
    requireTeamIntent: options?.requireTeamIntent ?? false,
    lumaEventUrl: options?.lumaEventUrl ?? null,
    lumaEventApiId: options?.lumaEventApiId ?? null,
    currentApplicationTermsDocumentId: null,
    currentWinnerTermsDocumentId: null,
    createdByUserId: 'platform_admin'
  })

  await harness.database.insert(eventRoleAssignments).values([
    {
      id: 'role_event_admin',
      eventId: 'event_1',
      userId: 'event_admin',
      role: 'event_admin',
      isInJudgePool: false,
      isStaff: false,
      createdAt: '2026-03-22T12:00:00.000Z'
    },
    {
      id: 'role_staff',
      eventId: 'event_1',
      userId: 'staff_user',
      role: 'staff',
      isInJudgePool: false,
      isStaff: true,
      createdAt: '2026-03-22T12:01:00.000Z'
    }
  ])

  if (options?.currentApplicationTerms !== false) {
    await harness.database.insert(eventTermsDocuments).values([
      {
        id: 'terms_app_1',
        eventId: 'event_1',
        documentType: 'application_terms',
        version: 1,
        title: 'Application Terms v1',
        content: 'Application terms one',
        publishedAt: '2026-03-01T00:00:00.000Z'
      },
      {
        id: 'terms_app_2',
        eventId: 'event_1',
        documentType: 'application_terms',
        version: 2,
        title: 'Application Terms v2',
        content: 'Application terms two',
        publishedAt: '2026-03-02T00:00:00.000Z'
      }
    ])

    await harness.database
      .update(events)
      .set({
        currentApplicationTermsDocumentId: 'terms_app_2'
      })
      .where(eq(events.id, 'event_1'))
  }
}

describe('TASK-3.6 application routes', () => {
  const harnesses: Array<ReturnType<typeof createApiRouteTestHarness>> = []

  afterEach(async () => {
    vi.unstubAllGlobals()

    while (harnesses.length > 0) {
      await harnesses.pop()?.d1Database.close()
    }
  })

  test('POST /api/events/:eventId/applications enforces current terms and records the submission', async () => {
    const harness = createApiRouteTestHarness({
      routes: [
        { method: 'post', path: '/api/events/:eventId/applications', handler: applicationsPostHandler }
      ],
      sessionUser: {
        sub: 'auth0|regular_user',
        email: 'regular@example.com'
      }
    })
    harnesses.push(harness)
    await seedApplicationContext(harness)

    const missingTermsResponse = await harness.request('/api/events/event_1/applications', {
      method: 'POST',
      body: JSON.stringify({})
    })

    expect(missingTermsResponse.status).toBe(409)
    expect(await missingTermsResponse.json()).toMatchObject({
      error: {
        code: 'application_terms_acceptance_required'
      }
    })

    const outdatedResponse = await harness.request('/api/events/event_1/applications', {
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

    const successResponse = await harness.request('/api/events/event_1/applications', {
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
        whyThisEvent: 'I want to build a practical project with other builders.',
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
        eq(userApplications.eventId, 'event_1'),
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
        whyThisEvent: 'I want to build a practical project with other builders.',
        proofOfExecutionUrl: 'https://github.com/regular/previous-project, https://demo.example.com/regular/project'
      })
    })
  })

  test('POST /api/events/:eventId/applications allows submission without event application terms', async () => {
    const harness = createApiRouteTestHarness({
      routes: [
        { method: 'post', path: '/api/events/:eventId/applications', handler: applicationsPostHandler }
      ],
      sessionUser: {
        sub: 'auth0|regular_user',
        email: 'regular@example.com'
      }
    })
    harnesses.push(harness)
    await seedApplicationContext(harness, {
      currentApplicationTerms: false
    })

    const successResponse = await harness.request('/api/events/event_1/applications', {
      method: 'POST',
      body: JSON.stringify({
        registrationTeamIntent: 'solo'
      })
    })

    expect(successResponse.status).toBe(200)
    expect(await successResponse.json()).toMatchObject({
      data: {
        userId: 'regular_user',
        status: 'submitted',
        applicationTermsDocumentId: null,
        applicationTermsAcceptedAt: null
      }
    })

    const storedApplication = await harness.database.query.userApplications.findFirst({
      where: and(
        eq(userApplications.eventId, 'event_1'),
        eq(userApplications.userId, 'regular_user')
      )
    })

    expect(storedApplication).toMatchObject({
      status: 'submitted',
      applicationTermsDocumentId: null,
      applicationTermsAcceptedAt: null
    })
  })

  test('event organizers with admin access elsewhere can apply to unrelated events as participants', async () => {
    const harness = createApiRouteTestHarness({
      routes: [
        { method: 'get', path: '/api/events/:eventId/applications', handler: applicationsListHandler },
        { method: 'post', path: '/api/events/:eventId/applications', handler: applicationsPostHandler }
      ],
      sessionUser: {
        sub: 'auth0|event_organizer',
        email: 'organizer@example.com'
      }
    })
    harnesses.push(harness)
    await seedApplicationContext(harness)

    await harness.database.insert(users).values({
      id: 'event_organizer',
      auth0Subject: 'auth0|event_organizer',
      email: 'organizer@example.com',
      displayName: 'Event Organizer',
      isEventOrganizer: true
    })
    await harness.database.insert(events).values({
      id: 'managed_event',
      eventType: 'build',
      name: 'Managed Event',
      slug: 'managed-event',
      description: 'Managed by the organizer',
      city: 'Vienna',
      country: 'Austria',
      address: 'Managed Address',
      registrationOpensAt: fixtureRegistrationOpensAt,
      registrationClosesAt: fixtureRegistrationClosesAt,
      submissionOpensAt: fixtureRegistrationClosesAt,
      submissionClosesAt: fixtureSubmissionClosesAt,
      state: 'draft',
      maxTeamMembers: 1,
      createdByUserId: 'event_organizer'
    })
    await harness.database.insert(eventRoleAssignments).values({
      id: 'role_event_organizer_managed_event',
      eventId: 'managed_event',
      userId: 'event_organizer',
      role: 'event_admin',
      isInJudgePool: false,
      isStaff: false,
      createdAt: '2026-03-22T12:02:00.000Z'
    })

    const adminListResponse = await harness.request('/api/events/event_1/applications')
    expect(adminListResponse.status).toBe(403)
    expect(await adminListResponse.json()).toMatchObject({
      error: {
        code: 'event_participant_visibility_required'
      }
    })

    const applicationResponse = await harness.request('/api/events/event_1/applications', {
      method: 'POST',
      body: JSON.stringify({
        applicationTermsDocumentId: 'terms_app_2'
      })
    })
    expect(applicationResponse.status).toBe(200)
    expect(await applicationResponse.json()).toMatchObject({
      data: {
        eventId: 'event_1',
        userId: 'event_organizer',
        status: 'submitted'
      }
    })

    const storedApplication = await harness.database.query.userApplications.findFirst({
      where: and(
        eq(userApplications.eventId, 'event_1'),
        eq(userApplications.userId, 'event_organizer')
      )
    })

    expect(storedApplication).toMatchObject({
      eventId: 'event_1',
      userId: 'event_organizer',
      status: 'submitted'
    })
  })

  test('POST /api/events/:eventId/applications auto-approves when configured and enqueues approval side effects', async () => {
    const reviewEmailQueueProducer = createQueueProducerStub()
    const lumaQueueProducer = createQueueProducerStub()
    const harness = createApiRouteTestHarness({
      routes: [
        { method: 'post', path: '/api/events/:eventId/applications', handler: applicationsPostHandler }
      ],
      sessionUser: {
        sub: 'auth0|regular_user',
        email: 'regular@example.com'
      },
      cloudflareEnv: {
        APPLICATION_REVIEW_EMAIL_QUEUE: reviewEmailQueueProducer,
        APPLICATION_LUMA_SYNC_QUEUE: lumaQueueProducer
      },
      runtimeConfig: {
        applicationReviewEmails: {
          queueBinding: 'APPLICATION_REVIEW_EMAIL_QUEUE'
        },
        luma: {
          apiKey: 'luma_test_key',
          queueBinding: 'APPLICATION_LUMA_SYNC_QUEUE'
        }
      }
    })
    harnesses.push(harness)
    await seedApplicationContext(harness, {
      autoApproveApplications: true,
      requireLumaEmail: true,
      lumaEventUrl: 'https://luma.com/codex',
      lumaEventApiId: 'evt-123'
    })

    const fetchMock = vi.fn(async (input: string | URL | Request) => {
      const url = new URL(typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url)

      if (url.pathname === '/v1/event/get-guest') {
        return new Response(JSON.stringify({
          guest: {
            id: 'gst-123',
            user_email: 'regular@luma.example'
          }
        }), {
          status: 200,
          headers: {
            'content-type': 'application/json'
          }
        })
      }

      throw new Error(`Unexpected fetch URL: ${url.toString()}`)
    })
    vi.stubGlobal('fetch', fetchMock)

    const response = await harness.request('/api/events/event_1/applications', {
      method: 'POST',
      body: JSON.stringify({
        applicationTermsDocumentId: 'terms_app_2'
      })
    })

    expect(response.status).toBe(200)
    const payload = await response.json()
    expect(payload).toMatchObject({
      data: {
        userId: 'regular_user',
        status: 'approved',
        preApprovalStatus: null,
        reviewedAt: expect.any(String),
        reviewedByUserId: null,
        lumaSyncStatus: 'not_synced'
      }
    })

    const storedApplication = await harness.database.query.userApplications.findFirst({
      where: and(
        eq(userApplications.eventId, 'event_1'),
        eq(userApplications.userId, 'regular_user')
      )
    })

    expect(storedApplication).toMatchObject({
      status: 'approved',
      preApprovalStatus: null,
      reviewedAt: storedApplication?.submittedAt,
      reviewedByUserId: null,
      lumaSyncStatus: 'not_synced'
    })

    expect(reviewEmailQueueProducer.send).toHaveBeenCalledTimes(1)
    expect(reviewEmailQueueProducer.send).toHaveBeenCalledWith(expect.objectContaining({
      applicationId: storedApplication?.id,
      decision: 'approved',
      recipientEmail: 'regular@example.com',
      eventName: 'Fixture Event',
      eventSlug: 'fixture-event'
    }), {
      contentType: 'json'
    })
    expect(lumaQueueProducer.send).toHaveBeenCalledTimes(1)
    expect(lumaQueueProducer.send).toHaveBeenCalledWith(expect.objectContaining({
      applicationId: storedApplication?.id,
      decision: 'approved'
    }), {
      contentType: 'json'
    })

    const auditRows = await harness.database.select().from(auditLogs)
    expect(auditRows).toEqual(expect.arrayContaining([
      expect.objectContaining({
        actorUserId: null,
        entityType: 'user_application',
        entityId: storedApplication?.id,
        action: 'user_application.approved',
        metadata: expect.objectContaining({
          reviewSource: 'auto_approval'
        })
      }),
      expect.objectContaining({
        actorUserId: null,
        entityType: 'user_application',
        entityId: storedApplication?.id,
        action: 'user_application.review_email_enqueued',
        metadata: expect.objectContaining({
          decision: 'approved',
          reviewSource: 'auto_approval',
          enqueue: expect.objectContaining({
            status: 'enqueued'
          })
        })
      }),
      expect.objectContaining({
        actorUserId: null,
        entityType: 'user_application',
        entityId: storedApplication?.id,
        action: 'user_application.luma_sync_enqueued',
        metadata: expect.objectContaining({
          decision: 'approved',
          reviewSource: 'auto_approval',
          enqueue: expect.objectContaining({
            status: 'enqueued'
          })
        })
      })
    ]))
  })

  test('POST /api/events/:eventId/applications requires in-person attendance commitment when configured', async () => {
    const harness = createApiRouteTestHarness({
      routes: [
        { method: 'post', path: '/api/events/:eventId/applications', handler: applicationsPostHandler }
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

    const missingCommitmentResponse = await harness.request('/api/events/event_1/applications', {
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

    const committedResponse = await harness.request('/api/events/event_1/applications', {
      method: 'POST',
      body: JSON.stringify({
        applicationTermsDocumentId: 'terms_app_2',
        inPersonAttendanceCommitment: true
      })
    })

    expect(committedResponse.status).toBe(200)

    const storedApplication = await harness.database.query.userApplications.findFirst({
      where: and(
        eq(userApplications.eventId, 'event_1'),
        eq(userApplications.userId, 'regular_user')
      )
    })

    expect(storedApplication?.registrationDetailsJson).toBe(JSON.stringify({
      teamIntent: 'unknown',
      teamMembers: [],
      inPersonAttendanceCommitment: true,
      whyThisEvent: '',
      proofOfExecutionUrl: ''
    }))
  })

  test('POST /api/events/:eventId/applications enforces why-this-event and proof-of-execution requirements when configured', async () => {
    const harness = createApiRouteTestHarness({
      routes: [
        { method: 'post', path: '/api/events/:eventId/applications', handler: applicationsPostHandler }
      ],
      sessionUser: {
        sub: 'auth0|regular_user',
        email: 'regular@example.com'
      }
    })
    harnesses.push(harness)
    await seedApplicationContext(harness, {
      requireWhyThisEvent: true,
      requireProofOfExecution: true
    })

    const missingResponse = await harness.request('/api/events/event_1/applications', {
      method: 'POST',
      body: JSON.stringify({
        applicationTermsDocumentId: 'terms_app_2'
      })
    })

    expect(missingResponse.status).toBe(409)
    expect(await missingResponse.json()).toMatchObject({
      error: {
        code: 'why_this_event_required'
      }
    })

    const missingProofResponse = await harness.request('/api/events/event_1/applications', {
      method: 'POST',
      body: JSON.stringify({
        applicationTermsDocumentId: 'terms_app_2',
        whyThisEvent: 'I want to collaborate and build.'
      })
    })

    expect(missingProofResponse.status).toBe(409)
    expect(await missingProofResponse.json()).toMatchObject({
      error: {
        code: 'proof_of_execution_required'
      }
    })

    const successResponse = await harness.request('/api/events/event_1/applications', {
      method: 'POST',
      body: JSON.stringify({
        applicationTermsDocumentId: 'terms_app_2',
        whyThisEvent: 'I want to collaborate and build.',
        proofOfExecutionUrl: 'https://github.com/regular/shipped-work, https://demo.example.com/regular/work'
      })
    })

    expect(successResponse.status).toBe(200)

    const storedApplication = await harness.database.query.userApplications.findFirst({
      where: and(
        eq(userApplications.eventId, 'event_1'),
        eq(userApplications.userId, 'regular_user')
      )
    })

    expect(storedApplication?.registrationDetailsJson).toBe(JSON.stringify({
      teamIntent: 'unknown',
      teamMembers: [],
      inPersonAttendanceCommitment: false,
      whyThisEvent: 'I want to collaborate and build.',
      proofOfExecutionUrl: 'https://github.com/regular/shipped-work, https://demo.example.com/regular/work'
    }))
  })

  test('POST /api/events/:eventId/applications rejects invalid proof-of-execution links', async () => {
    const harness = createApiRouteTestHarness({
      routes: [
        { method: 'post', path: '/api/events/:eventId/applications', handler: applicationsPostHandler }
      ],
      sessionUser: {
        sub: 'auth0|regular_user',
        email: 'regular@example.com'
      }
    })
    harnesses.push(harness)
    await seedApplicationContext(harness)

    const response = await harness.request('/api/events/event_1/applications', {
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

  test('POST /api/events/:eventId/applications rejects users missing required profile fields', async () => {
    const harness = createApiRouteTestHarness({
      routes: [
        { method: 'post', path: '/api/events/:eventId/applications', handler: applicationsPostHandler }
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

    const response = await harness.request('/api/events/event_1/applications', {
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

  test('POST /api/events/:eventId/applications rejects registration team-member hints beyond max team members', async () => {
    const harness = createApiRouteTestHarness({
      routes: [
        { method: 'post', path: '/api/events/:eventId/applications', handler: applicationsPostHandler }
      ],
      sessionUser: {
        sub: 'auth0|regular_user',
        email: 'regular@example.com'
      }
    })
    harnesses.push(harness)
    await seedApplicationContext(harness)

    const response = await harness.request('/api/events/event_1/applications', {
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

  test('POST /api/events/:eventId/applications rejects users missing a required luma email', async () => {
    const harness = createApiRouteTestHarness({
      routes: [
        { method: 'post', path: '/api/events/:eventId/applications', handler: applicationsPostHandler }
      ],
      sessionUser: {
        sub: 'auth0|missing_profile',
        email: 'missing-profile@example.com'
      }
    })
    harnesses.push(harness)
    await seedApplicationContext(harness, {
      requireLumaEmail: true
    })

    const response = await harness.request('/api/events/event_1/applications', {
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
          missingFields: ['lumaEmail']
        }
      }
    })
  })

  test('POST /api/events/:eventId/applications rejects Luma emails that are not registered for the event', async () => {
    const harness = createApiRouteTestHarness({
      routes: [
        { method: 'post', path: '/api/events/:eventId/applications', handler: applicationsPostHandler }
      ],
      sessionUser: {
        sub: 'auth0|regular_user',
        email: 'regular@example.com'
      },
      runtimeConfig: {
        luma: {
          apiKey: 'luma_test_key'
        }
      }
    })
    harnesses.push(harness)
    await seedApplicationContext(harness, {
      requireLumaEmail: true,
      lumaEventUrl: 'https://luma.com/codex',
      lumaEventApiId: 'evt-123'
    })

    const fetchMock = vi.fn(async (input: string | URL | Request) => {
      const url = new URL(typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url)

      if (url.pathname === '/v1/event/get-guest') {
        return new Response(JSON.stringify({
          guest: null
        }), {
          status: 200,
          headers: {
            'content-type': 'application/json'
          }
        })
      }

      throw new Error(`Unexpected fetch URL: ${url.toString()}`)
    })
    vi.stubGlobal('fetch', fetchMock)

    const response = await harness.request('/api/events/event_1/applications', {
      method: 'POST',
      body: JSON.stringify({
        applicationTermsDocumentId: 'terms_app_2'
      })
    })

    expect(response.status).toBe(409)
    expect(await response.json()).toMatchObject({
      error: {
        code: 'luma_registration_required',
        message: 'Luma registration is mandatory for this event, and we could not find any guest with the Luma email you entered.'
      }
    })

    const storedApplication = await harness.database.query.userApplications.findFirst({
      where: and(
        eq(userApplications.eventId, 'event_1'),
        eq(userApplications.userId, 'regular_user')
      )
    })

    expect(storedApplication).toBeUndefined()
  })

  test('POST /api/events/:eventId/applications does not arm Luma sync when no Luma event API id is configured', async () => {
    const harness = createApiRouteTestHarness({
      routes: [
        { method: 'post', path: '/api/events/:eventId/applications', handler: applicationsPostHandler }
      ],
      sessionUser: {
        sub: 'auth0|regular_user',
        email: 'regular@example.com'
      }
    })
    harnesses.push(harness)
    await seedApplicationContext(harness, {
      requireLumaEmail: true,
      lumaEventUrl: 'https://luma.com/codex',
      lumaEventApiId: null
    })

    const response = await harness.request('/api/events/event_1/applications', {
      method: 'POST',
      body: JSON.stringify({
        applicationTermsDocumentId: 'terms_app_2'
      })
    })

    expect(response.status).toBe(200)
    expect(await response.json()).toMatchObject({
      data: {
        userId: 'regular_user',
        lumaSyncStatus: null
      }
    })
  })

  test('POST /api/events/:eventId/applications stores not_synced for Luma-enabled events', async () => {
    const harness = createApiRouteTestHarness({
      routes: [
        { method: 'post', path: '/api/events/:eventId/applications', handler: applicationsPostHandler }
      ],
      sessionUser: {
        sub: 'auth0|regular_user',
        email: 'regular@example.com'
      },
      runtimeConfig: {
        luma: {
          apiKey: 'luma_test_key'
        }
      }
    })
    harnesses.push(harness)
    await seedApplicationContext(harness, {
      requireLumaEmail: true,
      lumaEventUrl: 'https://luma.com/codex',
      lumaEventApiId: 'evt-123'
    })

    const fetchMock = vi.fn(async (input: string | URL | Request) => {
      const url = new URL(typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url)

      if (url.pathname === '/v1/event/get-guest') {
        return new Response(JSON.stringify({
          guest: {
            id: 'gst-123',
            user_email: 'regular@luma.example'
          }
        }), {
          status: 200,
          headers: {
            'content-type': 'application/json'
          }
        })
      }

      throw new Error(`Unexpected fetch URL: ${url.toString()}`)
    })
    vi.stubGlobal('fetch', fetchMock)

    const response = await harness.request('/api/events/event_1/applications', {
      method: 'POST',
      body: JSON.stringify({
        applicationTermsDocumentId: 'terms_app_2'
      })
    })

    expect(response.status).toBe(200)
    expect(await response.json()).toMatchObject({
      data: {
        userId: 'regular_user',
        lumaSyncStatus: 'not_synced'
      }
    })

    const storedApplication = await harness.database.query.userApplications.findFirst({
      where: and(
        eq(userApplications.eventId, 'event_1'),
        eq(userApplications.userId, 'regular_user')
      )
    })

    expect(storedApplication?.lumaSyncStatus).toBe('not_synced')
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  test('POST /api/events/:eventId/applications allows submission when the Luma lookup temporarily fails', async () => {
    const harness = createApiRouteTestHarness({
      routes: [
        { method: 'post', path: '/api/events/:eventId/applications', handler: applicationsPostHandler }
      ],
      sessionUser: {
        sub: 'auth0|regular_user',
        email: 'regular@example.com'
      },
      runtimeConfig: {
        luma: {
          apiKey: 'luma_test_key'
        }
      }
    })
    harnesses.push(harness)
    await seedApplicationContext(harness, {
      requireLumaEmail: true,
      lumaEventUrl: 'https://luma.com/codex',
      lumaEventApiId: 'evt-123'
    })

    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined)
    const fetchMock = vi.fn(async () => new Response('rate limit', { status: 429 }))
    vi.stubGlobal('fetch', fetchMock)

    const response = await harness.request('/api/events/event_1/applications', {
      method: 'POST',
      body: JSON.stringify({
        applicationTermsDocumentId: 'terms_app_2'
      })
    })

    expect(response.status).toBe(200)
    expect(await response.json()).toMatchObject({
      data: {
        userId: 'regular_user',
        lumaSyncStatus: 'not_synced'
      }
    })

    expect(consoleError).toHaveBeenCalledWith('Luma registration validation skipped after lookup failure.', {
      eventId: 'event_1',
      userId: 'regular_user',
      reason: 'luma_request_retryable_status'
    })
    consoleError.mockRestore()
  })

  test('POST /api/events/:eventId/applications rejects users missing a required ChatGPT email and OpenAI org ID', async () => {
    const harness = createApiRouteTestHarness({
      routes: [
        { method: 'post', path: '/api/events/:eventId/applications', handler: applicationsPostHandler }
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

    const response = await harness.request('/api/events/event_1/applications', {
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

  test('GET /api/events/:eventId/applications/me returns the caller application or null', async () => {
    const harness = createApiRouteTestHarness({
      routes: [
        { method: 'get', path: '/api/events/:eventId/applications/me', handler: ownApplicationHandler }
      ],
      sessionUser: {
        sub: 'auth0|regular_user',
        email: 'regular@example.com'
      }
    })
    harnesses.push(harness)
    await seedApplicationContext(harness)

    const emptyResponse = await harness.request('/api/events/event_1/applications/me')
    expect(emptyResponse.status).toBe(200)
    expect(await emptyResponse.json()).toMatchObject({
      data: null
    })

    await harness.database.insert(userApplications).values({
      id: 'application_1',
      eventId: 'event_1',
      userId: 'regular_user',
      status: 'submitted',
      submittedAt: '2026-03-22T12:10:00.000Z',
      applicationTermsDocumentId: 'terms_app_2',
      applicationTermsAcceptedAt: '2026-03-22T12:10:00.000Z',
      createdAt: '2026-03-22T12:10:00.000Z',
      updatedAt: '2026-03-22T12:10:00.000Z'
    })

    const response = await harness.request('/api/events/event_1/applications/me')
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

  test('POST /api/events/:eventId/applications/me/actions/withdraw transitions the caller application and writes an audit record', async () => {
    const harness = createApiRouteTestHarness({
      routes: [
        {
          method: 'post',
          path: '/api/events/:eventId/applications/me/actions/withdraw',
          handler: withdrawOwnApplicationHandler
        }
      ],
      sessionUser: {
        sub: 'auth0|regular_user',
        email: 'regular@example.com'
      }
    })
    harnesses.push(harness)
    await seedApplicationContext(harness)

    await harness.database.insert(userApplications).values({
      id: 'application_1',
      eventId: 'event_1',
      userId: 'regular_user',
      status: 'submitted',
      preApprovalStatus: 'approved',
      submittedAt: '2026-03-22T12:10:00.000Z',
      applicationTermsDocumentId: 'terms_app_2',
      applicationTermsAcceptedAt: '2026-03-22T12:10:00.000Z',
      createdAt: '2026-03-22T12:10:00.000Z',
      updatedAt: '2026-03-22T12:10:00.000Z'
    })

    const response = await harness.request('/api/events/event_1/applications/me/actions/withdraw', {
      method: 'POST'
    })

    expect(response.status).toBe(200)
    expect(await response.json()).toMatchObject({
      data: {
        id: 'application_1',
        status: 'withdrawn',
        preApprovalStatus: null,
        withdrawnAt: expect.any(String)
      }
    })

    const storedApplication = await harness.database.query.userApplications.findFirst({
      where: and(
        eq(userApplications.eventId, 'event_1'),
        eq(userApplications.userId, 'regular_user')
      )
    })

    expect(storedApplication).toMatchObject({
      status: 'withdrawn',
      preApprovalStatus: null
    })
    expect(storedApplication?.withdrawnAt).toBeTruthy()

    const auditRecords = await harness.database.query.auditLogs.findMany({
      where: eq(auditLogs.entityId, 'application_1')
    })

    expect(auditRecords).toEqual(expect.arrayContaining([
      expect.objectContaining({
        entityType: 'user_application',
        entityId: 'application_1',
        action: 'user_application.withdrawn'
      })
    ]))
  })

  test('POST /api/events/:eventId/applications/me/actions/withdraw is blocked while the caller still has an active team', async () => {
    const harness = createApiRouteTestHarness({
      routes: [
        {
          method: 'post',
          path: '/api/events/:eventId/applications/me/actions/withdraw',
          handler: withdrawOwnApplicationHandler
        }
      ],
      sessionUser: {
        sub: 'auth0|regular_user',
        email: 'regular@example.com'
      }
    })
    harnesses.push(harness)
    await seedApplicationContext(harness)

    await harness.database.insert(userApplications).values({
      id: 'application_1',
      eventId: 'event_1',
      userId: 'regular_user',
      status: 'approved',
      submittedAt: '2026-03-22T12:10:00.000Z',
      reviewedAt: '2026-03-22T12:20:00.000Z',
      reviewedByUserId: 'event_admin',
      applicationTermsDocumentId: 'terms_app_2',
      applicationTermsAcceptedAt: '2026-03-22T12:10:00.000Z',
      createdAt: '2026-03-22T12:10:00.000Z',
      updatedAt: '2026-03-22T12:20:00.000Z'
    })
    await harness.database.insert(teams).values({
      id: 'team_1',
      eventId: 'event_1',
      name: 'Active Team',
      slug: 'active-team',
      isOpenToJoinRequests: true,
      createdByUserId: 'regular_user',
      createdAt: '2026-03-22T12:30:00.000Z',
      updatedAt: '2026-03-22T12:30:00.000Z'
    })
    await harness.database.insert(teamMembers).values({
      id: 'team_member_1',
      teamId: 'team_1',
      userId: 'regular_user',
      role: 'admin',
      joinedAt: '2026-03-22T12:30:00.000Z',
      leftAt: null,
      createdAt: '2026-03-22T12:30:00.000Z'
    })

    const response = await harness.request('/api/events/event_1/applications/me/actions/withdraw', {
      method: 'POST'
    })

    expect(response.status).toBe(409)
    expect(await response.json()).toMatchObject({
      error: {
        code: 'user_application_withdrawal_blocked'
      }
    })

    const storedApplication = await harness.database.query.userApplications.findFirst({
      where: eq(userApplications.id, 'application_1')
    })

    expect(storedApplication).toMatchObject({
      status: 'approved',
      withdrawnAt: null
    })
  })

  test('POST /api/events/:eventId/applications/me/actions/withdraw enqueues Luma rejection for Luma-enabled events', async () => {
    const lumaQueueProducer = createQueueProducerStub()
    const harness = createApiRouteTestHarness({
      routes: [
        {
          method: 'post',
          path: '/api/events/:eventId/applications/me/actions/withdraw',
          handler: withdrawOwnApplicationHandler
        }
      ],
      sessionUser: {
        sub: 'auth0|regular_user',
        email: 'regular@example.com'
      },
      cloudflareEnv: {
        APPLICATION_LUMA_SYNC_QUEUE: lumaQueueProducer
      },
      runtimeConfig: {
        luma: {
          queueBinding: 'APPLICATION_LUMA_SYNC_QUEUE'
        }
      }
    })
    harnesses.push(harness)
    await seedApplicationContext(harness, {
      requireLumaEmail: true,
      lumaEventUrl: 'https://luma.com/codex',
      lumaEventApiId: 'evt-123'
    })

    await harness.database.insert(userApplications).values({
      id: 'application_1',
      eventId: 'event_1',
      userId: 'regular_user',
      status: 'approved',
      lumaSyncStatus: 'approve_synced',
      submittedAt: '2026-03-22T12:10:00.000Z',
      reviewedAt: '2026-03-22T12:20:00.000Z',
      reviewedByUserId: 'event_admin',
      applicationTermsDocumentId: 'terms_app_2',
      applicationTermsAcceptedAt: '2026-03-22T12:10:00.000Z',
      createdAt: '2026-03-22T12:10:00.000Z',
      updatedAt: '2026-03-22T12:20:00.000Z'
    })

    const response = await harness.request('/api/events/event_1/applications/me/actions/withdraw', {
      method: 'POST'
    })

    expect(response.status).toBe(200)
    expect(await response.json()).toMatchObject({
      data: {
        id: 'application_1',
        status: 'withdrawn',
        lumaSyncStatus: 'not_synced',
        withdrawnAt: expect.any(String)
      }
    })

    expect(lumaQueueProducer.send).toHaveBeenCalledTimes(1)
    expect(lumaQueueProducer.send).toHaveBeenCalledWith(expect.objectContaining({
      applicationId: 'application_1',
      decision: 'rejected'
    }), {
      contentType: 'json'
    })

    const storedApplication = await harness.database.query.userApplications.findFirst({
      where: eq(userApplications.id, 'application_1')
    })
    expect(storedApplication).toMatchObject({
      status: 'withdrawn',
      lumaSyncStatus: 'not_synced'
    })

    const auditRows = await harness.database.select().from(auditLogs)
    expect(auditRows).toEqual(expect.arrayContaining([
      expect.objectContaining({
        entityType: 'user_application',
        entityId: 'application_1',
        action: 'user_application.luma_sync_enqueued',
        metadata: expect.objectContaining({
          decision: 'rejected',
          trigger: 'participant_withdrawal',
          enqueue: expect.objectContaining({
            status: 'enqueued'
          })
        })
      })
    ]))
  })

  test('POST /api/events/:eventId/applications/me/actions/withdraw marks Luma sync as failed when the Luma queue binding is unavailable', async () => {
    const harness = createApiRouteTestHarness({
      routes: [
        {
          method: 'post',
          path: '/api/events/:eventId/applications/me/actions/withdraw',
          handler: withdrawOwnApplicationHandler
        }
      ],
      sessionUser: {
        sub: 'auth0|regular_user',
        email: 'regular@example.com'
      },
      runtimeConfig: {
        luma: {
          queueBinding: 'APPLICATION_LUMA_SYNC_QUEUE'
        }
      }
    })
    harnesses.push(harness)
    await seedApplicationContext(harness, {
      requireLumaEmail: true,
      lumaEventUrl: 'https://luma.com/codex',
      lumaEventApiId: 'evt-123'
    })

    await harness.database.insert(userApplications).values({
      id: 'application_1',
      eventId: 'event_1',
      userId: 'regular_user',
      status: 'approved',
      lumaSyncStatus: 'approve_synced',
      submittedAt: '2026-03-22T12:10:00.000Z',
      reviewedAt: '2026-03-22T12:20:00.000Z',
      reviewedByUserId: 'event_admin',
      applicationTermsDocumentId: 'terms_app_2',
      applicationTermsAcceptedAt: '2026-03-22T12:10:00.000Z',
      createdAt: '2026-03-22T12:10:00.000Z',
      updatedAt: '2026-03-22T12:20:00.000Z'
    })

    const response = await harness.request('/api/events/event_1/applications/me/actions/withdraw', {
      method: 'POST'
    })

    expect(response.status).toBe(200)
    expect(await response.json()).toMatchObject({
      data: {
        id: 'application_1',
        status: 'withdrawn',
        lumaSyncStatus: 'reject_failed'
      }
    })

    const storedApplication = await harness.database.query.userApplications.findFirst({
      where: eq(userApplications.id, 'application_1')
    })
    expect(storedApplication).toMatchObject({
      status: 'withdrawn',
      lumaSyncStatus: 'reject_failed'
    })

    const auditRows = await harness.database.select().from(auditLogs)
    expect(auditRows).toEqual(expect.arrayContaining([
      expect.objectContaining({
        entityType: 'user_application',
        entityId: 'application_1',
        action: 'user_application.luma_sync_enqueued',
        metadata: expect.objectContaining({
          decision: 'rejected',
          trigger: 'participant_withdrawal',
          enqueue: expect.objectContaining({
            status: 'skipped',
            reason: 'queue_binding_missing:APPLICATION_LUMA_SYNC_QUEUE'
          })
        })
      })
    ]))
  })

  test('POST /api/events/:eventId/applications/:applicationId/actions/withdraw removes the participant from a team that remains valid', async () => {
    const harness = createApiRouteTestHarness({
      routes: [
        {
          method: 'post',
          path: '/api/events/:eventId/applications/:applicationId/actions/withdraw',
          handler: adminWithdrawApplicationHandler
        }
      ],
      sessionUser: {
        sub: 'auth0|event_admin',
        email: 'event-admin@example.com'
      }
    })
    harnesses.push(harness)
    await seedApplicationContext(harness)

    await harness.database.insert(userApplications).values({
      id: 'application_1',
      eventId: 'event_1',
      userId: 'regular_user',
      status: 'approved',
      submittedAt: '2026-03-22T12:10:00.000Z',
      reviewedAt: '2026-03-22T12:20:00.000Z',
      reviewedByUserId: 'event_admin',
      applicationTermsDocumentId: 'terms_app_2',
      applicationTermsAcceptedAt: '2026-03-22T12:10:00.000Z',
      createdAt: '2026-03-22T12:10:00.000Z',
      updatedAt: '2026-03-22T12:20:00.000Z'
    })
    await harness.database.insert(teams).values({
      id: 'team_1',
      eventId: 'event_1',
      name: 'Active Team',
      slug: 'active-team',
      isOpenToJoinRequests: true,
      createdByUserId: 'regular_user',
      createdAt: '2026-03-22T12:30:00.000Z',
      updatedAt: '2026-03-22T12:30:00.000Z'
    })
    await harness.database.insert(teamMembers).values([
      {
        id: 'team_member_regular',
        teamId: 'team_1',
        userId: 'regular_user',
        role: 'member',
        joinedAt: '2026-03-22T12:30:00.000Z',
        leftAt: null,
        createdAt: '2026-03-22T12:30:00.000Z'
      },
      {
        id: 'team_member_admin',
        teamId: 'team_1',
        userId: 'missing_profile_user',
        role: 'admin',
        joinedAt: '2026-03-22T12:30:00.000Z',
        leftAt: null,
        createdAt: '2026-03-22T12:30:00.000Z'
      }
    ])

    const response = await harness.request('/api/events/event_1/applications/application_1/actions/withdraw', {
      method: 'POST'
    })

    expect(response.status).toBe(200)
    expect(await response.json()).toMatchObject({
      data: {
        id: 'application_1',
        status: 'withdrawn',
        withdrawnAt: expect.any(String)
      }
    })

    const storedApplication = await harness.database.query.userApplications.findFirst({
      where: eq(userApplications.id, 'application_1')
    })
    expect(storedApplication).toMatchObject({
      status: 'withdrawn'
    })

    const removedMembership = await harness.database.query.teamMembers.findFirst({
      where: eq(teamMembers.id, 'team_member_regular')
    })
    const remainingAdminMembership = await harness.database.query.teamMembers.findFirst({
      where: eq(teamMembers.id, 'team_member_admin')
    })

    expect(removedMembership?.leftAt).toBeTruthy()
    expect(remainingAdminMembership?.leftAt).toBeNull()
  })

  test('POST /api/events/:eventId/applications/:applicationId/actions/withdraw dismantles a solo team and closes pending join requests', async () => {
    const harness = createApiRouteTestHarness({
      routes: [
        {
          method: 'post',
          path: '/api/events/:eventId/applications/:applicationId/actions/withdraw',
          handler: adminWithdrawApplicationHandler
        }
      ],
      sessionUser: {
        sub: 'auth0|event_admin',
        email: 'event-admin@example.com'
      }
    })
    harnesses.push(harness)
    await seedApplicationContext(harness)

    await harness.database.insert(userApplications).values({
      id: 'application_1',
      eventId: 'event_1',
      userId: 'regular_user',
      status: 'approved',
      submittedAt: '2026-03-22T12:10:00.000Z',
      reviewedAt: '2026-03-22T12:20:00.000Z',
      reviewedByUserId: 'event_admin',
      applicationTermsDocumentId: 'terms_app_2',
      applicationTermsAcceptedAt: '2026-03-22T12:10:00.000Z',
      createdAt: '2026-03-22T12:10:00.000Z',
      updatedAt: '2026-03-22T12:20:00.000Z'
    })
    await harness.database.insert(teams).values({
      id: 'team_1',
      eventId: 'event_1',
      name: 'Solo Team',
      slug: 'solo-team',
      isOpenToJoinRequests: true,
      createdByUserId: 'regular_user',
      createdAt: '2026-03-22T12:30:00.000Z',
      updatedAt: '2026-03-22T12:30:00.000Z'
    })
    await harness.database.insert(teamMembers).values({
      id: 'team_member_regular',
      teamId: 'team_1',
      userId: 'regular_user',
      role: 'admin',
      joinedAt: '2026-03-22T12:30:00.000Z',
      leftAt: null,
      createdAt: '2026-03-22T12:30:00.000Z'
    })
    await harness.database.insert(teamJoinRequests).values({
      id: 'team_join_request_1',
      teamId: 'team_1',
      userId: 'missing_profile_user',
      status: 'pending',
      requestedAt: '2026-03-22T12:35:00.000Z',
      reviewedAt: null,
      reviewedByUserId: null,
      createdAt: '2026-03-22T12:35:00.000Z'
    })

    const response = await harness.request('/api/events/event_1/applications/application_1/actions/withdraw', {
      method: 'POST'
    })

    expect(response.status).toBe(200)

    const dissolvedMembership = await harness.database.query.teamMembers.findFirst({
      where: eq(teamMembers.id, 'team_member_regular')
    })
    const updatedTeam = await harness.database.query.teams.findFirst({
      where: eq(teams.id, 'team_1')
    })
    const closedJoinRequest = await harness.database.query.teamJoinRequests.findFirst({
      where: eq(teamJoinRequests.id, 'team_join_request_1')
    })

    expect(dissolvedMembership?.leftAt).toBeTruthy()
    expect(updatedTeam).toMatchObject({
      isOpenToJoinRequests: false
    })
    expect(closedJoinRequest).toMatchObject({
      status: 'rejected',
      reviewedByUserId: 'event_admin'
    })

    const auditRows = await harness.database.query.auditLogs.findMany({
      where: eq(auditLogs.entityId, 'application_1')
    })
    expect(auditRows).toEqual(expect.arrayContaining([
      expect.objectContaining({
        entityType: 'user_application',
        entityId: 'application_1',
        action: 'user_application.admin_withdrawn'
      })
    ]))
  })

  test('POST /api/events/:eventId/applications/:applicationId/actions/withdraw dismantles a team when the participant is the last active admin and no submission exists', async () => {
    const harness = createApiRouteTestHarness({
      routes: [
        {
          method: 'post',
          path: '/api/events/:eventId/applications/:applicationId/actions/withdraw',
          handler: adminWithdrawApplicationHandler
        }
      ],
      sessionUser: {
        sub: 'auth0|event_admin',
        email: 'event-admin@example.com'
      }
    })
    harnesses.push(harness)
    await seedApplicationContext(harness)

    await harness.database.insert(userApplications).values({
      id: 'application_1',
      eventId: 'event_1',
      userId: 'regular_user',
      status: 'approved',
      submittedAt: '2026-03-22T12:10:00.000Z',
      reviewedAt: '2026-03-22T12:20:00.000Z',
      reviewedByUserId: 'event_admin',
      applicationTermsDocumentId: 'terms_app_2',
      applicationTermsAcceptedAt: '2026-03-22T12:10:00.000Z',
      createdAt: '2026-03-22T12:10:00.000Z',
      updatedAt: '2026-03-22T12:20:00.000Z'
    })
    await harness.database.insert(teams).values({
      id: 'team_1',
      eventId: 'event_1',
      name: 'Team Without Backup Admin',
      slug: 'team-without-backup-admin',
      isOpenToJoinRequests: true,
      createdByUserId: 'regular_user',
      createdAt: '2026-03-22T12:30:00.000Z',
      updatedAt: '2026-03-22T12:30:00.000Z'
    })
    await harness.database.insert(teamMembers).values([
      {
        id: 'team_member_regular',
        teamId: 'team_1',
        userId: 'regular_user',
        role: 'admin',
        joinedAt: '2026-03-22T12:30:00.000Z',
        leftAt: null,
        createdAt: '2026-03-22T12:30:00.000Z'
      },
      {
        id: 'team_member_other',
        teamId: 'team_1',
        userId: 'missing_profile_user',
        role: 'member',
        joinedAt: '2026-03-22T12:31:00.000Z',
        leftAt: null,
        createdAt: '2026-03-22T12:31:00.000Z'
      }
    ])

    const response = await harness.request('/api/events/event_1/applications/application_1/actions/withdraw', {
      method: 'POST'
    })

    expect(response.status).toBe(200)

    const memberships = await harness.database.query.teamMembers.findMany({
      where: eq(teamMembers.teamId, 'team_1')
    })

    expect(memberships).toEqual(expect.arrayContaining([
      expect.objectContaining({
        id: 'team_member_regular',
        leftAt: expect.any(String)
      }),
      expect.objectContaining({
        id: 'team_member_other',
        leftAt: expect.any(String)
      })
    ]))
  })

  test('POST /api/events/:eventId/applications/:applicationId/actions/withdraw is blocked when dismantling the team would affect an active submission', async () => {
    const harness = createApiRouteTestHarness({
      routes: [
        {
          method: 'post',
          path: '/api/events/:eventId/applications/:applicationId/actions/withdraw',
          handler: adminWithdrawApplicationHandler
        }
      ],
      sessionUser: {
        sub: 'auth0|event_admin',
        email: 'event-admin@example.com'
      }
    })
    harnesses.push(harness)
    await seedApplicationContext(harness)

    await harness.database.insert(userApplications).values({
      id: 'application_1',
      eventId: 'event_1',
      userId: 'regular_user',
      status: 'approved',
      submittedAt: '2026-03-22T12:10:00.000Z',
      reviewedAt: '2026-03-22T12:20:00.000Z',
      reviewedByUserId: 'event_admin',
      applicationTermsDocumentId: 'terms_app_2',
      applicationTermsAcceptedAt: '2026-03-22T12:10:00.000Z',
      createdAt: '2026-03-22T12:10:00.000Z',
      updatedAt: '2026-03-22T12:20:00.000Z'
    })
    await harness.database.insert(teams).values({
      id: 'team_1',
      eventId: 'event_1',
      name: 'Blocked Team',
      slug: 'blocked-team',
      isOpenToJoinRequests: true,
      createdByUserId: 'regular_user',
      createdAt: '2026-03-22T12:30:00.000Z',
      updatedAt: '2026-03-22T12:30:00.000Z'
    })
    await harness.database.insert(teamMembers).values({
      id: 'team_member_regular',
      teamId: 'team_1',
      userId: 'regular_user',
      role: 'admin',
      joinedAt: '2026-03-22T12:30:00.000Z',
      leftAt: null,
      createdAt: '2026-03-22T12:30:00.000Z'
    })
    await harness.database.insert(submissions).values({
      id: 'submission_1',
      teamId: 'team_1',
      status: 'draft',
      projectName: 'Blocked Project',
      summary: 'Cannot dissolve this team while the draft exists.',
      repositoryUrl: null,
      demoUrl: null,
      trackId: null,
      submittedAt: null,
      lockedAt: null,
      withdrawnAt: null,
      disqualifiedAt: null,
      createdAt: '2026-03-22T12:40:00.000Z',
      updatedAt: '2026-03-22T12:40:00.000Z'
    })

    const response = await harness.request('/api/events/event_1/applications/application_1/actions/withdraw', {
      method: 'POST'
    })

    expect(response.status).toBe(409)
    expect(await response.json()).toMatchObject({
      error: {
        code: 'user_application_admin_withdrawal_blocked'
      }
    })

    const storedApplication = await harness.database.query.userApplications.findFirst({
      where: eq(userApplications.id, 'application_1')
    })
    const storedMembership = await harness.database.query.teamMembers.findFirst({
      where: eq(teamMembers.id, 'team_member_regular')
    })

    expect(storedApplication).toMatchObject({
      status: 'approved',
      withdrawnAt: null
    })
    expect(storedMembership?.leftAt).toBeNull()
  })

  test('POST /api/events/:eventId/applications/:applicationId/actions/withdraw enqueues Luma rejection for admin-managed withdrawals', async () => {
    const lumaQueueProducer = createQueueProducerStub()
    const harness = createApiRouteTestHarness({
      routes: [
        {
          method: 'post',
          path: '/api/events/:eventId/applications/:applicationId/actions/withdraw',
          handler: adminWithdrawApplicationHandler
        }
      ],
      sessionUser: {
        sub: 'auth0|event_admin',
        email: 'event-admin@example.com'
      },
      cloudflareEnv: {
        APPLICATION_LUMA_SYNC_QUEUE: lumaQueueProducer
      },
      runtimeConfig: {
        luma: {
          queueBinding: 'APPLICATION_LUMA_SYNC_QUEUE'
        }
      }
    })
    harnesses.push(harness)
    await seedApplicationContext(harness, {
      requireLumaEmail: true,
      lumaEventUrl: 'https://luma.com/codex',
      lumaEventApiId: 'evt-123'
    })

    await harness.database.insert(userApplications).values({
      id: 'application_1',
      eventId: 'event_1',
      userId: 'regular_user',
      status: 'approved',
      lumaSyncStatus: 'approve_synced',
      submittedAt: '2026-03-22T12:10:00.000Z',
      reviewedAt: '2026-03-22T12:20:00.000Z',
      reviewedByUserId: 'event_admin',
      applicationTermsDocumentId: 'terms_app_2',
      applicationTermsAcceptedAt: '2026-03-22T12:10:00.000Z',
      createdAt: '2026-03-22T12:10:00.000Z',
      updatedAt: '2026-03-22T12:20:00.000Z'
    })

    const response = await harness.request('/api/events/event_1/applications/application_1/actions/withdraw', {
      method: 'POST'
    })

    expect(response.status).toBe(200)
    expect(await response.json()).toMatchObject({
      data: {
        id: 'application_1',
        status: 'withdrawn',
        lumaSyncStatus: 'not_synced'
      }
    })

    expect(lumaQueueProducer.send).toHaveBeenCalledTimes(1)
    expect(lumaQueueProducer.send).toHaveBeenCalledWith(expect.objectContaining({
      applicationId: 'application_1',
      decision: 'rejected'
    }), {
      contentType: 'json'
    })

    const auditRows = await harness.database.select().from(auditLogs)
    expect(auditRows).toEqual(expect.arrayContaining([
      expect.objectContaining({
        entityType: 'user_application',
        entityId: 'application_1',
        action: 'user_application.luma_sync_enqueued',
        metadata: expect.objectContaining({
          decision: 'rejected',
          trigger: 'admin_withdrawal'
        })
      })
    ]))
  })

  test('admin application routes list, stage decisions, and apply them with audit logging', async () => {
    const queueProducer = createQueueProducerStub()
    const harness = createApiRouteTestHarness({
      routes: [
        { method: 'get', path: '/api/events/:eventId/applications', handler: applicationsListHandler },
        {
          method: 'post',
          path: '/api/events/:eventId/applications/:applicationId/actions/approve',
          handler: approveApplicationHandler
        },
        {
          method: 'post',
          path: '/api/events/:eventId/applications/actions/apply-staged-decisions',
          handler: applyStagedDecisionsHandler
        }
      ],
      sessionUser: {
        sub: 'auth0|event_admin',
        email: 'event-admin@example.com'
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
    await harness.database
      .update(users)
      .set({
        profileIconUpdatedAt: '2026-03-28T12:34:56.000Z'
      })
      .where(eq(users.id, 'regular_user'))

    await harness.database.insert(userApplications).values({
      id: 'application_1',
      eventId: 'event_1',
      userId: 'regular_user',
      status: 'submitted',
      submittedAt: '2026-03-22T12:10:00.000Z',
      applicationTermsDocumentId: 'terms_app_2',
      applicationTermsAcceptedAt: '2026-03-22T12:10:00.000Z',
      createdAt: '2026-03-22T12:10:00.000Z',
      updatedAt: '2026-03-22T12:10:00.000Z'
    })

    const listResponse = await harness.request('/api/events/event_1/applications')
    expect(listResponse.status).toBe(200)
    const listPayload = await listResponse.json()
    expect(listPayload.meta).toMatchObject({
      total: 1
    })
    expect(listPayload.data).toEqual(expect.arrayContaining([
      expect.objectContaining({
        id: 'application_1',
        user: expect.objectContaining({
          id: 'regular_user',
          profileIconUpdatedAt: '2026-03-28T12:34:56.000Z'
        })
      })
    ]))

    const approveResponse = await harness.request('/api/events/event_1/applications/application_1/actions/approve', {
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

    const applyResponse = await harness.request('/api/events/event_1/applications/actions/apply-staged-decisions', {
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
      eventName: 'Fixture Event',
      eventSlug: 'fixture-event'
    }), {
      contentType: 'json'
    })
  })

  test('staff can list applications but cannot stage review decisions', async () => {
    const harness = createApiRouteTestHarness({
      routes: [
        { method: 'get', path: '/api/events/:eventId/applications', handler: applicationsListHandler },
        {
          method: 'post',
          path: '/api/events/:eventId/applications/:applicationId/actions/approve',
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
      eventId: 'event_1',
      userId: 'regular_user',
      status: 'submitted',
      submittedAt: '2026-03-22T12:10:00.000Z',
      applicationTermsDocumentId: 'terms_app_2',
      applicationTermsAcceptedAt: '2026-03-22T12:10:00.000Z',
      createdAt: '2026-03-22T12:10:00.000Z',
      updatedAt: '2026-03-22T12:10:00.000Z'
    })

    const listResponse = await harness.request('/api/events/event_1/applications')
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

    const approveResponse = await harness.request('/api/events/event_1/applications/application_1/actions/approve', {
      method: 'POST'
    })
    expect(approveResponse.status).toBe(403)
    expect(await approveResponse.json()).toMatchObject({
      error: {
        code: 'event_admin_required'
      }
    })
  })

  test('GET /api/events/:eventId/applications returns bounded pages for large participant sets', async () => {
    const harness = createApiRouteTestHarness({
      routes: [
        { method: 'get', path: '/api/events/:eventId/applications', handler: applicationsListHandler }
      ],
      sessionUser: {
        sub: 'auth0|event_admin',
        email: 'event-admin@example.com'
      }
    })
    harnesses.push(harness)
    await seedApplicationContext(harness)

    const participantCount = 120
    const participantUsers = Array.from({ length: participantCount }, (_, index) => ({
      id: `participant_${index + 1}`,
      auth0Subject: `auth0|participant_${index + 1}`,
      email: `participant_${index + 1}@example.com`,
      displayName: `Participant ${index + 1}`
    }))
    const participantApplications = Array.from({ length: participantCount }, (_, index) => ({
      id: `application_${index + 1}`,
      eventId: 'event_1',
      userId: `participant_${index + 1}`,
      status: 'submitted' as const,
      submittedAt: `2026-03-${String(28 - Math.floor(index / 10)).padStart(2, '0')}T12:${String(index % 60).padStart(2, '0')}:00.000Z`,
      applicationTermsDocumentId: 'terms_app_2',
      applicationTermsAcceptedAt: '2026-03-22T12:10:00.000Z',
      createdAt: `2026-03-22T12:${String(index % 60).padStart(2, '0')}:00.000Z`,
      updatedAt: `2026-03-22T12:${String(index % 60).padStart(2, '0')}:00.000Z`
    }))
    const participantTeams = Array.from({ length: participantCount }, (_, index) => ({
      id: `team_${index + 1}`,
      eventId: 'event_1',
      name: `Team ${index + 1}`,
      slug: `team-${index + 1}`,
      createdByUserId: `participant_${index + 1}`
    }))
    const participantMemberships = Array.from({ length: participantCount }, (_, index) => ({
      id: `team_member_${index + 1}`,
      teamId: `team_${index + 1}`,
      userId: `participant_${index + 1}`,
      role: 'admin' as const
    }))

    for (let index = 0; index < participantUsers.length; index += 40) {
      await harness.database.insert(users).values(participantUsers.slice(index, index + 40))
    }

    for (let index = 0; index < participantApplications.length; index += 40) {
      await harness.database.insert(userApplications).values(participantApplications.slice(index, index + 40))
    }

    for (let index = 0; index < participantTeams.length; index += 40) {
      await harness.database.insert(teams).values(participantTeams.slice(index, index + 40))
    }

    for (let index = 0; index < participantMemberships.length; index += 40) {
      await harness.database.insert(teamMembers).values(participantMemberships.slice(index, index + 40))
    }

    const usersFindManySpy = vi.spyOn(harness.database.query.users, 'findMany')
    const teamMembersFindManySpy = vi.spyOn(harness.database.query.teamMembers, 'findMany')
    const teamsFindManySpy = vi.spyOn(harness.database.query.teams, 'findMany')
    const submissionsFindManySpy = vi.spyOn(harness.database.query.submissions, 'findMany')
    const response = await harness.request('/api/events/event_1/applications?page=1&page_size=100')

    expect(response.status).toBe(200)
    expect(usersFindManySpy).not.toHaveBeenCalled()
    expect(teamMembersFindManySpy).not.toHaveBeenCalled()
    expect(teamsFindManySpy).not.toHaveBeenCalled()
    expect(submissionsFindManySpy).not.toHaveBeenCalled()
    expect(await response.json()).toMatchObject({
      data: expect.arrayContaining([
        expect.objectContaining({
          id: 'application_1',
          user: expect.objectContaining({
            id: 'participant_1',
            email: 'participant_1@example.com'
          }),
          adminWithdrawal: expect.objectContaining({
            isAllowed: true,
            activeTeamId: 'team_1',
            teamAction: 'dissolve_team'
          })
        }),
        expect.objectContaining({
          id: 'application_100',
          user: expect.objectContaining({
            id: 'participant_100',
            email: 'participant_100@example.com'
          }),
          adminWithdrawal: expect.objectContaining({
            isAllowed: true,
            activeTeamId: 'team_100',
            teamAction: 'dissolve_team'
          })
        })
      ]),
      meta: {
        page: 1,
        pageSize: 100,
        total: participantCount,
        statusCounts: {
          submitted: participantCount,
          approved: 0,
          rejected: 0,
          withdrawn: 0
        }
      }
    })
  })

  test('staging approval toggles off when the same submitted application is approved again', async () => {
    const harness = createApiRouteTestHarness({
      routes: [
        {
          method: 'post',
          path: '/api/events/:eventId/applications/:applicationId/actions/approve',
          handler: approveApplicationHandler
        }
      ],
      sessionUser: {
        sub: 'auth0|event_admin',
        email: 'event-admin@example.com'
      }
    })
    harnesses.push(harness)
    await seedApplicationContext(harness)

    await harness.database.insert(userApplications).values({
      id: 'application_1',
      eventId: 'event_1',
      userId: 'regular_user',
      status: 'submitted',
      submittedAt: '2026-03-22T12:10:00.000Z',
      applicationTermsDocumentId: 'terms_app_2',
      applicationTermsAcceptedAt: '2026-03-22T12:10:00.000Z',
      createdAt: '2026-03-22T12:10:00.000Z',
      updatedAt: '2026-03-22T12:10:00.000Z'
    })

    const firstResponse = await harness.request('/api/events/event_1/applications/application_1/actions/approve', {
      method: 'POST'
    })
    expect(firstResponse.status).toBe(200)
    expect(await firstResponse.json()).toMatchObject({
      data: {
        id: 'application_1',
        preApprovalStatus: 'approved'
      }
    })

    const secondResponse = await harness.request('/api/events/event_1/applications/application_1/actions/approve', {
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
          path: '/api/events/:eventId/applications/:applicationId/actions/reject',
          handler: rejectApplicationHandler
        },
        {
          method: 'post',
          path: '/api/events/:eventId/applications/actions/apply-staged-decisions',
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
      eventId: 'event_1',
      userId: 'regular_user',
      status: 'submitted',
      submittedAt: '2026-03-22T12:10:00.000Z',
      applicationTermsDocumentId: 'terms_app_2',
      applicationTermsAcceptedAt: '2026-03-22T12:10:00.000Z',
      createdAt: '2026-03-22T12:10:00.000Z',
      updatedAt: '2026-03-22T12:10:00.000Z'
    })

    const response = await harness.request('/api/events/event_1/applications/application_1/actions/reject', {
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

    const applyResponse = await harness.request('/api/events/event_1/applications/actions/apply-staged-decisions', {
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

  test('applying staged approval enqueues Luma sync and keeps lumaSyncStatus as not_synced until the worker completes', async () => {
    const reviewEmailQueueProducer = createQueueProducerStub()
    const lumaQueueProducer = createQueueProducerStub()
    const harness = createApiRouteTestHarness({
      routes: [
        {
          method: 'post',
          path: '/api/events/:eventId/applications/:applicationId/actions/approve',
          handler: approveApplicationHandler
        },
        {
          method: 'post',
          path: '/api/events/:eventId/applications/actions/apply-staged-decisions',
          handler: applyStagedDecisionsHandler
        }
      ],
      sessionUser: {
        sub: 'auth0|event_admin',
        email: 'event-admin@example.com'
      },
      cloudflareEnv: {
        APPLICATION_REVIEW_EMAIL_QUEUE: reviewEmailQueueProducer,
        APPLICATION_LUMA_SYNC_QUEUE: lumaQueueProducer
      },
      runtimeConfig: {
        applicationReviewEmails: {
          queueBinding: 'APPLICATION_REVIEW_EMAIL_QUEUE'
        },
        luma: {
          queueBinding: 'APPLICATION_LUMA_SYNC_QUEUE'
        }
      }
    })
    harnesses.push(harness)
    await seedApplicationContext(harness, {
      requireLumaEmail: true,
      lumaEventUrl: 'https://luma.com/codex',
      lumaEventApiId: 'evt-123'
    })

    await harness.database.insert(userApplications).values({
      id: 'application_1',
      eventId: 'event_1',
      userId: 'regular_user',
      status: 'submitted',
      submittedAt: '2026-03-22T12:10:00.000Z',
      applicationTermsDocumentId: 'terms_app_2',
      applicationTermsAcceptedAt: '2026-03-22T12:10:00.000Z',
      createdAt: '2026-03-22T12:10:00.000Z',
      updatedAt: '2026-03-22T12:10:00.000Z'
    })

    const approveResponse = await harness.request('/api/events/event_1/applications/application_1/actions/approve', {
      method: 'POST'
    })
    expect(approveResponse.status).toBe(200)

    const applyResponse = await harness.request('/api/events/event_1/applications/actions/apply-staged-decisions', {
      method: 'POST'
    })
    expect(applyResponse.status).toBe(200)
    expect(await applyResponse.json()).toMatchObject({
      data: {
        appliedCount: 1,
        approvedCount: 1,
        rejectedCount: 0,
        applications: [
          expect.objectContaining({
            id: 'application_1',
            status: 'approved',
            lumaSyncStatus: 'not_synced'
          })
        ]
      }
    })

    expect(reviewEmailQueueProducer.send).toHaveBeenCalledTimes(1)
    expect(lumaQueueProducer.send).toHaveBeenCalledTimes(1)
    expect(lumaQueueProducer.send).toHaveBeenCalledWith(expect.objectContaining({
      applicationId: 'application_1',
      decision: 'approved'
    }), {
      contentType: 'json'
    })

    const storedApplication = await harness.database.query.userApplications.findFirst({
      where: eq(userApplications.id, 'application_1')
    })
    expect(storedApplication?.lumaSyncStatus).toBe('not_synced')

    const auditRows = await harness.database.select().from(auditLogs)
    expect(auditRows).toEqual(expect.arrayContaining([
      expect.objectContaining({
        entityType: 'user_application',
        entityId: 'application_1',
        action: 'user_application.luma_sync_enqueued',
        metadata: expect.objectContaining({
          decision: 'approved',
          enqueue: expect.objectContaining({
            status: 'enqueued'
          })
        })
      })
    ]))
  })

  test('staging rejection toggles off when the same submitted application is rejected again', async () => {
    const harness = createApiRouteTestHarness({
      routes: [
        {
          method: 'post',
          path: '/api/events/:eventId/applications/:applicationId/actions/reject',
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
      eventId: 'event_1',
      userId: 'regular_user',
      status: 'submitted',
      submittedAt: '2026-03-22T12:10:00.000Z',
      applicationTermsDocumentId: 'terms_app_2',
      applicationTermsAcceptedAt: '2026-03-22T12:10:00.000Z',
      createdAt: '2026-03-22T12:10:00.000Z',
      updatedAt: '2026-03-22T12:10:00.000Z'
    })

    const firstResponse = await harness.request('/api/events/event_1/applications/application_1/actions/reject', {
      method: 'POST'
    })
    expect(firstResponse.status).toBe(200)
    expect(await firstResponse.json()).toMatchObject({
      data: {
        id: 'application_1',
        preApprovalStatus: 'rejected'
      }
    })

    const secondResponse = await harness.request('/api/events/event_1/applications/application_1/actions/reject', {
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
          path: '/api/events/:eventId/applications/:applicationId/actions/reject',
          handler: rejectApplicationHandler
        },
        {
          method: 'post',
          path: '/api/events/:eventId/applications/actions/apply-staged-decisions',
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
      eventId: 'event_1',
      userId: 'regular_user',
      status: 'submitted',
      submittedAt: '2026-03-22T12:10:00.000Z',
      applicationTermsDocumentId: 'terms_app_2',
      applicationTermsAcceptedAt: '2026-03-22T12:10:00.000Z',
      createdAt: '2026-03-22T12:10:00.000Z',
      updatedAt: '2026-03-22T12:10:00.000Z'
    })

    const response = await harness.request('/api/events/event_1/applications/application_1/actions/reject', {
      method: 'POST'
    })

    expect(response.status).toBe(200)
    expect(queueProducer.send).toHaveBeenCalledTimes(0)

    const applyResponse = await harness.request('/api/events/event_1/applications/actions/apply-staged-decisions', {
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

  test('applying staged decisions marks Luma sync as failed when the Luma queue binding is unavailable', async () => {
    const reviewEmailQueueProducer = createQueueProducerStub()
    const harness = createApiRouteTestHarness({
      routes: [
        {
          method: 'post',
          path: '/api/events/:eventId/applications/:applicationId/actions/reject',
          handler: rejectApplicationHandler
        },
        {
          method: 'post',
          path: '/api/events/:eventId/applications/actions/apply-staged-decisions',
          handler: applyStagedDecisionsHandler
        }
      ],
      sessionUser: {
        sub: 'auth0|platform_admin',
        email: 'platform-admin@example.com'
      },
      cloudflareEnv: {
        APPLICATION_REVIEW_EMAIL_QUEUE: reviewEmailQueueProducer
      },
      runtimeConfig: {
        applicationReviewEmails: {
          queueBinding: 'APPLICATION_REVIEW_EMAIL_QUEUE'
        },
        luma: {
          queueBinding: 'APPLICATION_LUMA_SYNC_QUEUE'
        }
      }
    })
    harnesses.push(harness)
    await seedApplicationContext(harness, {
      requireLumaEmail: true,
      lumaEventUrl: 'https://luma.com/codex',
      lumaEventApiId: 'evt-123'
    })

    await harness.database.insert(userApplications).values({
      id: 'application_1',
      eventId: 'event_1',
      userId: 'regular_user',
      status: 'submitted',
      submittedAt: '2026-03-22T12:10:00.000Z',
      applicationTermsDocumentId: 'terms_app_2',
      applicationTermsAcceptedAt: '2026-03-22T12:10:00.000Z',
      createdAt: '2026-03-22T12:10:00.000Z',
      updatedAt: '2026-03-22T12:10:00.000Z'
    })

    const rejectResponse = await harness.request('/api/events/event_1/applications/application_1/actions/reject', {
      method: 'POST'
    })
    expect(rejectResponse.status).toBe(200)

    const applyResponse = await harness.request('/api/events/event_1/applications/actions/apply-staged-decisions', {
      method: 'POST'
    })
    expect(applyResponse.status).toBe(200)
    expect(await applyResponse.json()).toMatchObject({
      data: {
        appliedCount: 1,
        approvedCount: 0,
        rejectedCount: 1,
        applications: [
          expect.objectContaining({
            id: 'application_1',
            status: 'rejected',
            lumaSyncStatus: 'reject_failed'
          })
        ]
      }
    })

    const storedApplication = await harness.database.query.userApplications.findFirst({
      where: eq(userApplications.id, 'application_1')
    })
    expect(storedApplication?.lumaSyncStatus).toBe('reject_failed')

    const auditRows = await harness.database.select().from(auditLogs)
    expect(auditRows).toEqual(expect.arrayContaining([
      expect.objectContaining({
        entityType: 'user_application',
        entityId: 'application_1',
        action: 'user_application.luma_sync_enqueued',
        metadata: expect.objectContaining({
          decision: 'rejected',
          enqueue: expect.objectContaining({
            status: 'skipped',
            reason: 'queue_binding_missing:APPLICATION_LUMA_SYNC_QUEUE'
          })
        })
      })
    ]))
  })

  test('event admins can stage rejection for submitted applications', async () => {
    const harness = createApiRouteTestHarness({
      routes: [
        {
          method: 'post',
          path: '/api/events/:eventId/applications/:applicationId/actions/reject',
          handler: rejectApplicationHandler
        }
      ],
      sessionUser: {
        sub: 'auth0|event_admin',
        email: 'event-admin@example.com'
      }
    })
    harnesses.push(harness)
    await seedApplicationContext(harness)

    await harness.database.insert(userApplications).values({
      id: 'application_1',
      eventId: 'event_1',
      userId: 'regular_user',
      status: 'submitted',
      submittedAt: '2026-03-22T12:10:00.000Z',
      applicationTermsDocumentId: 'terms_app_2',
      applicationTermsAcceptedAt: '2026-03-22T12:10:00.000Z',
      createdAt: '2026-03-22T12:10:00.000Z',
      updatedAt: '2026-03-22T12:10:00.000Z'
    })

    const response = await harness.request('/api/events/event_1/applications/application_1/actions/reject', {
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
