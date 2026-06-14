import { afterEach, describe, expect, test } from 'vitest'
import { eq } from 'drizzle-orm'

import setCertificateRevocationHandler from '../../../../server/api/events/[eventId]/applications/[applicationId]/actions/set-certificate-revocation.post'
import {
  auditLogs,
  eventRoleAssignments,
  events,
  userApplications,
  users
} from '../../../../server/database/schema'
import { createApiRouteTestHarness } from '../../../support/backend/api-route'

const revocationPath = '/api/events/event_1/applications/application_1/actions/set-certificate-revocation'

async function seedRevocationContext(
  harness: ReturnType<typeof createApiRouteTestHarness>,
  options?: {
    applicationStatus?: typeof userApplications.$inferInsert['status']
    checkedInAt?: string | null
    certificateHiddenAt?: string | null
    certificateRevokedAt?: string | null
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
      id: 'regular_user',
      auth0Subject: 'auth0|regular_user',
      email: 'regular@example.com',
      displayName: 'Regular User'
    },
    {
      id: 'participant_user',
      auth0Subject: 'auth0|participant_user',
      email: 'participant@example.com',
      displayName: 'Participant User'
    }
  ])

  await harness.database.insert(events).values({
    id: 'event_1',
    eventType: 'build',
    name: 'Fixture Event',
    slug: 'fixture-event',
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

  await harness.database.insert(eventRoleAssignments).values({
    id: 'role_event_admin',
    eventId: 'event_1',
    userId: 'event_admin',
    role: 'event_admin',
    isInJudgePool: false,
    isStaff: false
  })

  await harness.database.insert(userApplications).values({
    id: 'application_1',
    eventId: 'event_1',
    userId: 'participant_user',
    status: options?.applicationStatus ?? 'approved',
    checkedInAt: options?.checkedInAt === undefined ? '2026-06-20T08:05:00.000Z' : options.checkedInAt,
    certificateHiddenAt: options?.certificateHiddenAt ?? null,
    certificateRevokedAt: options?.certificateRevokedAt ?? null,
    certificateRevokedByUserId: options?.certificateRevokedAt ? 'event_admin' : null
  })
}

describe('application certificate revocation routes', () => {
  const harnesses: Array<ReturnType<typeof createApiRouteTestHarness>> = []

  afterEach(async () => {
    while (harnesses.length > 0) {
      await harnesses.pop()?.d1Database.close()
    }
  })

  function createHarness(sessionUser: { sub: string, email?: string } | null) {
    const harness = createApiRouteTestHarness({
      routes: [
        { method: 'post', path: '/api/events/:eventId/applications/:applicationId/actions/set-certificate-revocation', handler: setCertificateRevocationHandler }
      ],
      sessionUser
    })
    harnesses.push(harness)
    return harness
  }

  test('rejects anonymous and non-admin callers', async () => {
    const anonymousHarness = createHarness(null)
    await seedRevocationContext(anonymousHarness)

    const anonymousResponse = await anonymousHarness.request(revocationPath, {
      method: 'POST',
      body: JSON.stringify({ revoked: true })
    })

    expect(anonymousResponse.status).toBe(401)

    const regularHarness = createHarness({ sub: 'auth0|regular_user', email: 'regular@example.com' })
    await seedRevocationContext(regularHarness)

    const regularResponse = await regularHarness.request(revocationPath, {
      method: 'POST',
      body: JSON.stringify({ revoked: true })
    })

    expect(regularResponse.status).toBe(403)
  })

  test('event admin revokes a currently available certificate', async () => {
    const harness = createHarness({ sub: 'auth0|event_admin', email: 'event-admin@example.com' })
    await seedRevocationContext(harness)

    const response = await harness.request(revocationPath, {
      method: 'POST',
      body: JSON.stringify({ revoked: true })
    })

    expect(response.status).toBe(200)
    const payload = await response.json() as { data: { certificateRevokedAt: string | null } }
    expect(payload.data.certificateRevokedAt).not.toBeNull()

    const stored = await harness.database.query.userApplications.findFirst({
      where: eq(userApplications.id, 'application_1')
    })
    expect(stored?.certificateRevokedAt).toBe(payload.data.certificateRevokedAt)
    expect(stored?.certificateRevokedByUserId).toBe('event_admin')

    const auditEntries = await harness.database.query.auditLogs.findMany({
      where: eq(auditLogs.entityId, 'application_1')
    })
    expect(auditEntries.map(entry => entry.action)).toEqual([
      'user_application.certificate_revoked'
    ])
  })

  test('platform admin restores a revoked certificate', async () => {
    const harness = createHarness({ sub: 'auth0|platform_admin', email: 'platform-admin@example.com' })
    await seedRevocationContext(harness, { certificateRevokedAt: '2026-06-21T08:00:00.000Z' })

    const response = await harness.request(revocationPath, {
      method: 'POST',
      body: JSON.stringify({ revoked: false })
    })

    expect(response.status).toBe(200)
    const payload = await response.json() as { data: { certificateRevokedAt: string | null } }
    expect(payload.data.certificateRevokedAt).toBeNull()

    const stored = await harness.database.query.userApplications.findFirst({
      where: eq(userApplications.id, 'application_1')
    })
    expect(stored?.certificateRevokedAt).toBeNull()
    expect(stored?.certificateRevokedByUserId).toBeNull()

    const auditEntries = await harness.database.query.auditLogs.findMany({
      where: eq(auditLogs.entityId, 'application_1')
    })
    expect(auditEntries.map(entry => entry.action)).toEqual([
      'user_application.certificate_restored'
    ])
  })

  test('rejects revocation when the certificate is not currently available', async () => {
    const notCheckedInHarness = createHarness({ sub: 'auth0|event_admin', email: 'event-admin@example.com' })
    await seedRevocationContext(notCheckedInHarness, { checkedInAt: null })

    const notCheckedInResponse = await notCheckedInHarness.request(revocationPath, {
      method: 'POST',
      body: JSON.stringify({ revoked: true })
    })
    expect(notCheckedInResponse.status).toBe(409)

    const hiddenHarness = createHarness({ sub: 'auth0|event_admin', email: 'event-admin@example.com' })
    await seedRevocationContext(hiddenHarness, { certificateHiddenAt: '2026-06-21T08:00:00.000Z' })

    const hiddenResponse = await hiddenHarness.request(revocationPath, {
      method: 'POST',
      body: JSON.stringify({ revoked: true })
    })
    expect(hiddenResponse.status).toBe(409)
  })

  test('rejects revocation changes for applications that are not approved', async () => {
    const harness = createHarness({ sub: 'auth0|event_admin', email: 'event-admin@example.com' })
    await seedRevocationContext(harness, { applicationStatus: 'submitted' })

    const response = await harness.request(revocationPath, {
      method: 'POST',
      body: JSON.stringify({ revoked: true })
    })

    expect(response.status).toBe(409)
  })
})
