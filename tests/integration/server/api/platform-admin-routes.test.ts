import { afterEach, describe, expect, test, vi } from 'vitest'
import { asc, eq } from 'drizzle-orm'

import platformAdminListHandler from '../../../../server/api/platform-admins/index.get'
import platformAdminCandidatesListHandler from '../../../../server/api/platform-admins/candidates/index.get'
import platformAdminPutHandler from '../../../../server/api/platform-admins/[userId].put'
import {
  auditLogs,
  eventRoleAssignments,
  events,
  users
} from '../../../../server/database/schema'
import { createApiRouteTestHarness } from '../../../support/backend/api-route'

async function seedPlatformAdminContext(
  harness: ReturnType<typeof createApiRouteTestHarness>
) {
  await harness.database.insert(users).values([
    {
      id: 'platform_admin',
      auth0Subject: 'auth0|platform_admin',
      email: 'platform-admin@example.com',
      displayName: 'Platform Admin Alpha',
      isPlatformAdmin: true
    },
    {
      id: 'platform_admin_two',
      auth0Subject: 'auth0|platform_admin_two',
      email: 'platform-admin-two@example.com',
      displayName: 'Platform Admin Bravo',
      isPlatformAdmin: true
    },
    {
      id: 'event_admin',
      auth0Subject: 'auth0|event_admin',
      email: 'event-admin@example.com',
      displayName: 'Event Admin'
    },
    {
      id: 'judge_user',
      auth0Subject: 'auth0|judge_user',
      email: 'judge@example.com',
      displayName: 'Judge User'
    },
    {
      id: 'regular_user',
      auth0Subject: 'auth0|regular_user',
      email: 'regular@example.com',
      displayName: 'Regular User'
    },
    {
      id: 'deleted_platform_admin',
      auth0Subject: 'auth0|deleted_platform_admin',
      email: 'deleted-platform-admin@example.com',
      displayName: 'Deleted Platform Admin',
      isPlatformAdmin: true,
      deletedAt: '2026-03-31T10:00:00.000Z'
    }
  ])

  await harness.database.insert(events).values([
    {
      id: 'event_1',
      eventType: 'hackathon',
      name: 'Fixture Event 1',
      slug: 'fixture-event-1',
      description: 'Fixture event one',
      city: 'Vienna',
      country: 'Austria',
      address: 'Fixture Address 1',
      registrationOpensAt: '2026-03-20T12:00:00.000Z',
      registrationClosesAt: '2026-03-23T12:00:00.000Z',
      submissionOpensAt: '2026-03-23T12:00:00.000Z',
      submissionClosesAt: '2026-03-25T12:00:00.000Z',
      state: 'registration_open',
      maxTeamMembers: 5,
      currentApplicationTermsDocumentId: null,
      currentWinnerTermsDocumentId: null,
      createdByUserId: 'platform_admin'
    },
    {
      id: 'event_2',
      eventType: 'hackathon',
      name: 'Fixture Event 2',
      slug: 'fixture-event-2',
      description: 'Fixture event two',
      city: 'Berlin',
      country: 'Germany',
      address: 'Fixture Address 2',
      registrationOpensAt: '2026-03-21T12:00:00.000Z',
      registrationClosesAt: '2026-03-24T12:00:00.000Z',
      submissionOpensAt: '2026-03-24T12:00:00.000Z',
      submissionClosesAt: '2026-03-26T12:00:00.000Z',
      state: 'registration_open',
      maxTeamMembers: 5,
      currentApplicationTermsDocumentId: null,
      currentWinnerTermsDocumentId: null,
      createdByUserId: 'platform_admin'
    }
  ])

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
      id: 'role_judge_user',
      eventId: 'event_1',
      userId: 'judge_user',
      role: 'judge',
      isInJudgePool: true,
      isStaff: false,
      createdAt: '2026-03-22T12:00:00.000Z'
    }
  ])
}

