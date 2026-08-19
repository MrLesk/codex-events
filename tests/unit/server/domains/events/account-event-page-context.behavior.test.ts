import { beforeEach, describe, expect, test, vi } from 'vitest'

const getRequestActor = vi.hoisted(() => vi.fn())
const assertRegularPlatformAccess = vi.hoisted(() => vi.fn())
const getDatabase = vi.hoisted(() => vi.fn())
const resolveEventAuthorization = vi.hoisted(() => vi.fn())

vi.mock('#server/auth/actor', () => ({
  assertRegularPlatformAccess,
  getRequestActor
}))

vi.mock('#server/auth/authorization', () => ({
  resolveEventAuthorization
}))

vi.mock('#server/database/client', () => ({
  getDatabase
}))

describe('resolveAccountEventPageContext', () => {
  beforeEach(() => {
    vi.resetModules()
    getRequestActor.mockReset()
    assertRegularPlatformAccess.mockReset()
    getDatabase.mockReset()
    resolveEventAuthorization.mockReset()

    getRequestActor.mockResolvedValue({
      kind: 'platform_user',
      isAuthenticated: true,
      hasPlatformAccount: true,
      hasAcceptedCurrentPlatformDocuments: true,
      sessionUser: { sub: 'auth0|fixture' },
      platformUser: {
        id: 'user_1',
        isPlatformAdmin: false
      }
    })
    resolveEventAuthorization.mockResolvedValue({
      eventId: 'event_1',
      isPlatformAdmin: false,
      explicitRole: 'event_admin',
      isEventAdmin: true,
      canReviewThroughAssignment: false,
      isInJudgePool: false,
      isStaff: false,
      staffTrackId: null,
      canViewParticipantsAndTeams: true
    })
  })

  test('passes one resolved actor, event, authorization, and database to the page boundary', async () => {
    const activeMembershipQuery = {
      limit: vi.fn(async () => [])
    }
    const database = {
      query: {
        events: {
          findFirst: vi.fn(async () => ({
            id: 'event_1',
            slug: 'fixture-event',
            name: 'Fixture event',
            eventType: 'hackathon',
            state: 'submission_open',
            hiddenAt: null
          }))
        },
        eventRoleAssignments: {
          findMany: vi.fn(async () => [{ role: 'event_admin' }])
        },
        userApplications: {
          findFirst: vi.fn(async () => null)
        }
      },
      select: vi.fn(() => ({
        from: vi.fn(() => ({
          innerJoin: vi.fn(() => ({
            where: vi.fn(() => activeMembershipQuery)
          }))
        }))
      }))
    }
    getDatabase.mockReturnValue(database)

    const { resolveAccountEventPageContext } = await import('../../../../../server/domains/events/account-event-page-context')
    const context = await resolveAccountEventPageContext({} as never, 'fixture-event')

    expect(context.event.slug).toBe('fixture-event')
    expect(context.database).toBe(database)
    expect(getRequestActor).toHaveBeenCalledOnce()
    expect(assertRegularPlatformAccess).toHaveBeenCalledOnce()
    expect(getDatabase).toHaveBeenCalledOnce()
    expect(database.query.events.findFirst).toHaveBeenCalledOnce()
    expect(resolveEventAuthorization).toHaveBeenCalledOnce()
  })
})
