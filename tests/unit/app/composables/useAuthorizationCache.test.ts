import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import { computed, toValue } from 'vue'

const clearNuxtData = vi.hoisted(() => vi.fn())
const states = new Map<string, { value: unknown }>()

describe('useAuthorizationCache', () => {
  beforeEach(() => {
    vi.resetModules()
    clearNuxtData.mockReset()
    states.clear()

    vi.stubGlobal('computed', computed)
    vi.stubGlobal('toValue', toValue)
    vi.stubGlobal('useState', (key: string, init: () => unknown) => {
      const existing = states.get(key)

      if (existing) {
        return existing
      }

      const state = { value: init() }
      states.set(key, state)
      return state
    })
    vi.stubGlobal('clearNuxtData', clearNuxtData)
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  test('scopes protected keys to authorization generation and clears them on authorization changes', async () => {
    const { useAuthorizationCache } = await import('../../../../app/composables/useAuthorizationCache')
    const cache = useAuthorizationCache()
    const actor = {
      kind: 'platform_user' as const,
      isAuthenticated: true as const,
      hasPlatformAccount: true as const,
      hasAcceptedCurrentPlatformDocuments: true,
      sessionUser: { sub: 'auth0|one' },
      platformUser: { id: 'user-one' },
      isPlatformAdmin: false,
      isEventOrganizer: false,
      eventRoles: []
    }

    expect(cache.protectedKey('account-event').value).toBe('protected-api:0:account-event')
    expect(cache.syncAuthorization(actor, { canView: true })).toBe(true)
    expect(cache.authorizationGeneration.value).toBe(0)
    expect(cache.syncAuthorization(actor, { canView: true })).toBe(false)

    const changedActor = {
      ...actor,
      hasAcceptedCurrentPlatformDocuments: false
    }
    expect(cache.syncAuthorization(changedActor, { canView: false })).toBe(true)
    expect(cache.authorizationGeneration.value).toBe(1)
    expect(cache.protectedKey('account-event').value).toBe('protected-api:1:account-event')
    expect(clearNuxtData).toHaveBeenCalledTimes(2)

    const predicate = clearNuxtData.mock.calls.at(-1)?.[0] as (key: string) => boolean
    expect(predicate('protected-api:0:account-event')).toBe(true)
    expect(predicate('public-event:account-event')).toBe(false)
  })
})
