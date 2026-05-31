import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import {
  computed,
  ref,
  toValue,
  watch
} from 'vue'

const useUser = vi.hoisted(() => vi.fn())
const useFetch = vi.hoisted(() => vi.fn())
const refreshNuxtData = vi.hoisted(() => vi.fn())

describe('useAdminWorkspace', () => {
  let sessionRefresh: ReturnType<typeof vi.fn>
  let eventsRefresh: ReturnType<typeof vi.fn>

  beforeEach(() => {
    vi.resetModules()
    useUser.mockReset()
    useFetch.mockReset()
    refreshNuxtData.mockReset()

    sessionRefresh = vi.fn(async () => undefined)
    eventsRefresh = vi.fn(async () => undefined)

    useUser.mockReturnValue(ref({
      sub: 'auth0|event_organizer'
    }))
    refreshNuxtData.mockResolvedValue(undefined)
    useFetch.mockImplementation((request: string | (() => string)) => {
      const path = typeof request === 'function' ? request() : request

      if (path === '/api/session') {
        return {
          data: ref({ data: { actor: null } }),
          error: ref(null),
          status: ref('success'),
          refresh: sessionRefresh
        }
      }

      if (path.startsWith('/api/events')) {
        return {
          data: ref({ data: [] }),
          error: ref(null),
          status: ref('success'),
          refresh: eventsRefresh
        }
      }

      throw new Error(`Unhandled useFetch request in test: ${path}`)
    })

    vi.stubGlobal('computed', computed)
    vi.stubGlobal('ref', ref)
    vi.stubGlobal('refreshNuxtData', refreshNuxtData)
    vi.stubGlobal('toValue', toValue)
    vi.stubGlobal('useFetch', useFetch)
    vi.stubGlobal('useUser', useUser)
    vi.stubGlobal('watch', watch)
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  test('refreshes the shared session actor cache with the admin workspace root data', async () => {
    const { useAdminWorkspace } = await import('../../../../app/composables/useAdminWorkspace')

    const workspace = useAdminWorkspace()
    await workspace.refreshRoot()

    expect(sessionRefresh).toHaveBeenCalledTimes(1)
    expect(eventsRefresh).toHaveBeenCalledTimes(1)
    expect(refreshNuxtData).toHaveBeenCalledWith('session-actor:auth0|event_organizer')
  })
})
