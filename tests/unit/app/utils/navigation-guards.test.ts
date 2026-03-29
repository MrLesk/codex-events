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

    const { ensureAuthenticatedActor } = await import('../../../../app/utils/navigation-guards')
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

    const { ensureAuthenticatedActor } = await import('../../../../app/utils/navigation-guards')
    const result = await ensureAuthenticatedActor({
      fullPath: '/account'
    } as never, vi.fn() as never)

    expect(result).toEqual({
      redirectTo: '/auth/login?returnTo=%2Faccount',
      external: true
    })
    expect(navigateTo).not.toHaveBeenCalled()
  })
})
