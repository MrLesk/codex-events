import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'

const requestFetch = vi.hoisted(() => vi.fn())
const states = new Map<string, { value: unknown }>()

async function invokeHooks(
  options: { onResponse?: unknown, onResponseError?: unknown },
  hookName: 'onResponse' | 'onResponseError',
  context: unknown
) {
  const hooks = (Array.isArray(options[hookName])
    ? options[hookName]
    : [options[hookName]])
    .filter(Boolean) as Array<(value: unknown) => unknown>

  for (const hook of hooks) {
    await hook(context)
  }
}

describe('useApiClient', () => {
  beforeEach(() => {
    vi.resetModules()
    requestFetch.mockReset()
    states.clear()

    vi.stubGlobal('useState', (key: string, init: () => unknown) => {
      const existing = states.get(key)

      if (existing) {
        return existing
      }

      const state = {
        value: init()
      }
      states.set(key, state)
      return state
    })
    vi.stubGlobal('$fetch', requestFetch)
    vi.stubGlobal('useRequestFetch', () => requestFetch)
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  test('preserves request body, custom headers, AbortSignal, and response hooks', async () => {
    const body = { lumaEmail: 'participant@example.com' }
    const signal = new AbortController().signal
    const onResponse = vi.fn()
    const response = {
      headers: new Headers([['x-d1-bookmark', 'bookmark-body']])
    }
    requestFetch.mockImplementation(async (request, options) => {
      await invokeHooks(options, 'onResponse', { request, options, response })
      return response
    })

    const { useApiClient } = await import('../../../../app/composables/useApiClient')
    const apiClient = useApiClient()
    await apiClient('/api/events/fixture/applications', {
      method: 'POST',
      body,
      headers: {
        'x-client-request': 'registration'
      },
      signal,
      onResponse
    })

    const options = requestFetch.mock.calls[0]?.[1]
    expect(options.body).toBe(body)
    expect(options.signal).toBe(signal)
    expect(options.retry).toBe(false)
    expect(options.headers).toBeInstanceOf(Headers)
    expect(options.headers.get('x-client-request')).toBe('registration')
    expect(options.headers.get('x-d1-bookmark')).toBeNull()
    expect(onResponse).toHaveBeenCalledOnce()
  })

  test('runs onResponseError hooks, captures error bookmarks, and preserves thrown errors', async () => {
    const onResponseError = vi.fn()
    const response = {
      headers: new Headers([['x-d1-bookmark', 'bookmark-error']])
    }
    const expectedError = new Error('request failed')
    requestFetch.mockImplementationOnce(async (request, options) => {
      await invokeHooks(options, 'onResponseError', { request, options, response })
      throw expectedError
    })

    const { useApiClient } = await import('../../../../app/composables/useApiClient')
    const apiClient = useApiClient()
    await expect(apiClient('/api/events/fixture/applications', {
      method: 'POST',
      onResponseError
    })).rejects.toBe(expectedError)

    expect(onResponseError).toHaveBeenCalledOnce()

    requestFetch.mockImplementationOnce(async (_request, _options) => ({
      headers: new Headers()
    }))
    await apiClient('/api/events/fixture/applications/me')

    expect(requestFetch.mock.calls[1]?.[1].headers.get('x-d1-bookmark')).toBe('bookmark-error')
  })

  test('carries the latest response bookmark from a mutation into the next read', async () => {
    const responses = [
      {
        headers: new Headers([['x-d1-bookmark', 'bookmark-1']])
      },
      {
        headers: new Headers()
      }
    ]

    requestFetch.mockImplementation(async (request, options) => {
      const response = responses.shift()

      await invokeHooks(options, 'onResponse', {
        request,
        options,
        response
      })

      return response
    })

    const { useApiClient } = await import('../../../../app/composables/useApiClient')
    const apiClient = useApiClient()

    await apiClient('/api/prize-redemptions/redemption-1/actions/redeem', {
      method: 'POST'
    })
    await apiClient('/api/prize-redemptions/me')

    const firstOptions = requestFetch.mock.calls[0]?.[1]
    const secondOptions = requestFetch.mock.calls[1]?.[1]

    expect(firstOptions.headers).toBeInstanceOf(Headers)
    expect(firstOptions.headers.get('x-d1-bookmark')).toBeNull()
    expect(secondOptions.headers).toBeInstanceOf(Headers)
    expect(secondOptions.headers.get('x-d1-bookmark')).toBe('bookmark-1')
  })

  test('does not let a late response from an older concurrent request overwrite a newer bookmark', async () => {
    const deferred = new Map<string, {
      options: { onResponse?: unknown, onResponseError?: unknown }
      resolve: (value: unknown) => void
    }>()
    requestFetch.mockImplementation((request, options) => new Promise((resolve) => {
      deferred.set(String(request), { options, resolve })
    }))

    const { useApiClient } = await import('../../../../app/composables/useApiClient')
    const apiClient = useApiClient()
    const olderRequest = apiClient('/api/older')
    const newerRequest = apiClient('/api/newer')

    const newer = deferred.get('/api/newer')!
    await invokeHooks(newer.options, 'onResponse', {
      request: '/api/newer',
      options: newer.options,
      response: {
        headers: new Headers([['x-d1-bookmark', 'bookmark-newer']])
      }
    })
    newer.resolve({ headers: new Headers() })
    await newerRequest

    const older = deferred.get('/api/older')!
    await invokeHooks(older.options, 'onResponse', {
      request: '/api/older',
      options: older.options,
      response: {
        headers: new Headers([['x-d1-bookmark', 'bookmark-older']])
      }
    })
    older.resolve({ headers: new Headers() })
    await olderRequest

    requestFetch.mockImplementationOnce(async (_request, _options) => ({
      headers: new Headers()
    }))
    await apiClient('/api/latest')

    expect(requestFetch.mock.calls.at(-1)?.[1].headers.get('x-d1-bookmark')).toBe('bookmark-newer')
  })
})
