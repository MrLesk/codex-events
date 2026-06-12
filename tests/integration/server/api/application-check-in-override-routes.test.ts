import { afterEach, describe, expect, test } from 'vitest'
import { eq } from 'drizzle-orm'

import overrideCheckInHandler from '../../../../server/api/events/[eventId]/applications/[applicationId]/actions/override-check-in.post'
import {
  auditLogs,
  eventRoleAssignments,
  events,
  userApplications,
  users
} from '../../../../server/database/schema'
import { createApiRouteTestHarness } from '../../../support/backend/api-route'

const overridePath = '/api/events/event_1/applications/application_1/actions/override-check-in'

async function seedOverrideContext(
  harness: ReturnType<typeof createApiRouteTestHarness>,
  options?: {
    applicationStatus?: typeof userApplications.$inferInsert['status']
    checkedInAt?: string | null
    checkInOverrideStatus?: 'joined' | 'not_joined' | null
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
    checkedInAt: options?.checkedInAt ?? null,
    checkInOverrideStatus: options?.checkInOverrideStatus ?? null,
    checkInOverrideAt: options?.checkInOverrideStatus ? '2026-06-20T09:00:00.000Z' : null,
    checkInOverrideByUserId: options?.checkInOverrideStatus ? 'event_admin' : null
  })
}

describe('application check-in override routes', () => {
  const harnesses: Array<ReturnType<typeof createApiRouteTestHarness>> = []

  afterEach(async () => {
    while (harnesses.length > 0) {
      await harnesses.pop()?.d1Database.close()
    }
  })

  function createHarness(sessionUser: { sub: string, email?: string } | null) {
    const harness = createApiRouteTestHarness({
      routes: [
        { method: 'post', path: '/api/events/:eventId/applications/:applicationId/actions/override-check-in', handler: overrideCheckInHandler }
      ],
      sessionUser
    })
    harnesses.push(harness)
    return harness
  }

  test('rejects anonymous and non-admin callers', async () => {
    const anonymousHarness = createHarness(null)
    await seedOverrideContext(anonymousHarness)

    const anonymousResponse = await anonymousHarness.request(overridePath, {
      method: 'POST',
      body: JSON.stringify({ status: 'joined' })
    })

    expect(anonymousResponse.status).toBe(401)

    const regularHarness = createHarness({ sub: 'auth0|regular_user', email: 'regular@example.com' })
    await seedOverrideContext(regularHarness)

    const regularResponse = await regularHarness.request(overridePath, {
      method: 'POST',
      body: JSON.stringify({ status: 'joined' })
    })

    expect(regularResponse.status).toBe(403)
  })

  test('event admin marks a participant joined and toggles the override off again', async () => {
    const harness = createHarness({ sub: 'auth0|event_admin', email: 'event-admin@example.com' })
    await seedOverrideContext(harness)

    const joinedResponse = await harness.request(overridePath, {
      method: 'POST',
      body: JSON.stringify({ status: 'joined' })
    })

    expect(joinedResponse.status).toBe(200)
    const joinedPayload = await joinedResponse.json() as { data: Record<string, unknown> }
    expect(joinedPayload.data.checkInOverrideStatus).toBe('joined')

    const storedAfterJoin = await harness.database.query.userApplications.findFirst({
      where: eq(userApplications.id, 'application_1')
    })
    expect(storedAfterJoin?.checkInOverrideStatus).toBe('joined')
    expect(storedAfterJoin?.checkInOverrideByUserId).toBe('event_admin')

    const toggledResponse = await harness.request(overridePath, {
      method: 'POST',
      body: JSON.stringify({ status: 'joined' })
    })

    expect(toggledResponse.status).toBe(200)
    const toggledPayload = await toggledResponse.json() as { data: Record<string, unknown> }
    expect(toggledPayload.data.checkInOverrideStatus).toBeNull()

    const storedAfterToggle = await harness.database.query.userApplications.findFirst({
      where: eq(userApplications.id, 'application_1')
    })
    expect(storedAfterToggle?.checkInOverrideStatus).toBeNull()
    expect(storedAfterToggle?.checkInOverrideAt).toBeNull()
    expect(storedAfterToggle?.checkInOverrideByUserId).toBeNull()

    const auditEntries = await harness.database.query.auditLogs.findMany({
      where: eq(auditLogs.entityId, 'application_1')
    })
    expect(auditEntries.map(entry => entry.action)).toEqual([
      'user_application.check_in_overridden',
      'user_application.check_in_override_cleared'
    ])
  })

  test('platform admin can mark a Luma-checked-in participant as not joined', async () => {
    const harness = createHarness({ sub: 'auth0|platform_admin', email: 'platform-admin@example.com' })
    await seedOverrideContext(harness, { checkedInAt: '2026-06-20T08:05:00.000Z' })

    const response = await harness.request(overridePath, {
      method: 'POST',
      body: JSON.stringify({ status: 'not_joined' })
    })

    expect(response.status).toBe(200)
    const payload = await response.json() as { data: Record<string, unknown> }
    expect(payload.data.checkInOverrideStatus).toBe('not_joined')
    expect(payload.data.checkedInAt).toBe('2026-06-20T08:05:00.000Z')
  })

  test('switches directly between joined and not joined', async () => {
    const harness = createHarness({ sub: 'auth0|event_admin', email: 'event-admin@example.com' })
    await seedOverrideContext(harness, { checkInOverrideStatus: 'not_joined' })

    const response = await harness.request(overridePath, {
      method: 'POST',
      body: JSON.stringify({ status: 'joined' })
    })

    expect(response.status).toBe(200)
    const payload = await response.json() as { data: Record<string, unknown> }
    expect(payload.data.checkInOverrideStatus).toBe('joined')
  })

  test('rejects overrides for applications that are not approved', async () => {
    const harness = createHarness({ sub: 'auth0|event_admin', email: 'event-admin@example.com' })
    await seedOverrideContext(harness, { applicationStatus: 'submitted' })

    const response = await harness.request(overridePath, {
      method: 'POST',
      body: JSON.stringify({ status: 'joined' })
    })

    expect(response.status).toBe(409)
  })
})
