import { describe, expect, test } from 'vitest'

import { ApiError, toApiError } from '../../../../server/http/api-error'

describe('api error helpers', () => {
  test('preserve stable API error attributes', () => {
    const error = new ApiError({
      statusCode: 409,
      code: 'invalid_state',
      message: 'Nope',
      details: { currentState: 'draft' }
    })

    expect(error.statusCode).toBe(409)
    expect(error.code).toBe('invalid_state')
    expect(error.details).toEqual({ currentState: 'draft' })
  })

  test('normalize unexpected Error instances into generic internal API errors', () => {
    const normalized = toApiError(new Error('boom'))

    expect(normalized.statusCode).toBe(500)
    expect(normalized.code).toBe('internal_error')
    expect(normalized.message).toBe('An unexpected error occurred.')
    expect(normalized.cause).toBeInstanceOf(Error)
  })

  test('normalize non-Error throwables into generic internal API errors', () => {
    const normalized = toApiError({ boom: true })

    expect(normalized.statusCode).toBe(500)
    expect(normalized.code).toBe('internal_error')
    expect(normalized.message).toBe('An unexpected error occurred.')
    expect(normalized.cause).toEqual({ boom: true })
  })
})
