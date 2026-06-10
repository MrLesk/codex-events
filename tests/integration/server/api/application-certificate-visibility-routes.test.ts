import { afterEach, describe, expect, test } from 'vitest'
import { eq } from 'drizzle-orm'

import setCertificateVisibilityHandler from '../../../../server/api/events/[eventId]/applications/me/actions/set-certificate-visibility.post'
import {
  auditLogs,
  events,
  userApplications,
  users
} from '../../../../server/database/schema'
import { createApiRouteTestHarness } from '../../../support/backend/api-route'

const visibilityPath = '/api/events/event_1/applications/me/actions/set-certificate-visibility'

async function seedVisibilityContext(
  harness: ReturnType<typeof createApiRouteTestHarness>,
  options?: {
    applicationStatus?: typeof userApplications.$inferInsert['status']
    withApplication?: boolean
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
    submissionOpensAt: '2026-06-20T07:00:00.000Z',
    submissionClosesAt: '2026-06-20T19:00:00.000Z',
    state: 'registration_open',
    maxTeamMembers: 1,
    createdByUserId: 'platform_admin'
  })

  if (options?.withApplication ?? true) {
    await harness.database.insert(userApplications).values({
      id: 'application_1',
      eventId: 'event_1',
      userId: 'participant_user',
      status: options?.applicationStatus ?? 'approved',
      checkedInAt: '2026-06-20T08:05:00.000Z'
    })
  }
}

describe('application certificate visibility routes', () => {
  const harnesses: Array<ReturnType<typeof createApiRouteTestHarness>> = []

  afterEach(async () => {
    while (harnesses.length > 0) {
      await harnesses.pop()?.d1Database.close()
    }
  })

  function createHarness(sessionUser: { sub: string, email?: string } | null) {
    const harness = createApiRouteTestHarness({
      routes: [
        { method: 'post', path: '/api/events/:eventId/applications/me/actions/set-certificate-visibility', handler: setCertificateVisibilityHandler }
      ],
      sessionUser
    })
    harnesses.push(harness)
    return harness
  }

  test('requires an authenticated platform account', async () => {
    const harness = createHarness(null)
    await seedVisibilityContext(harness)

    const response = await harness.request(visibilityPath, {
      method: 'POST',
      body: JSON.stringify({ hidden: true })
    })

    expect(response.status).toBe(401)
  })

  test('returns 404 when the caller has no application for the event', async () => {
    const harness = createHarness({ sub: 'auth0|participant_user', email: 'participant@example.com' })
    await seedVisibilityContext(harness, { withApplication: false })

    const response = await harness.request(visibilityPath, {
      method: 'POST',
      body: JSON.stringify({ hidden: true })
    })

    expect(response.status).toBe(404)
  })

  test('rejects visibility changes for applications that are not approved', async () => {
    const harness = createHarness({ sub: 'auth0|participant_user', email: 'participant@example.com' })
    await seedVisibilityContext(harness, { applicationStatus: 'submitted' })

    const response = await harness.request(visibilityPath, {
      method: 'POST',
      body: JSON.stringify({ hidden: true })
    })

    expect(response.status).toBe(409)
  })

  test('participant hides and re-publishes the own certificate with audit logging', async () => {
    const harness = createHarness({ sub: 'auth0|participant_user', email: 'participant@example.com' })
    await seedVisibilityContext(harness)

    const hideResponse = await harness.request(visibilityPath, {
      method: 'POST',
      body: JSON.stringify({ hidden: true })
    })

    expect(hideResponse.status).toBe(200)
    const hiddenPayload = await hideResponse.json() as { data: { certificateHiddenAt: string | null } }
    expect(hiddenPayload.data.certificateHiddenAt).not.toBeNull()

    const publishResponse = await harness.request(visibilityPath, {
      method: 'POST',
      body: JSON.stringify({ hidden: false })
    })

    expect(publishResponse.status).toBe(200)
    const publishedPayload = await publishResponse.json() as { data: { certificateHiddenAt: string | null } }
    expect(publishedPayload.data.certificateHiddenAt).toBeNull()

    const stored = await harness.database.query.userApplications.findFirst({
      where: eq(userApplications.id, 'application_1')
    })
    expect(stored?.certificateHiddenAt).toBeNull()

    const auditEntries = await harness.database.query.auditLogs.findMany({
      where: eq(auditLogs.entityId, 'application_1')
    })
    expect(auditEntries.map(entry => entry.action)).toEqual([
      'user_application.certificate_hidden',
      'user_application.certificate_published'
    ])
  })
})
