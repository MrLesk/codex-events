import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'

const requestFetch = vi.hoisted(() => vi.fn())
const useFetch = vi.hoisted(() => vi.fn())
const useAccountBootstrap = vi.hoisted(() => vi.fn())
const ensureLoaded = vi.hoisted(() => vi.fn())

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

describe('useApiFetch', () => {
  beforeEach(() => {
    vi.resetModules()
    requestFetch.mockReset()
    useFetch.mockReset()
    useAccountBootstrap.mockReset()
    ensureLoaded.mockReset()

    useAccountBootstrap.mockReturnValue({ ensureLoaded })
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
})
