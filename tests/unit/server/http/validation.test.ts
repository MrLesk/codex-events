import { describe, expect, test } from 'vitest'
import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { z } from 'zod'

import { ApiError } from '../../../../server/http/api-error'
import { validateWithSchema } from '../../../../server/http/validation'

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

  test('keeps request validation limited to request input locations', async () => {
    const source = await readFile(join(process.cwd(), 'server/http/validation.ts'), 'utf8')

    expect(source).not.toContain('input === \'output\'')
    expect(source).not.toContain('\'body\' | \'query\' | \'params\' | \'output\'')
  })
})