describe('platform admin routes', () => {
  const harnesses: Array<ReturnType<typeof createApiRouteTestHarness>> = []

  afterEach(async () => {
    vi.unstubAllGlobals()

    while (harnesses.length > 0) {
      await harnesses.pop()?.d1Database.close()
    }
  })

  test('platform admins can list the roster, search candidates, and exclude deleted users', async () => {
    const harness = createApiRouteTestHarness({
      routes: [
        { method: 'get', path: '/api/platform-admins', handler: platformAdminListHandler },
        { method: 'get', path: '/api/platform-admins/candidates', handler: platformAdminCandidatesListHandler }
      ],
      sessionUser: {
        sub: 'auth0|platform_admin',
        email: 'platform-admin@example.com'
      }
    })
    harnesses.push(harness)
    await seedPlatformAdminContext(harness)

    const listResponse = await harness.request('/api/platform-admins')
    expect(listResponse.status).toBe(200)
    expect(await listResponse.json()).toMatchObject({
      data: [
        expect.objectContaining({
          id: 'platform_admin',
          isPlatformAdmin: true
        }),
        expect.objectContaining({
          id: 'platform_admin_two',
          isPlatformAdmin: true
        })
      ],
      meta: {
        total: 2
      }
    })

    const candidatePageOneResponse = await harness.request(
      '/api/platform-admins/candidates?search=admin&page=1&page_size=1'
    )
    expect(candidatePageOneResponse.status).toBe(200)
    expect(await candidatePageOneResponse.json()).toMatchObject({
      data: [
        expect.objectContaining({
          id: 'platform_admin',
          isPlatformAdmin: true
        })
      ],
      meta: {
        page: 1,
        pageSize: 1,
        total: 3
      }
    })

    const candidatePageTwoResponse = await harness.request(
      '/api/platform-admins/candidates?search=admin&page=2&page_size=1'
    )
    expect(candidatePageTwoResponse.status).toBe(200)
    expect(await candidatePageTwoResponse.json()).toMatchObject({
      data: [
        expect.objectContaining({
          id: 'platform_admin_two',
          isPlatformAdmin: true
        })
      ],
      meta: {
        page: 2,
        pageSize: 1,
        total: 3
      }
    })

    const candidateByIdResponse = await harness.request(
      '/api/platform-admins/candidates?search=regular_user&page=1&page_size=10'
    )
    expect(candidateByIdResponse.status).toBe(200)
    expect(await candidateByIdResponse.json()).toMatchObject({
      data: [
        expect.objectContaining({
          id: 'regular_user',
          isPlatformAdmin: false
        })
      ],
      meta: {
        page: 1,
        pageSize: 10,
        total: 1
      }
    })
  })

  test('granting platform admin access normalizes event-admin coverage and writes audit', async () => {
    const harness = createApiRouteTestHarness({
      routes: [
        { method: 'put', path: '/api/platform-admins/:userId', handler: platformAdminPutHandler }
      ],
      sessionUser: {
        sub: 'auth0|platform_admin',
        email: 'platform-admin@example.com'
      }
    })
    harnesses.push(harness)
    await seedPlatformAdminContext(harness)

    const response = await harness.request('/api/platform-admins/judge_user', {
      method: 'PUT'
    })
    expect(response.status).toBe(200)
    expect(await response.json()).toMatchObject({
      data: {
        user: {
          id: 'judge_user',
          isPlatformAdmin: true
        },
        userPromoted: true,
        createdEventAdminAssignments: 1,
        updatedEventAdminAssignments: 1,
        wroteAuditLog: true
      }
    })

    const promotedUser = await harness.database.query.users.findFirst({
      where: eq(users.id, 'judge_user')
    })
    expect(promotedUser?.isPlatformAdmin).toBe(true)

    const assignments = await harness.database.query.eventRoleAssignments.findMany({
      where: eq(eventRoleAssignments.userId, 'judge_user'),
      orderBy: [asc(eventRoleAssignments.eventId)]
    })
    expect(assignments).toMatchObject([
      {
        eventId: 'event_1',
        role: 'event_admin',
        isInJudgePool: true,
        isStaff: false
      },
      {
        eventId: 'event_2',
        role: 'event_admin',
        isInJudgePool: false,
        isStaff: false
      }
    ])

    const auditRecord = await harness.database.query.auditLogs.findFirst({
      where: eq(auditLogs.entityId, 'judge_user')
    })
    expect(auditRecord).toMatchObject({
      actorUserId: 'platform_admin',
      entityType: 'user',
      entityId: 'judge_user',
      action: 'platform_admin.granted',
      metadata: {
        userPromoted: true,
        createdEventAdminAssignments: 1,
        updatedEventAdminAssignments: 1
      }
    })
  })

  test('non-platform admins cannot manage platform admins', async () => {
    const harness = createApiRouteTestHarness({
      routes: [
        { method: 'get', path: '/api/platform-admins', handler: platformAdminListHandler },
        { method: 'put', path: '/api/platform-admins/:userId', handler: platformAdminPutHandler }
      ],
      sessionUser: {
        sub: 'auth0|event_admin',
        email: 'event-admin@example.com'
      }
    })
    harnesses.push(harness)
    await seedPlatformAdminContext(harness)

    const listResponse = await harness.request('/api/platform-admins')
    expect(listResponse.status).toBe(403)
    expect(await listResponse.json()).toMatchObject({
      error: {
        code: 'platform_admin_required'
      }
    })

    const grantResponse = await harness.request('/api/platform-admins/regular_user', {
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
