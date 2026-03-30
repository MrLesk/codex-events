import { afterEach, describe, expect, test, vi } from 'vitest'

import { defineApiHandler } from '../../../../server/utils/api-handler'
import { ApiError } from '../../../../server/utils/api-error'
import { createApiRouteTestHarness } from '../../../support/backend/api-route'

describe('api handler error responses', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  test('sanitizes unexpected errors and logs them server-side', async () => {
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const harness = createApiRouteTestHarness({
      routes: [
        {
          method: 'get',
          path: '/api/test-error',
          handler: defineApiHandler(() => {
            throw new Error('database exploded')
          })
        }
      ]
    })

    const response = await harness.request('/api/test-error')

    expect(response.status).toBe(500)
    expect(await response.json()).toEqual({
      error: {
        code: 'internal_error',
        message: 'An unexpected error occurred.'
      }
    })
    expect(consoleErrorSpy).toHaveBeenCalledWith('Unhandled API error', expect.objectContaining({
      method: 'GET',
      url: '/api/test-error',
      error: expect.objectContaining({
        message: 'database exploded'
      })
    }))
  })

  test('preserves explicit ApiError responses without logging them as unexpected', async () => {
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const harness = createApiRouteTestHarness({
      routes: [
        {
          method: 'get',
          path: '/api/test-api-error',
          handler: defineApiHandler(() => {
            throw new ApiError({
              statusCode: 409,
              code: 'invalid_state',
              message: 'Already locked.',
              details: {
                state: 'submitted'
              }
            })
          })
        }
      ]
    })

    const response = await harness.request('/api/test-api-error')

    expect(response.status).toBe(409)
    expect(await response.json()).toEqual({
      error: {
        code: 'invalid_state',
        message: 'Already locked.',
        details: {
          state: 'submitted'
        }
      }
    })
    expect(consoleErrorSpy).not.toHaveBeenCalled()
  })
})
