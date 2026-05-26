import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'

const useUser = vi.hoisted(() => vi.fn())
const navigateTo = vi.hoisted(() => vi.fn())
const createError = vi.hoisted(() => vi.fn((input: { statusCode: number, statusMessage: string }) =>
  Object.assign(new Error(input.statusMessage), input)
))

function createPlatformActor(overrides: Record<string, unknown> = {}) {
  return {
    kind: 'platform_user',
    hasPlatformAccount: true,
    hasAcceptedCurrentPlatformDocuments: true,
    sessionUser: {
      sub: 'auth0|event-organizer'
    },
    platformUser: {
      id: 'event-organizer',
      email: 'organizer@example.com',
      displayName: 'Event Organizer',
      firstName: 'Event',
      familyName: 'Organizer',
      isPlatformAdmin: false,
      isEventOrganizer: false
    },
    isPlatformAdmin: false,
    isEventOrganizer: false,
    eventRoles: [],
    ...overrides
  }
}

describe('navigation guards', () => {
  beforeEach(() => {
    vi.resetModules()
    useUser.mockReset()
    navigateTo.mockReset()
    createError.mockClear()
    vi.stubGlobal('useUser', useUser as typeof useUser)
    vi.stubGlobal('navigateTo', navigateTo as typeof navigateTo)
    vi.stubGlobal('createError', createError as typeof createError)
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  test('returns a redirect descriptor instead of calling navigateTo for consented platform users leaving account registration', async () => {
    useUser.mockReturnValue({
      value: {
        sub: 'auth0|platform-admin'
      }
    })

    const navigationFetch = vi.fn(async () => ({
      data: {
        actor: {
          kind: 'platform_user',
          hasAcceptedCurrentPlatformDocuments: true
        }
      }
    }))

    const { ensureAuthenticatedActor } = await import('../../../../../app/domains/accounts/navigation-guards')
    const result = await ensureAuthenticatedActor({
      fullPath: '/account/register?returnTo=/account'
    } as never, navigationFetch as never)

    expect(result).toEqual({
      redirectTo: '/account'
    })
    expect(navigateTo).not.toHaveBeenCalled()
  })

  test('returns an external login redirect descriptor for anonymous users', async () => {
    useUser.mockReturnValue({
      value: null
    })

    const { ensureAuthenticatedActor } = await import('../../../../../app/domains/accounts/navigation-guards')
    const result = await ensureAuthenticatedActor({
      fullPath: '/account'
    } as never, vi.fn() as never)

    expect(result).toEqual({
      redirectTo: '/auth/login?returnTo=%2Faccount',
      external: true
    })
    expect(navigateTo).not.toHaveBeenCalled()
  })

  test('allows event organizers through the account admin guard', async () => {
    useUser.mockReturnValue({
      value: {
        sub: 'auth0|event-organizer'
      }
    })

    vi.stubGlobal('$fetch', vi.fn(async () => ({
      data: {
        actor: createPlatformActor({
          isEventOrganizer: true,
          platformUser: {
            id: 'event-organizer',
            email: 'organizer@example.com',
            displayName: 'Event Organizer',
            firstName: 'Event',
            familyName: 'Organizer',
            isPlatformAdmin: false,
            isEventOrganizer: true
          }
        })
      }
    })) as never)

    const { ensureAccountPageAccess } = await import('../../../../../app/domains/accounts/navigation-guards')
    const { canAccessAdminDashboard } = await import('../../../../../app/domains/events/access')

    await expect(ensureAccountPageAccess(
      { fullPath: '/account/admin' } as never,
      actor => canAccessAdminDashboard(actor),
      'Event admin access required.'
    )).resolves.toBeUndefined()
  })

  test('allows platform admins through the platform settings guard', async () => {
    useUser.mockReturnValue({
      value: {
        sub: 'auth0|platform-admin'
      }
    })

    vi.stubGlobal('$fetch', vi.fn(async () => ({
      data: {
        actor: createPlatformActor({
          sessionUser: {
            sub: 'auth0|platform-admin'
          },
          isPlatformAdmin: true,
          platformUser: {
            id: 'platform-admin',
            email: 'platform-admin@example.com',
            displayName: 'Platform Admin',
            firstName: 'Platform',
            familyName: 'Admin',
            isPlatformAdmin: true,
            isEventOrganizer: false
          }
        })
      }
    })) as never)

    const { ensureAccountPageAccess } = await import('../../../../../app/domains/accounts/navigation-guards')

    await expect(ensureAccountPageAccess(
      { fullPath: '/account/platform-settings' } as never,
      actor => actor.isPlatformAdmin,
      'Platform admin access required.'
    )).resolves.toBeUndefined()
  })

  test('rejects non-platform admins from the platform settings guard', async () => {
    useUser.mockReturnValue({
      value: {
        sub: 'auth0|event-organizer'
      }
    })

    vi.stubGlobal('$fetch', vi.fn(async () => ({
      data: {
        actor: createPlatformActor({
          isEventOrganizer: true,
          platformUser: {
            id: 'event-organizer',
            email: 'organizer@example.com',
            displayName: 'Event Organizer',
            firstName: 'Event',
            familyName: 'Organizer',
            isPlatformAdmin: false,
            isEventOrganizer: true
          }
        })
      }
    })) as never)

    const { ensureAccountPageAccess } = await import('../../../../../app/domains/accounts/navigation-guards')

    await expect(ensureAccountPageAccess(
      { fullPath: '/account/platform-settings' } as never,
      actor => actor.isPlatformAdmin,
      'Platform admin access required.'
    )).rejects.toMatchObject({
      statusCode: 401,
      statusMessage: 'Platform admin access required.'
    })
  })

  test('allows event organizers through the event creation guard', async () => {
    useUser.mockReturnValue({
      value: {
        sub: 'auth0|event-organizer'
      }
    })

    vi.stubGlobal('$fetch', vi.fn(async () => ({
      data: {
        actor: createPlatformActor({
          isEventOrganizer: true,
          platformUser: {
            id: 'event-organizer',
            email: 'organizer@example.com',
            displayName: 'Event Organizer',
            firstName: 'Event',
            familyName: 'Organizer',
            isPlatformAdmin: false,
            isEventOrganizer: true
          }
        })
      }
    })) as never)

    const { ensureAccountPageAccess } = await import('../../../../../app/domains/accounts/navigation-guards')
    const { canCreateEvent } = await import('../../../../../app/domains/events/access')

    await expect(ensureAccountPageAccess(
      { fullPath: '/admin/events/new' } as never,
      actor => canCreateEvent(actor),
      'Event creator access required.'
    )).resolves.toBeUndefined()
  })

  test('rejects regular users from the event creation guard', async () => {
    useUser.mockReturnValue({
      value: {
        sub: 'auth0|regular-user'
      }
    })

    vi.stubGlobal('$fetch', vi.fn(async () => ({
      data: {
        actor: createPlatformActor({
          sessionUser: {
            sub: 'auth0|regular-user'
          },
          platformUser: {
            id: 'regular-user',
            email: 'regular@example.com',
            displayName: 'Regular User',
            firstName: 'Regular',
            familyName: 'User',
            isPlatformAdmin: false,
            isEventOrganizer: false
          }
        })
      }
    })) as never)

    const { ensureAccountPageAccess } = await import('../../../../../app/domains/accounts/navigation-guards')
    const { canCreateEvent } = await import('../../../../../app/domains/events/access')

    await expect(ensureAccountPageAccess(
      { fullPath: '/admin/events/new' } as never,
      actor => canCreateEvent(actor),
      'Event creator access required.'
    )).rejects.toMatchObject({
      statusCode: 401,
      statusMessage: 'Event creator access required.'
    })
  })

  test('allows judge routes for judge-enabled event admins only', async () => {
    useUser.mockReturnValue({
      value: {
        sub: 'auth0|admin-judge'
      }
    })

    const navigationFetch = vi.fn()
      .mockResolvedValueOnce({
        data: {
          actor: {
            kind: 'platform_user',
            hasPlatformAccount: true,
            hasAcceptedCurrentPlatformDocuments: true,
            isPlatformAdmin: false,
            eventRoles: [{
              eventId: 'event-1',
              role: 'event_admin',
              isInJudgePool: true,
              isStaff: true,
              createdAt: '2026-03-01T00:00:00.000Z'
            }]
          }
        }
      })
      .mockResolvedValueOnce({
        data: {
          id: 'event-1'
        }
      })

    vi.stubGlobal('$fetch', navigationFetch as never)

    const { ensureEventRoleForSlugRoute } = await import('../../../../../app/domains/accounts/navigation-guards')

    await expect(ensureEventRoleForSlugRoute({
      fullPath: '/events/codex/judging',
      params: {
        slug: 'codex'
      }
    } as never, ['judge'])).resolves.toBeUndefined()

    expect(navigationFetch).toHaveBeenCalledTimes(2)
    expect(navigationFetch).toHaveBeenNthCalledWith(1, '/api/session')
    expect(navigationFetch).toHaveBeenNthCalledWith(2, '/api/events/slug/codex')
  })

  test('allows staff routes for staff-enabled event admins only', async () => {
    useUser.mockReturnValue({
      value: {
        sub: 'auth0|admin-staff'
      }
    })

    const navigationFetch = vi.fn()
      .mockResolvedValueOnce({
        data: {
          actor: {
            kind: 'platform_user',
            hasPlatformAccount: true,
            hasAcceptedCurrentPlatformDocuments: true,
            isPlatformAdmin: false,
            eventRoles: [{
              eventId: 'event-1',
              role: 'event_admin',
              isInJudgePool: false,
              isStaff: true,
              createdAt: '2026-03-01T00:00:00.000Z'
            }]
          }
        }
      })
      .mockResolvedValueOnce({
        data: {
          id: 'event-1'
        }
      })

    vi.stubGlobal('$fetch', navigationFetch as never)

    const { ensureEventRoleForSlugRoute } = await import('../../../../../app/domains/accounts/navigation-guards')

    await expect(ensureEventRoleForSlugRoute({
      fullPath: '/events/codex/staff',
      params: {
        slug: 'codex'
      }
    } as never, ['staff'])).resolves.toBeUndefined()

    expect(navigationFetch).toHaveBeenCalledTimes(2)
    expect(navigationFetch).toHaveBeenNthCalledWith(1, '/api/session')
    expect(navigationFetch).toHaveBeenNthCalledWith(2, '/api/events/slug/codex')
  })
})
