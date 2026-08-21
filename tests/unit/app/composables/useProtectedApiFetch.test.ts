import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import { computed, nextTick, ref, toValue } from 'vue'

const requestFetch = vi.hoisted(() => vi.fn())
const useFetch = vi.hoisted(() => vi.fn())
const useAccountBootstrap = vi.hoisted(() => vi.fn())
const ensureLoaded = vi.hoisted(() => vi.fn())
const useProtectedRequestOwner = vi.hoisted(() => vi.fn())
const buildProtectedRequestKey = vi.hoisted(() => vi.fn((...parts: unknown[]) => JSON.stringify(parts)))
const resolveProtectedWatchSources = vi.hoisted(() => vi.fn((sources: unknown[] | false | undefined) => {
  if (!sources || sources === false) {
    return []
  }

  return sources.map((source) => {
    if (typeof source === 'function') {
      return source()
    }

    if (source && typeof source === 'object' && 'value' in source) {
      return source.value
    }

    return source
  })
}))
const protectedExecute = vi.hoisted(() => vi.fn())
const protectedInvalidate = vi.hoisted(() => vi.fn())

vi.mock('../../../../app/composables/useAccountBootstrap', () => ({
  useAccountBootstrap
}))

vi.mock('../../../../app/composables/useApiClient', () => ({
  useApiClient: () => requestFetch
}))

vi.mock('../../../../app/composables/useAuthorizationCache', () => ({
  useAuthorizationCache: () => ({
    protectedKey: (key: unknown) => key
  })
}))

vi.mock('../../../../app/composables/useProtectedRequestOwner', () => ({
  buildProtectedRequestKey,
  resolveProtectedWatchSources,
  useProtectedRequestOwner
}))

describe('useApiFetch', () => {
  beforeEach(() => {
    vi.resetModules()
    requestFetch.mockReset()
    useFetch.mockReset()
    useAccountBootstrap.mockReset()
    ensureLoaded.mockReset()
    useProtectedRequestOwner.mockReset()
    protectedExecute.mockReset()
    protectedInvalidate.mockReset()

    useAccountBootstrap.mockReturnValue({ ensureLoaded })
    protectedExecute.mockImplementation(async (
      _key: string,
      signal: AbortSignal,
      load: (signal: AbortSignal) => Promise<unknown>
    ) => await load(signal))
    useProtectedRequestOwner.mockReturnValue({
      execute: protectedExecute,
      invalidate: protectedInvalidate
    })
    useFetch.mockReturnValue({})
    vi.stubGlobal('useFetch', useFetch)
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  test('holds protected transport until the shared bootstrap resolves', async () => {
    let releaseBootstrap!: () => void
    const bootstrapReady = new Promise<void>((resolve) => {
      releaseBootstrap = resolve
    })
    ensureLoaded.mockReturnValue(bootstrapReady)

    const { useApiFetch } = await import('../../../../app/composables/useProtectedApiFetch')
    useApiFetch('/api/events?page=1')

    const fetchOptions = useFetch.mock.calls[0]?.[1] as { $fetch: typeof requestFetch }
    const signal = new AbortController().signal
    const pending = fetchOptions.$fetch('/api/events?page=1', { signal })
    await Promise.resolve()

    expect(ensureLoaded).toHaveBeenCalledWith(signal)
    expect(requestFetch).not.toHaveBeenCalled()
    releaseBootstrap()
    await pending

    expect(requestFetch).toHaveBeenCalledWith('/api/events?page=1', expect.objectContaining({ signal }))
  })

  test('changes the shared key before a watched request shape executes', async () => {
    const watchedValue = ref('first')
    const request = ref('/api/events/first')
    const { useApiFetch } = await import('../../../../app/composables/useProtectedApiFetch')
    useApiFetch(request, {
      key: 'shared-events',
      query: computed(() => ({ page: watchedValue.value })),
      watch: [watchedValue]
    })

    const fetchOptions = useFetch.mock.calls[0]?.[1] as {
      key: unknown
      $fetch: typeof requestFetch
    }
    const firstKey = toValue(fetchOptions.key as never)

    watchedValue.value = 'second'
    request.value = '/api/events/second'
    await nextTick()

    expect(toValue(fetchOptions.key as never)).not.toBe(firstKey)
    await fetchOptions.$fetch('/api/events/second', {
      query: { page: 'second' },
      signal: new AbortController().signal
    })

    expect(protectedExecute.mock.calls[0]?.[0]).toBe(toValue(fetchOptions.key as never))
  })
})
