import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'

const clientFetch = vi.hoisted(() => vi.fn())
const useApiClient = vi.hoisted(() => vi.fn())
const useAuthorizationCache = vi.hoisted(() => vi.fn())
const useAsyncData = vi.hoisted(() => vi.fn())

vi.mock('../../../../app/composables/useApiClient', () => ({
  useApiClient
}))

vi.mock('../../../../app/composables/useAuthorizationCache', () => ({
  useAuthorizationCache
}))

describe('useApiData', () => {
  beforeEach(() => {
    vi.resetModules()
    clientFetch.mockReset()
    useApiClient.mockReset()
    useAuthorizationCache.mockReset()
    useAsyncData.mockReset()

    useApiClient.mockReturnValue(clientFetch)
    useAuthorizationCache.mockReturnValue({
      protectedKey: (key: string) => `protected-api:0:${key}`
    })

    vi.stubGlobal('useAsyncData', useAsyncData)
    vi.stubGlobal('toValue', (value: unknown) =>
      typeof value === 'function'
        ? (value as () => unknown)()
        : value
    )
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  test('passes the selected fetcher and abort signal into useApiData handlers', async () => {
    useAsyncData.mockImplementation((key, handler, options) => ({
      key,
      handler,
      options
    }))

    const { useApiData } = await import('../../../../app/composables/useApiData')
    const request = useApiData('session-actor:auth0|user', async ({ apiFetch, signal }) => {
      expect(apiFetch).toBe(clientFetch)
      expect(signal).toBeInstanceOf(AbortSignal)

      return {
        actor: 'platform_user'
      }
    }, {
      default: () => ({
        actor: 'anonymous'
      })
    })

    expect(request.key).toBe('protected-api:0:session-actor:auth0|user')
    expect(request.options).toMatchObject({
      deep: false,
      dedupe: 'cancel'
    })
    expect(useApiClient).toHaveBeenCalledOnce()

    const signal = new AbortController().signal

    await expect(request.handler({}, {
      signal
    })).resolves.toEqual({
      actor: 'platform_user'
    })
  })

  test('keeps public async-data keys independent from authorization generation', async () => {
    useAsyncData.mockImplementation((key, handler, options) => ({
      key,
      handler,
      options
    }))

    const { useApiData } = await import('../../../../app/composables/useApiData')
    const request = useApiData('public-event', async () => ({ title: 'Public' }), {
      cacheScope: 'public'
    })

    expect(request.key).toBe('public-event')
    expect(useAuthorizationCache).not.toHaveBeenCalled()
  })

  test('unwraps canonical api data responses in useApiResponse', async () => {
    clientFetch.mockResolvedValue({
      data: {
        id: 'privacy'
      }
    })

    useAsyncData.mockImplementation((key, handler, options) => ({
      key,
      handler,
      options
    }))

    const { useApiResponse } = await import('../../../../app/composables/useApiData')
    const request = useApiResponse('current-platform-documents', '/api/platform-documents/current', {
      default: () => null
    })
    const signal = new AbortController().signal

    await expect(request.handler({}, {
      signal
    })).resolves.toEqual({
      id: 'privacy'
    })

    expect(clientFetch).toHaveBeenCalledWith('/api/platform-documents/current', {
      signal
    })
  })
})
