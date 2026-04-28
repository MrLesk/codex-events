import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'

const createUseFetch = vi.hoisted(() => vi.fn())
const managedUseFetch = vi.hoisted(() => vi.fn())
const useAsyncData = vi.hoisted(() => vi.fn())

describe('useApiData', () => {
  beforeEach(() => {
    vi.resetModules()
    createUseFetch.mockReset()
    managedUseFetch.mockReset()
    useAsyncData.mockReset()

    createUseFetch.mockReturnValue(managedUseFetch)

    vi.stubGlobal('createUseFetch', createUseFetch)
    vi.stubGlobal('useAsyncData', useAsyncData)
    vi.stubGlobal('useRequestFetch', vi.fn())
    vi.stubGlobal('$fetch', vi.fn())
    vi.stubGlobal('toValue', (value: unknown) =>
      typeof value === 'function'
        ? (value as () => unknown)()
        : value
    )
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  test('creates a shared fetch factory with cancel dedupe and shallow refs by default', async () => {
    await import('../../../../app/composables/useApiData')

    expect(createUseFetch).toHaveBeenCalledWith({
      deep: false,
      dedupe: 'cancel'
    })
  })

  test('passes the selected fetcher and abort signal into useApiData handlers', async () => {
    const clientFetch = vi.fn()
    vi.stubGlobal('$fetch', clientFetch)

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

    expect(request.key).toBe('session-actor:auth0|user')
    expect(request.options).toMatchObject({
      deep: false,
      dedupe: 'cancel'
    })

    const signal = new AbortController().signal

    await expect(request.handler({}, {
      signal
    })).resolves.toEqual({
      actor: 'platform_user'
    })
  })

  test('unwraps canonical api data responses in useApiResponse', async () => {
    const clientFetch = vi.fn().mockResolvedValue({
      data: {
        id: 'privacy'
      }
    })

    vi.stubGlobal('$fetch', clientFetch)

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
