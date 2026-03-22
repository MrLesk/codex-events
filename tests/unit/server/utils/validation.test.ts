import { describe, expect, test } from 'vitest'
import { z } from 'zod'

import { ApiError } from '../../../../server/utils/api-error'
import { validateWithSchema } from '../../../../server/utils/validation'

describe('validation helpers', () => {
  const schema = z.object({
    email: z.email()
  })

  test('returns typed data when the payload is valid', () => {
    expect(validateWithSchema(schema, { email: 'user@example.com' }, 'body')).toEqual({
      email: 'user@example.com'
    })
  })

  test('throws a stable API error when the payload is invalid', () => {
    expect(() => validateWithSchema(schema, { email: 'not-an-email' }, 'body')).toThrow(ApiError)
  })
})
