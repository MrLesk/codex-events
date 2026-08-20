import { afterEach, describe, expect, test } from 'vitest'

import operationsPageGetHandler from '../../../../server/api/account/events/[slug]/operations.get'
import participantsPageGetHandler from '../../../../server/api/account/events/[slug]/participants.get'
import submissionsPageGetHandler from '../../../../server/api/account/events/[slug]/submissions.get'
import judgingPageGetHandler from '../../../../server/api/account/events/[slug]/judging.get'
import workspacePageGetHandler from '../../../../server/api/account/events/[slug]/workspace.get'
import judgeInboxGetHandler from '../../../../server/api/account/judging.get'
import {
  eventRoleAssignments,
  events,
  userApplications,
  users
} from '../../../../server/database/schema'
import { accountEventOperationsPageSchema } from '../../../../shared/domains/events/account-event-operations-page'
import { accountEventSubmissionsPageSchema } from '../../../../shared/domains/events/account-event-submissions-page'
import { accountEventJudgingPageSchema, accountJudgeInboxPageSchema } from '../../../../shared/domains/events/account-event-judging-page'
import { accountEventWorkspacePageSchema } from '../../../../shared/domains/events/account-event-workspace-page'
import { createApiRouteTestHarness } from '../../../support/backend/api-route'

