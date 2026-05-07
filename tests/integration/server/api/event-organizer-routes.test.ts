import { afterEach, describe, expect, test, vi } from 'vitest'
import { eq } from 'drizzle-orm'

import eventOrganizerListHandler from '../../../../server/api/event-organizers/index.get'
import eventOrganizerCandidatesListHandler from '../../../../server/api/event-organizers/candidates/index.get'
import eventOrganizerPutHandler from '../../../../server/api/event-organizers/[userId].put'
import {
  auditLogs,
  users
} from '../../../../server/database/schema'
import { createApiRouteTestHarness } from '../../../support/backend/api-route'

async function seedEventOrganizerContext(
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
      id: 'event_organizer',
      auth0Subject: 'auth0|event_organizer',
      email: 'organizer@example.com',
      displayName: 'Event Organizer',
      isEventOrganizer: true
    },
    {
      id: 'regular_user',
      auth0Subject: 'auth0|regular_user',
      email: 'regular@example.com',
      displayName: 'Regular User'
    }
  ])
}

describe('event organizer routes', () => {
  const harnesses: Array<ReturnType<typeof createApiRouteTestHarness>> = []

  afterEach(async () => {
    vi.unstubAllGlobals()

    while (harnesses.length > 0) {
      await harnesses.pop()?.d1Database.close()
    }
  })

  test('platform admins can list, search, and grant event organizer access', async () => {
    const harness = createApiRouteTestHarness({
      routes: [
        { method: 'get', path: '/api/event-organizers', handler: eventOrganizerListHandler },
        { method: 'get', path: '/api/event-organizers/candidates', handler: eventOrganizerCandidatesListHandler },
        { method: 'put', path: '/api/event-organizers/:userId', handler: eventOrganizerPutHandler }
      ],
      sessionUser: {
        sub: 'auth0|platform_admin',
        email: 'platform-admin@example.com'
      }
    })
    harnesses.push(harness)
    await seedEventOrganizerContext(harness)

    const listResponse = await harness.request('/api/event-organizers')
    expect(listResponse.status).toBe(200)
    expect(await listResponse.json()).toMatchObject({
      data: [
        expect.objectContaining({
          id: 'event_organizer',
          isEventOrganizer: true,
          isPlatformAdmin: false
        })
      ],
      meta: {
        total: 1
      }
    })

    const candidatesResponse = await harness.request('/api/event-organizers/candidates?search=regular&page=1&page_size=10')
    expect(candidatesResponse.status).toBe(200)
    expect(await candidatesResponse.json()).toMatchObject({
      data: [
        expect.objectContaining({
          id: 'regular_user',
          isEventOrganizer: false
        })
      ],
      meta: {
        page: 1,
        pageSize: 10,
        total: 1
      }
    })

    const grantResponse = await harness.request('/api/event-organizers/regular_user', {
      method: 'PUT'
    })
    expect(grantResponse.status).toBe(200)
    expect(await grantResponse.json()).toMatchObject({
      data: {
        user: {
          id: 'regular_user',
          isEventOrganizer: true,
          isPlatformAdmin: false
        },
        userGranted: true,
        wroteAuditLog: true
      }
    })

    const grantedUser = await harness.database.query.users.findFirst({
      where: eq(users.id, 'regular_user')
    })
    expect(grantedUser?.isEventOrganizer).toBe(true)

    const auditRecord = await harness.database.query.auditLogs.findFirst({
      where: eq(auditLogs.entityId, 'regular_user')
    })
    expect(auditRecord).toMatchObject({
      actorUserId: 'platform_admin',
      entityType: 'user',
      entityId: 'regular_user',
      action: 'event_organizer.granted',
      metadata: {
        userGranted: true
      }
    })
  })

  test('non-platform admins cannot manage event organizers', async () => {
    const harness = createApiRouteTestHarness({
      routes: [
        { method: 'get', path: '/api/event-organizers', handler: eventOrganizerListHandler },
        { method: 'put', path: '/api/event-organizers/:userId', handler: eventOrganizerPutHandler }
      ],
      sessionUser: {
        sub: 'auth0|regular_user',
        email: 'regular@example.com'
      }
    })
    harnesses.push(harness)
    await seedEventOrganizerContext(harness)

    const listResponse = await harness.request('/api/event-organizers')
    expect(listResponse.status).toBe(403)
    expect(await listResponse.json()).toMatchObject({
      error: {
        code: 'platform_admin_required'
      }
    })

    const grantResponse = await harness.request('/api/event-organizers/regular_user', {
      method: 'PUT'
    })
    expect(grantResponse.status).toBe(403)
    expect(await grantResponse.json()).toMatchObject({
      error: {
        code: 'platform_admin_required'
      }
    })
  })
})
