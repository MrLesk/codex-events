import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'

const useUser = vi.hoisted(() => vi.fn())
const navigateTo = vi.hoisted(() => vi.fn())

describe('navigation guards', () => {
  beforeEach(() => {
    vi.resetModules()
    useUser.mockReset()
    navigateTo.mockReset()
    vi.stubGlobal('useUser', useUser as typeof useUser)
    vi.stubGlobal('navigateTo', navigateTo as typeof navigateTo)
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

  test('allows judge routes for judge-enabled hackathon admins only', async () => {
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
            hackathonRoles: [{
              hackathonId: 'hackathon-1',
              role: 'hackathon_admin',
              isInJudgePool: true,
              isStaff: true,
              createdAt: '2026-03-01T00:00:00.000Z'
            }]
          }
        }
      })
      .mockResolvedValueOnce({
        data: {
          id: 'hackathon-1'
        }
      })

    vi.stubGlobal('$fetch', navigationFetch as never)

    const { ensureHackathonRoleForSlugRoute } = await import('../../../../../app/domains/accounts/navigation-guards')

    await expect(ensureHackathonRoleForSlugRoute({
      fullPath: '/hackathons/codex/judging',
      params: {
        slug: 'codex'
      }
    } as never, ['judge'])).resolves.toBeUndefined()

    expect(navigationFetch).toHaveBeenCalledTimes(2)
    expect(navigationFetch).toHaveBeenNthCalledWith(1, '/api/session')
    expect(navigationFetch).toHaveBeenNthCalledWith(2, '/api/hackathons/slug/codex')
  })

  test('allows staff routes for staff-enabled hackathon admins only', async () => {
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
            hackathonRoles: [{
              hackathonId: 'hackathon-1',
              role: 'hackathon_admin',
              isInJudgePool: false,
              isStaff: true,
              createdAt: '2026-03-01T00:00:00.000Z'
            }]
          }
        }
      })
      .mockResolvedValueOnce({
        data: {
          id: 'hackathon-1'
        }
      })

    vi.stubGlobal('$fetch', navigationFetch as never)

    const { ensureHackathonRoleForSlugRoute } = await import('../../../../../app/domains/accounts/navigation-guards')

    await expect(ensureHackathonRoleForSlugRoute({
      fullPath: '/hackathons/codex/staff',
      params: {
        slug: 'codex'
      }
    } as never, ['staff'])).resolves.toBeUndefined()

    expect(navigationFetch).toHaveBeenCalledTimes(2)
    expect(navigationFetch).toHaveBeenNthCalledWith(1, '/api/session')
    expect(navigationFetch).toHaveBeenNthCalledWith(2, '/api/hackathons/slug/codex')
  })
})
