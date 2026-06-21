import { afterEach, describe, expect, test, vi } from 'vitest'
import { asc, eq } from 'drizzle-orm'

import sendCertificateEmailsHandler from '../../../../server/api/events/[eventId]/applications/actions/send-certificate-emails.post'
import {
  auditLogs,
  eventRoleAssignments,
  events,
  userApplications,
  users
} from '../../../../server/database/schema'
import { createApiRouteTestHarness } from '../../../support/backend/api-route'

const sendCertificateEmailsPath = '/api/events/event_1/applications/actions/send-certificate-emails'

async function seedCertificateEmailContext(
  harness: ReturnType<typeof createApiRouteTestHarness>
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
      id: 'regular_user',
      auth0Subject: 'auth0|regular_user',
      email: 'regular@example.com',
      displayName: 'Regular User'
    },
    {
      id: 'participant_1',
      auth0Subject: 'auth0|participant_1',
      email: 'participant-1@example.com',
      displayName: 'Participant One'
    },
    {
      id: 'participant_2',
      auth0Subject: 'auth0|participant_2',
      email: 'participant-2@example.com',
      displayName: 'Participant Two'
    },
    {
      id: 'participant_3',
      auth0Subject: 'auth0|participant_3',
      email: 'participant-3@example.com',
      displayName: 'Participant Three'
    },
    {
      id: 'participant_4',
      auth0Subject: 'auth0|participant_4',
      email: 'participant-4@example.com',
      displayName: 'Participant Four'
    },
    {
      id: 'participant_5',
      auth0Subject: 'auth0|participant_5',
      email: 'participant-5@example.com',
      displayName: 'Participant Five'
    },
    {
      id: 'staff_user',
      auth0Subject: 'auth0|staff_user',
      email: 'staff@example.com',
      displayName: 'Staff User'
    }
  ])

  await harness.database.insert(events).values({
    id: 'event_1',
    eventType: 'build',
    name: 'Codex Build Vienna',
    slug: 'codex-build-vienna',
    description: 'Fixture event',
    city: 'Vienna',
    country: 'Austria',
    address: 'Fixture Address',
    registrationOpensAt: '2026-05-20T10:00:00.000Z',
    registrationClosesAt: '2026-06-18T22:00:00.000Z',
    submissionOpensAt: null,
    submissionClosesAt: null,
    state: 'registration_open',
    maxTeamMembers: 1,
    createdByUserId: 'platform_admin'
  })

  await harness.database.insert(eventRoleAssignments).values([
    {
      id: 'role_event_admin',
      eventId: 'event_1',
      userId: 'event_admin',
      role: 'event_admin',
      isInJudgePool: false,
      isStaff: false
    },
    {
      id: 'role_staff',
      eventId: 'event_1',
      userId: 'staff_user',
      role: 'staff',
      isInJudgePool: false,
      isStaff: true
    }
  ])

  await harness.database.insert(userApplications).values([
    {
      id: 'application_1',
      eventId: 'event_1',
      userId: 'participant_1',
      status: 'approved',
      checkedInAt: '2026-06-20T08:05:00.000Z'
    },
    {
      id: 'application_2',
      eventId: 'event_1',
      userId: 'participant_2',
      status: 'approved'
    },
    {
      id: 'application_3',
      eventId: 'event_1',
      userId: 'participant_3',
      status: 'approved',
      checkedInAt: '2026-06-20T08:06:00.000Z',
      certificateEmailQueuedAt: '2026-06-21T08:00:00.000Z',
      certificateEmailQueuedByUserId: 'event_admin'
    },
    {
      id: 'application_4',
      eventId: 'event_1',
      userId: 'participant_4',
      status: 'approved',
      checkedInAt: '2026-06-20T08:07:00.000Z',
      certificateEmailQueuedAt: '2026-06-21T08:00:00.000Z',
      certificateEmailQueuedByUserId: 'event_admin',
      certificateEmailSentAt: '2026-06-21T08:05:00.000Z'
    },
    {
      id: 'application_5',
      eventId: 'event_1',
      userId: 'participant_5',
      status: 'approved',
      checkedInAt: '2026-06-20T08:08:00.000Z',
      certificateRevokedAt: '2026-06-21T08:00:00.000Z',
      certificateRevokedByUserId: 'event_admin'
    },
    {
      id: 'application_staff',
      eventId: 'event_1',
      userId: 'staff_user',
      status: 'approved',
      checkedInAt: '2026-06-20T08:09:00.000Z'
    }
  ])
}

