import { readFileSync } from 'node:fs'

import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import {
  computed,
  ref,
  toValue,
  watch
} from 'vue'

const useApiFetch = vi.hoisted(() => vi.fn())
const useSessionActor = vi.hoisted(() => vi.fn())
const creationPageSources = [
  '../../../../app/pages/admin/events/new.vue',
  '../../../../app/pages/admin/events/builder/new.vue'
].map(path => readFileSync(new URL(path, import.meta.url), 'utf8'))

vi.mock('~/composables/useApiClient', () => ({
  useApiClient: vi.fn()
}))

vi.mock('~/composables/useProtectedApiFetch', () => ({
  useApiFetch
}))

vi.mock('~/composables/useSessionActor', () => ({
  useSessionActor
}))

describe('useAdminWorkspace', () => {
  let sessionRefresh: ReturnType<typeof vi.fn>
  let eventsRefresh: ReturnType<typeof vi.fn>

  beforeEach(() => {
    vi.resetModules()
    useApiFetch.mockReset()
    useSessionActor.mockReset()

    sessionRefresh = vi.fn(async () => undefined)
    eventsRefresh = vi.fn(async () => undefined)

    useSessionActor.mockReturnValue({
      actor: ref({
        kind: 'anonymous',
        isAuthenticated: false,
        hasPlatformAccount: false,
        hasAcceptedCurrentPlatformDocuments: false,
        sessionUser: null,
        platformUser: null,
        isPlatformAdmin: false,
        isEventOrganizer: false,
        eventRoles: []
      }),
      error: ref(null),
      status: ref('success'),
      refresh: sessionRefresh,
      clear: vi.fn()
    })
    useApiFetch.mockImplementation((request: string | (() => string)) => {
      const path = typeof request === 'function' ? request() : request

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
    vi.stubGlobal('toValue', toValue)
    vi.stubGlobal('useApiFetch', useApiFetch)
    vi.stubGlobal('watch', watch)
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  test('keeps the root admin index separate from event page reads', async () => {
    const { useAdminWorkspace } = await import('../../../../app/composables/useAdminWorkspace')

    const workspace = useAdminWorkspace()
    await workspace.refreshRoot()

    expect(sessionRefresh).toHaveBeenCalledOnce()
    expect(eventsRefresh).toHaveBeenCalledOnce()
    expect(useApiFetch).toHaveBeenCalledWith('/api/events?page=1&page_size=100', expect.anything())
  })

  test('keeps creation workspaces lazy until an event list is requested', async () => {
    const { useAdminWorkspace } = await import('../../../../app/composables/useAdminWorkspace')

    const workspace = useAdminWorkspace({ loadEvents: false })
    await workspace.refreshRoot()

    expect(sessionRefresh).toHaveBeenCalledOnce()
    expect(eventsRefresh).not.toHaveBeenCalled()
    expect(useApiFetch).toHaveBeenCalledWith('/api/events?page=1&page_size=100', expect.objectContaining({
      immediate: false
    }))
    expect(creationPageSources).toHaveLength(2)
    expect(creationPageSources.every(source => source.includes('useAdminWorkspace({ loadEvents: false })'))).toBe(true)
  })
})