describe('account event operations, submissions, and judging page reads', () => {
  const harnesses: Array<ReturnType<typeof createApiRouteTestHarness>> = []

  afterEach(async () => {
    while (harnesses.length > 0) {
      await harnesses.pop()?.d1Database.close()
    }
  })

  async function seedFixture(
    harness: ReturnType<typeof createApiRouteTestHarness>,
    userId: string,
    role: 'event_admin' | 'judge' | 'staff' | null,
    applicationStatus?: 'submitted' | 'approved'
  ) {
    const now = '2026-08-19T12:00:00.000Z'

    await harness.database.insert(users).values({
      id: userId,
      auth0Subject: `auth0|${userId}`,
      email: `${userId}@example.com`,
      displayName: userId
    })
    await harness.database.insert(events).values({
      id: 'event_page_read',
      eventType: 'hackathon',
      name: 'Page read fixture',
      slug: 'page-read-fixture',
      description: 'A bounded page-shaped read fixture.',
      city: 'Vienna',
      country: 'Austria',
      address: 'Event address',
      registrationOpensAt: now,
      registrationClosesAt: '2026-08-20T12:00:00.000Z',
      submissionOpensAt: '2026-08-20T12:00:00.000Z',
      submissionClosesAt: '2026-08-21T12:00:00.000Z',
      state: 'judging_preparation',
      maxTeamMembers: 4,
      createdByUserId: userId,
      createdAt: now,
      updatedAt: now
    })
    if (role) {
      await harness.database.insert(eventRoleAssignments).values({
        id: `${userId}_role`,
        eventId: 'event_page_read',
        userId,
        role,
        isInJudgePool: role === 'judge',
        isStaff: role === 'staff',
        createdAt: now
      })
    }

    if (applicationStatus) {
      await harness.database.insert(userApplications).values({
        id: `${userId}_application`,
        eventId: 'event_page_read',
        userId,
        status: applicationStatus,
        submittedAt: now,
        updatedAt: now
      })
    }
  }

  test('returns the operations page in one request-scoped D1 session', async () => {
    const harness = createApiRouteTestHarness({
      routes: [
        { method: 'get', path: '/api/account/events/:slug/operations', handler: operationsPageGetHandler },
        { method: 'get', path: '/api/account/events/:slug/submissions', handler: submissionsPageGetHandler }
      ],
      sessionUser: {
        sub: 'auth0|operations_admin',
        email: 'operations_admin@example.com',
        name: 'Operations Admin'
      }
    })
    harnesses.push(harness)
    await seedFixture(harness, 'operations_admin', 'event_admin')

    const queryOffset = harness.d1Database.queries.length
    const response = await harness.request('/api/account/events/page-read-fixture/operations')
    const body = await response.json() as { data: { page: unknown, visibility: { canManage: boolean } } }

    expect(response.status).toBe(200)
    expect(body.data.visibility.canManage).toBe(true)
    expect(accountEventOperationsPageSchema.parse(body.data.page)).toMatchObject({
      event: { id: 'event_page_read', slug: 'page-read-fixture' },
      roles: { assignments: [{ userId: 'operations_admin', role: 'event_admin' }] },
      assignments: { data: [], total: 0 },
      teams: { data: [], total: 0 },
      applications: [],
      leaderboard: []
    })
    expect(new Set(harness.d1Database.queries.slice(queryOffset).map(query => query.sessionId))).toHaveLength(1)

    const submissionsResponse = await harness.request('/api/account/events/page-read-fixture/submissions')
    const submissionsBody = await submissionsResponse.json() as { data: { page: unknown } }

    expect(submissionsResponse.status).toBe(200)
    expect(accountEventSubmissionsPageSchema.parse(submissionsBody.data.page)).toMatchObject({
      event: { id: 'event_page_read' },
      teams: { data: [], total: 0 },
      applications: [],
      submissionMonitor: { teamDetails: [], teamSubmissions: [] },
      noSubmissionTeams: []
    })
  })

  test('keeps a direct operations shell read on one session with one joined credit probe', async () => {
    const harness = createApiRouteTestHarness({
      routes: [
        { method: 'get', path: '/api/account/events/:slug/operations', handler: operationsPageGetHandler }
      ],
      sessionUser: {
        sub: 'auth0|direct_operations_admin',
        email: 'direct_operations_admin@example.com',
        name: 'Direct Operations Admin'
      }
    })
    harnesses.push(harness)
    await seedFixture(harness, 'direct_operations_admin', 'event_admin')

    const queryOffset = harness.d1Database.queries.length
    const response = await harness.request(
      '/api/account/events/page-read-fixture/operations?includeEventShell=true'
    )
    const body = await response.json() as {
      data: {
        page: unknown
        shell?: { tabVisibility: { hasCreditInventory: boolean } }
      }
    }

    expect(response.status).toBe(200)
    expect(accountEventOperationsPageSchema.parse(body.data.page)).toMatchObject({
      event: { id: 'event_page_read' }
    })
    expect(body.data.shell?.tabVisibility.hasCreditInventory).toBe(false)

    const requestQueries = harness.d1Database.queries.slice(queryOffset)
    expect(new Set(requestQueries.map(query => query.sessionId))).toHaveLength(1)
    const creditQueries = requestQueries.filter(query =>
      query.sql.includes('event_credit_offers') || query.sql.includes('event_credit_codes')
    )

    expect(creditQueries).toHaveLength(1)
    expect(creditQueries[0]?.sql).toContain('event_credit_offers')
    expect(creditQueries[0]?.sql).toContain('event_credit_codes')
  })

  test('uses the operations model for a direct admin Participants link', async () => {
    const harness = createApiRouteTestHarness({
      routes: [
        { method: 'get', path: '/api/account/events/:slug/participants', handler: participantsPageGetHandler }
      ],
      sessionUser: {
        sub: 'auth0|direct_participants_admin',
        email: 'direct_participants_admin@example.com',
        name: 'Direct Participants Admin'
      }
    })
    harnesses.push(harness)
    await seedFixture(harness, 'direct_participants_admin', 'event_admin')

    const queryOffset = harness.d1Database.queries.length
    const response = await harness.request(
      '/api/account/events/page-read-fixture/participants?includeEventShell=true'
    )
    const body = await response.json() as {
      data: {
        page: unknown
        visibility: { canManage: boolean }
        shell?: unknown
      }
    }

    expect(response.status).toBe(200)
    expect(body.data.visibility.canManage).toBe(true)
    expect(accountEventOperationsPageSchema.parse(body.data.page)).toMatchObject({
      event: { id: 'event_page_read' },
      assignments: { data: [], total: 0 }
    })
    expect(body.data.shell).toBeDefined()
    expect(new Set(harness.d1Database.queries.slice(queryOffset).map(query => query.sessionId))).toHaveLength(1)
  })

  test('returns judge event and global inbox page models without event GET fan-out', async () => {
    const eventHarness = createApiRouteTestHarness({
      routes: [
        { method: 'get', path: '/api/account/events/:slug/judging', handler: judgingPageGetHandler }
      ],
      sessionUser: {
        sub: 'auth0|judge_page',
        email: 'judge_page@example.com',
        name: 'Judge'
      }
    })
    harnesses.push(eventHarness)
    await seedFixture(eventHarness, 'judge_page', 'judge')

    const eventResponse = await eventHarness.request('/api/account/events/page-read-fixture/judging')
    const eventBody = await eventResponse.json() as { data: { page: unknown } }

    expect(eventResponse.status).toBe(200)
    expect(accountEventJudgingPageSchema.parse(eventBody.data.page)).toMatchObject({
      event: { id: 'event_page_read' },
      assignments: [],
      criteria: [],
      summary: { totalAssignmentCount: 0, activeAssignmentCount: 0 }
    })

    const inboxHarness = createApiRouteTestHarness({
      routes: [
        { method: 'get', path: '/api/account/judging', handler: judgeInboxGetHandler }
      ],
      sessionUser: {
        sub: 'auth0|judge_inbox',
        email: 'judge_inbox@example.com',
        name: 'Judge Inbox'
      }
    })
    harnesses.push(inboxHarness)
    await seedFixture(inboxHarness, 'judge_inbox', 'judge')

    const queryOffset = inboxHarness.d1Database.queries.length
    const inboxResponse = await inboxHarness.request('/api/account/judging')
    const inboxBody = await inboxResponse.json() as { data: unknown }

    expect(inboxResponse.status).toBe(200)
    expect(accountJudgeInboxPageSchema.parse(inboxBody.data)).toMatchObject({
      groups: [{ event: { id: 'event_page_read' }, assignments: [] }],
      assignmentCount: 0,
      inProgressCount: 0
    })
    expect(new Set(inboxHarness.d1Database.queries.slice(queryOffset).map(query => query.sessionId))).toHaveLength(1)
  })

  test('does not let an assigned judge read the event-admin operations page', async () => {
    const harness = createApiRouteTestHarness({
      routes: [
        { method: 'get', path: '/api/account/events/:slug/operations', handler: operationsPageGetHandler }
      ],
      sessionUser: {
        sub: 'auth0|operations_judge',
        email: 'operations_judge@example.com',
        name: 'Operations Judge'
      }
    })
    harnesses.push(harness)
    await seedFixture(harness, 'operations_judge', 'judge')

    const response = await harness.request('/api/account/events/page-read-fixture/operations')

    expect(response.status).toBe(403)
  })

  test('authorizes an approved participant before loading the workspace and optional shell', async () => {
    const harness = createApiRouteTestHarness({
      routes: [
        { method: 'get', path: '/api/account/events/:slug/workspace', handler: workspacePageGetHandler }
      ],
      sessionUser: {
        sub: 'auth0|approved_workspace_participant',
        email: 'approved_workspace_participant@example.com',
        name: 'Approved workspace participant'
      }
    })
    harnesses.push(harness)
    await seedFixture(harness, 'approved_workspace_participant', null, 'approved')

    const response = await harness.request(
      '/api/account/events/page-read-fixture/workspace?includeEventShell=true'
    )
    const body = await response.json() as {
      data: {
        page: unknown
        shell?: unknown
      }
    }

    expect(response.status).toBe(200)
    expect(accountEventWorkspacePageSchema.parse(body.data.page)).toMatchObject({
      application: { userId: 'approved_workspace_participant', status: 'approved' },
      workflow: {
        applicationStatus: 'approved',
        isApprovedParticipant: true
      }
    })
    expect(body.data.shell).toBeDefined()
  })

  test('allows an event role to use the participant workspace only with an approved application', async () => {
    const harness = createApiRouteTestHarness({
      routes: [
        { method: 'get', path: '/api/account/events/:slug/workspace', handler: workspacePageGetHandler }
      ],
      sessionUser: {
        sub: 'auth0|admin_participant',
        email: 'admin_participant@example.com',
        name: 'Admin participant'
      }
    })
    harnesses.push(harness)
    await seedFixture(harness, 'admin_participant', 'event_admin', 'approved')

    const response = await harness.request(
      '/api/account/events/page-read-fixture/workspace?includeEventShell=true'
    )
    const body = await response.json() as {
      data: {
        page: unknown
        shell?: unknown
      }
    }

    expect(response.status).toBe(200)
    expect(accountEventWorkspacePageSchema.parse(body.data.page)).toMatchObject({
      workflow: {
        applicationStatus: 'approved',
        isApprovedParticipant: true
      }
    })
    expect(body.data.shell).toBeDefined()
  })

  test.each(['event_admin', 'staff'] as const)(
    'rejects a role-only %s before loading the workspace or optional shell',
    async (role) => {
      const harness = createApiRouteTestHarness({
        routes: [
          { method: 'get', path: '/api/account/events/:slug/workspace', handler: workspacePageGetHandler }
        ],
        sessionUser: {
          sub: `auth0|role_only_${role}`,
          email: `role_only_${role}@example.com`,
          name: `Role-only ${role}`
        }
      })
      harnesses.push(harness)
      await seedFixture(harness, `role_only_${role}`, role)

      const response = await harness.request(
        '/api/account/events/page-read-fixture/workspace?includeEventShell=true'
      )
      const body = await response.json() as { data?: unknown }

      expect(response.status).toBe(403)
      expect(body.data).toBeUndefined()
    }
  )

  test('rejects the global judge inbox without a judge-capable event role', async () => {
    const harness = createApiRouteTestHarness({
      routes: [
        { method: 'get', path: '/api/account/judging', handler: judgeInboxGetHandler }
      ],
      sessionUser: {
        sub: 'auth0|not_a_judge',
        email: 'not_a_judge@example.com',
        name: 'Not a judge'
      }
    })
    harnesses.push(harness)
    await harness.database.insert(users).values({
      id: 'not_a_judge',
      auth0Subject: 'auth0|not_a_judge',
      email: 'not_a_judge@example.com',
      displayName: 'Not a judge'
    })

    const response = await harness.request('/api/account/judging')

    expect(response.status).toBe(403)
  })
})