describe('application certificate email routes', () => {
  const harnesses: Array<ReturnType<typeof createApiRouteTestHarness>> = []

  afterEach(async () => {
    while (harnesses.length > 0) {
      await harnesses.pop()?.d1Database.close()
    }
  })

  function createHarness(
    sessionUser: { sub: string, email?: string } | null,
    send = vi.fn(async () => undefined)
  ) {
    const harness = createApiRouteTestHarness({
      routes: [
        { method: 'post', path: '/api/events/:eventId/applications/actions/send-certificate-emails', handler: sendCertificateEmailsHandler }
      ],
      sessionUser,
      cloudflareEnv: {
        EVENT_OUTCOME_EMAIL_QUEUE: { send }
      },
      runtimeConfig: {
        auth0: {
          appBaseUrl: 'https://events.example'
        }
      }
    })
    harnesses.push(harness)
    return { harness, send }
  }

  test('rejects anonymous and non-admin callers', async () => {
    const { harness: anonymousHarness } = createHarness(null)
    await seedCertificateEmailContext(anonymousHarness)

    const anonymousResponse = await anonymousHarness.request(sendCertificateEmailsPath, {
      method: 'POST'
    })

    expect(anonymousResponse.status).toBe(401)

    const { harness: regularHarness } = createHarness({ sub: 'auth0|regular_user', email: 'regular@example.com' })
    await seedCertificateEmailContext(regularHarness)

    const regularResponse = await regularHarness.request(sendCertificateEmailsPath, {
      method: 'POST'
    })

    expect(regularResponse.status).toBe(403)
  })

  test('event admin can rerun certificate email sends for newly eligible participants only', async () => {
    const { harness, send } = createHarness({ sub: 'auth0|event_admin', email: 'event-admin@example.com' })
    await seedCertificateEmailContext(harness)

    const firstResponse = await harness.request(sendCertificateEmailsPath, {
      method: 'POST'
    })

    expect(firstResponse.status).toBe(200)
    const firstPayload = await firstResponse.json() as { data: { enqueuedCount: number, applications: Array<{ id: string, certificateEmailQueuedAt: string | null }> } }
    expect(firstPayload.data.enqueuedCount).toBe(1)
    expect(firstPayload.data.applications.map(application => application.id)).toEqual(['application_1'])
    expect(firstPayload.data.applications[0]?.certificateEmailQueuedAt).not.toBeNull()
    expect(send).toHaveBeenCalledTimes(1)
    expect(send.mock.calls[0]?.[0]).toEqual(expect.objectContaining({
      notificationType: 'certificate',
      applicationId: 'application_1',
      recipientEmail: 'participant-1@example.com',
      certificateUrl: 'https://events.example/events/codex-build-vienna/participant_1'
    }))

    const secondResponse = await harness.request(sendCertificateEmailsPath, {
      method: 'POST'
    })

    expect(secondResponse.status).toBe(200)
    const secondPayload = await secondResponse.json() as { data: { enqueuedCount: number } }
    expect(secondPayload.data.enqueuedCount).toBe(0)
    expect(send).toHaveBeenCalledTimes(1)

    await harness.database
      .update(userApplications)
      .set({
        checkInOverrideStatus: 'joined',
        checkInOverrideAt: '2026-06-21T09:00:00.000Z',
        checkInOverrideByUserId: 'event_admin'
      })
      .where(eq(userApplications.id, 'application_2'))

    const thirdResponse = await harness.request(sendCertificateEmailsPath, {
      method: 'POST'
    })

    expect(thirdResponse.status).toBe(200)
    const thirdPayload = await thirdResponse.json() as { data: { enqueuedCount: number, applications: Array<{ id: string }> } }
    expect(thirdPayload.data.enqueuedCount).toBe(1)
    expect(thirdPayload.data.applications.map(application => application.id)).toEqual(['application_2'])
    expect(send).toHaveBeenCalledTimes(2)
    expect(send.mock.calls[1]?.[0]).toEqual(expect.objectContaining({
      notificationType: 'certificate',
      applicationId: 'application_2',
      recipientEmail: 'participant-2@example.com'
    }))

    const storedApplications = await harness.database.query.userApplications.findMany({
      orderBy: [asc(userApplications.id)]
    })
    const storedQueuedApplications = storedApplications
      .filter(application => Boolean(application.certificateEmailQueuedAt))
      .map(application => application.id)

    expect(storedQueuedApplications).toEqual([
      'application_1',
      'application_2',
      'application_3',
      'application_4'
    ])

    const auditEntries = await harness.database.query.auditLogs.findMany({
      where: eq(auditLogs.action, 'event.certificate_emails_enqueued')
    })
    expect(auditEntries).toHaveLength(3)
  })
})
