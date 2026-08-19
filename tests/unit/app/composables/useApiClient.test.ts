import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'

const requestFetch = vi.hoisted(() => vi.fn())
const states = new Map<string, { value: string | null }>()

describe('useApiClient', () => {
  beforeEach(() => {
    vi.resetModules()
    requestFetch.mockReset()
    states.clear()

    vi.stubGlobal('useState', (key: string, init: () => string | null) => {
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

      for (const hook of (Array.isArray(options?.onResponse)
        ? options.onResponse
        : [options?.onResponse]
      ).filter(Boolean)) {
        await hook({
          request,
          options,
          response
        })
      }

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
})
