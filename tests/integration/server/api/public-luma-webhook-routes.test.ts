import { afterEach, describe, expect, test, vi } from 'vitest'
import { eq } from 'drizzle-orm'

import lumaWebhooksPostHandler from '../../../../server/api/public/events/[slug]/luma/webhooks.post'
import {
  auditLogs,
  events,
  eventTermsDocuments,
  teamJoinRequests,
  teamMembers,
  teams,
  userApplications,
  users
} from '../../../../server/database/schema'
import { buildLumaWebhookSignatureHeader } from '../../../../server/domains/applications/luma-webhooks'
import { createApiRouteTestHarness } from '../../../support/backend/api-route'

async function seedAttendanceContext(
  harness: ReturnType<typeof createApiRouteTestHarness>,
  options?: {
    applicationStatus?: typeof userApplications.$inferInsert['status']
    checkedInAt?: string | null
    lumaEmail?: string
    eventApiId?: string
  }
) {
  const applicationStatus = options?.applicationStatus ?? 'approved'

  await harness.database.insert(users).values([
    {
      id: 'platform_admin',
      auth0Subject: 'auth0|platform_admin',
      email: 'platform-admin@example.com',
      displayName: 'Platform Admin',
      isPlatformAdmin: true
    },
    {
      id: 'participant_user',
      auth0Subject: 'auth0|participant_user',
      email: 'participant@example.com',
      displayName: 'Participant User',
      lumaEmail: options?.lumaEmail ?? 'guest@example.com'
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
    registrationOpensAt: '2026-03-20T12:00:00.000Z',
    registrationClosesAt: '2026-03-23T12:00:00.000Z',
    submissionOpensAt: '2026-03-23T12:00:00.000Z',
    submissionClosesAt: '2026-03-25T12:00:00.000Z',
    state: 'registration_open',
    maxTeamMembers: 5,
    applicationLumaEmailVisible: true,
    requireLumaEmail: true,
    lumaEventApiId: options?.eventApiId ?? 'evt-123',
    lumaApiKey: 'luma_test_key',
    lumaWebhookSecret: 'whsec_test',
    lumaWebhookStatus: 'configured',
    createdByUserId: 'platform_admin'
  })

  await harness.database.insert(eventTermsDocuments).values({
    id: 'terms_1',
    eventId: 'event_1',
    documentType: 'application_terms',
    version: 1,
    title: 'Application Terms',
    content: 'Application Terms',
    publishedAt: '2026-03-01T00:00:00.000Z'
  })

  await harness.database.insert(userApplications).values({
    id: 'application_1',
    eventId: 'event_1',
    userId: 'participant_user',
    status: applicationStatus,
    checkedInAt: options?.checkedInAt ?? null,
    submittedAt: '2026-03-22T12:10:00.000Z',
    reviewedAt: applicationStatus === 'approved' ? '2026-03-22T12:30:00.000Z' : null,
    reviewedByUserId: applicationStatus === 'approved' ? 'platform_admin' : null,
    applicationTermsDocumentId: 'terms_1',
    applicationTermsAcceptedAt: '2026-03-22T12:10:00.000Z',
    registrationDetailsJson: '{}',
    createdAt: '2026-03-22T12:10:00.000Z',
    updatedAt: '2026-03-22T12:10:00.000Z'
  })
}

async function buildSignedHeaders(rawBody: string) {
  const timestamp = String(Math.floor(Date.now() / 1000))
  const signature = await buildLumaWebhookSignatureHeader('whsec_test', timestamp, rawBody)

  return {
    'content-type': 'application/json',
    'webhook-id': 'whmsg_123',
    'webhook-signature': signature
  }
}

function createQueueProducerStub() {
  return {
    send: vi.fn(async () => {})
  }
}

describe('public Luma webhook routes', () => {
  const harnesses: Array<ReturnType<typeof createApiRouteTestHarness>> = []
  const webhookPath = '/api/public/events/event_1/luma/webhooks'

  afterEach(async () => {
    while (harnesses.length > 0) {
      await harnesses.pop()?.d1Database.close()
    }
  })

  test('marks an approved participant as attended exactly once', async () => {
    const harness = createApiRouteTestHarness({
      routes: [
        { method: 'post', path: '/api/public/events/:slug/luma/webhooks', handler: lumaWebhooksPostHandler }
      ]
    })
    harnesses.push(harness)
    await seedAttendanceContext(harness)

    const rawBody = JSON.stringify({
      type: 'guest.updated',
      data: {
        event_id: 'evt-123',
        guest: {
          api_id: 'gst-123',
          user_email: 'guest@example.com',
          checked_in_at: '2026-04-13T17:30:00.000Z'
        }
      }
    })
    const headers = await buildSignedHeaders(rawBody)

    const firstResponse = await harness.request(webhookPath, {
      method: 'POST',
      headers,
      body: rawBody
    })
    const secondResponse = await harness.request(webhookPath, {
      method: 'POST',
      headers,
      body: rawBody
    })

    expect(firstResponse.status).toBe(200)
    expect(await firstResponse.json()).toEqual({
      data: {
        status: 'acknowledged'
      }
    })
    expect(secondResponse.status).toBe(200)

    const storedApplication = await harness.database.query.userApplications.findFirst({
      where: eq(userApplications.id, 'application_1')
    })
    const storedAuditRows = await harness.database.select().from(auditLogs)

    expect(storedApplication?.checkedInAt).toBe('2026-04-13T17:30:00.000Z')
    expect(storedAuditRows).toEqual([
      expect.objectContaining({
        actorUserId: null,
        entityType: 'user_application',
        entityId: 'application_1',
        action: 'user_application.luma_check_in_recorded',
        metadata: expect.objectContaining({
          eventId: 'event_1',
          eventApiId: 'evt-123',
          guestId: 'gst-123',
          guestEmail: 'guest@example.com',
          checkedInAt: '2026-04-13T17:30:00.000Z',
          webhookId: 'whmsg_123'
        })
      })
    ])
  })

  test('withdraws a matching participant when Luma guest is declined', async () => {
    const lumaQueueProducer = createQueueProducerStub()
    const harness = createApiRouteTestHarness({
      routes: [
        { method: 'post', path: '/api/public/events/:slug/luma/webhooks', handler: lumaWebhooksPostHandler }
      ],
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
    await seedAttendanceContext(harness)

    await harness.database.insert(teams).values({
      id: 'team_1',
      eventId: 'event_1',
      name: 'Solo Team',
      slug: 'solo-team',
      isOpenToJoinRequests: true,
      createdByUserId: 'participant_user',
      createdAt: '2026-03-22T12:30:00.000Z',
      updatedAt: '2026-03-22T12:30:00.000Z'
    })
    await harness.database.insert(teamMembers).values({
      id: 'team_member_participant',
      teamId: 'team_1',
      userId: 'participant_user',
      role: 'admin',
      joinedAt: '2026-03-22T12:30:00.000Z',
      leftAt: null,
      createdAt: '2026-03-22T12:30:00.000Z'
    })
    await harness.database.insert(teamJoinRequests).values({
      id: 'team_join_request_1',
      teamId: 'team_1',
      userId: 'platform_admin',
      status: 'pending',
      requestedAt: '2026-03-22T12:35:00.000Z',
      reviewedAt: null,
      reviewedByUserId: null,
      createdAt: '2026-03-22T12:35:00.000Z'
    })

    const rawBody = JSON.stringify({
      type: 'guest.updated',
      data: {
        event_id: 'evt-123',
        guest: {
          api_id: 'gst-123',
          user_email: 'guest@example.com',
          approval_status: 'declined'
        }
      }
    })
    const response = await harness.request(webhookPath, {
      method: 'POST',
      headers: await buildSignedHeaders(rawBody),
      body: rawBody
    })

    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({
      data: {
        status: 'acknowledged'
      }
    })

    const storedApplication = await harness.database.query.userApplications.findFirst({
      where: eq(userApplications.id, 'application_1')
    })
    const dissolvedMembership = await harness.database.query.teamMembers.findFirst({
      where: eq(teamMembers.id, 'team_member_participant')
    })
    const updatedTeam = await harness.database.query.teams.findFirst({
      where: eq(teams.id, 'team_1')
    })
    const closedJoinRequest = await harness.database.query.teamJoinRequests.findFirst({
      where: eq(teamJoinRequests.id, 'team_join_request_1')
    })

    expect(storedApplication).toMatchObject({
      status: 'withdrawn',
      lumaSyncStatus: 'not_synced',
      checkedInAt: null,
      withdrawnAt: expect.any(String)
    })
    expect(dissolvedMembership?.leftAt).toBeTruthy()
    expect(updatedTeam).toMatchObject({
      isOpenToJoinRequests: false
    })
    expect(closedJoinRequest).toMatchObject({
      status: 'rejected',
      reviewedByUserId: null
    })
    expect(lumaQueueProducer.send).toHaveBeenCalledWith(expect.objectContaining({
      applicationId: 'application_1',
      decision: 'rejected'
    }), {
      contentType: 'json'
    })

    const auditRows = await harness.database.select().from(auditLogs)
    expect(auditRows).toEqual(expect.arrayContaining([
      expect.objectContaining({
        actorUserId: null,
        entityType: 'user_application',
        entityId: 'application_1',
        action: 'user_application.luma_withdrawn',
        metadata: expect.objectContaining({
          eventId: 'event_1',
          userId: 'participant_user',
          previousStatus: 'approved',
          nextStatus: 'withdrawn',
          teamAction: 'dissolve_team',
          trigger: 'luma_cancellation'
        })
      }),
      expect.objectContaining({
        actorUserId: null,
        entityType: 'team_member',
        entityId: 'team_member_participant',
        action: 'team_member.removed',
        metadata: expect.objectContaining({
          eventId: 'event_1',
          teamId: 'team_1',
          trigger: 'luma_cancellation'
        })
      }),
      expect.objectContaining({
        actorUserId: null,
        entityType: 'user_application',
        entityId: 'application_1',
        action: 'user_application.luma_sync_enqueued',
        metadata: expect.objectContaining({
          decision: 'rejected',
          trigger: 'luma_cancellation'
        })
      })
    ]))
  })

  test('returns 200 without mutation for a valid signed delivery from an unknown event', async () => {
    const harness = createApiRouteTestHarness({
      routes: [
        { method: 'post', path: '/api/public/events/:slug/luma/webhooks', handler: lumaWebhooksPostHandler }
      ]
    })
    harnesses.push(harness)
    await seedAttendanceContext(harness, {
      eventApiId: 'evt-known'
    })

    const rawBody = JSON.stringify({
      type: 'guest.updated',
      data: {
        event_id: 'evt-unknown',
        guest: {
          user_email: 'guest@example.com',
          approval_status: 'declined',
          checked_in_at: '2026-04-13T17:30:00.000Z'
        }
      }
    })
    const response = await harness.request(webhookPath, {
      method: 'POST',
      headers: await buildSignedHeaders(rawBody),
      body: rawBody
    })

    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({
      data: {
        status: 'acknowledged'
      }
    })

    const storedApplication = await harness.database.query.userApplications.findFirst({
      where: eq(userApplications.id, 'application_1')
    })

    expect(storedApplication?.checkedInAt).toBeNull()
    expect(await harness.database.select().from(auditLogs)).toEqual([])
  })

  test('returns 200 without mutation for an unmatched participant or a non-approved application', async () => {
    const harness = createApiRouteTestHarness({
      routes: [
        { method: 'post', path: '/api/public/events/:slug/luma/webhooks', handler: lumaWebhooksPostHandler }
      ]
    })
    harnesses.push(harness)
    await seedAttendanceContext(harness, {
      applicationStatus: 'submitted'
    })

    const unmatchedBody = JSON.stringify({
      type: 'guest.updated',
      data: {
        event_id: 'evt-123',
        guest: {
          user_email: 'missing@example.com',
          checked_in_at: '2026-04-13T17:30:00.000Z'
        }
      }
    })
    const nonApprovedBody = JSON.stringify({
      type: 'guest.updated',
      data: {
        event_id: 'evt-123',
        guest: {
          user_email: 'guest@example.com',
          checked_in_at: '2026-04-13T17:30:00.000Z'
        }
      }
    })

    const unmatchedResponse = await harness.request(webhookPath, {
      method: 'POST',
      headers: await buildSignedHeaders(unmatchedBody),
      body: unmatchedBody
    })
    const nonApprovedResponse = await harness.request(webhookPath, {
      method: 'POST',
      headers: await buildSignedHeaders(nonApprovedBody),
      body: nonApprovedBody
    })

    expect(unmatchedResponse.status).toBe(200)
    expect(nonApprovedResponse.status).toBe(200)

    const storedApplication = await harness.database.query.userApplications.findFirst({
      where: eq(userApplications.id, 'application_1')
    })

    expect(storedApplication?.checkedInAt).toBeNull()
    expect(await harness.database.select().from(auditLogs)).toEqual([])
  })

  test('returns 200 without mutation when Luma declines an application that cannot be withdrawn', async () => {
    const lumaQueueProducer = createQueueProducerStub()
    const harness = createApiRouteTestHarness({
      routes: [
        { method: 'post', path: '/api/public/events/:slug/luma/webhooks', handler: lumaWebhooksPostHandler }
      ],
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
    await seedAttendanceContext(harness, {
      applicationStatus: 'rejected'
    })

    const rawBody = JSON.stringify({
      type: 'guest.updated',
      data: {
        event_id: 'evt-123',
        guest: {
          user_email: 'guest@example.com',
          approval_status: 'declined'
        }
      }
    })
    const response = await harness.request(webhookPath, {
      method: 'POST',
      headers: await buildSignedHeaders(rawBody),
      body: rawBody
    })

    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({
      data: {
        status: 'acknowledged'
      }
    })

    const storedApplication = await harness.database.query.userApplications.findFirst({
      where: eq(userApplications.id, 'application_1')
    })

    expect(storedApplication).toMatchObject({
      status: 'rejected',
      withdrawnAt: null
    })
    expect(lumaQueueProducer.send).not.toHaveBeenCalled()
    expect(await harness.database.select().from(auditLogs)).toEqual([])
  })

  test('ignores later non-check-in guest updates after attendance is set', async () => {
    const harness = createApiRouteTestHarness({
      routes: [
        { method: 'post', path: '/api/public/events/:slug/luma/webhooks', handler: lumaWebhooksPostHandler }
      ]
    })
    harnesses.push(harness)
    await seedAttendanceContext(harness, {
      checkedInAt: '2026-04-13T17:30:00.000Z'
    })

    const rawBody = JSON.stringify({
      type: 'guest.updated',
      data: {
        event_id: 'evt-123',
        guest: {
          user_email: 'guest@example.com',
          approval_status: 'approved',
          checked_in_at: null
        }
      }
    })
    const response = await harness.request(webhookPath, {
      method: 'POST',
      headers: await buildSignedHeaders(rawBody),
      body: rawBody
    })

    expect(response.status).toBe(200)

    const storedApplication = await harness.database.query.userApplications.findFirst({
      where: eq(userApplications.id, 'application_1')
    })

    expect(storedApplication?.checkedInAt).toBe('2026-04-13T17:30:00.000Z')
    expect(await harness.database.select().from(auditLogs)).toEqual([])
  })

  test('rejects invalid signatures', async () => {
    const harness = createApiRouteTestHarness({
      routes: [
        { method: 'post', path: '/api/public/events/:slug/luma/webhooks', handler: lumaWebhooksPostHandler }
      ]
    })
    harnesses.push(harness)
    await seedAttendanceContext(harness)

    const rawBody = JSON.stringify({
      type: 'guest.updated',
      data: {
        event_id: 'evt-123',
        guest: {
          user_email: 'guest@example.com',
          checked_in_at: '2026-04-13T17:30:00.000Z'
        }
      }
    })
    const response = await harness.request(webhookPath, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'webhook-signature': `t=${Math.floor(Date.now() / 1000)},v1=deadbeef`
      },
      body: rawBody
    })

    expect(response.status).toBe(401)
    expect(await response.json()).toEqual({
      error: {
        code: 'luma_webhook_signature_invalid',
        message: 'The Luma webhook signature is invalid.'
      }
    })

    const storedApplication = await harness.database.query.userApplications.findFirst({
      where: eq(userApplications.id, 'application_1')
    })

    expect(storedApplication?.checkedInAt).toBeNull()
  })
})
