import { describe, expect, test, vi } from 'vitest'
import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { z } from 'zod'

import { executeApplicationOperation } from '../../../../server/application/operations/execute'
import type { ApplicationOperation } from '../../../../server/application/operations/types'

describe('application operation execution', () => {
  test('has one shared final-envelope output-validation call', async () => {
    const source = await readFile(join(process.cwd(), 'server/application/operations/execute.ts'), 'utf8')

    expect(source.match(/validateWithSchema\(/gu)).toHaveLength(1)
    expect(source).toContain('validateWithSchema(operation.outputSchema, output, \'output\')')
  })

  test('owns one operation-envelope output validation after execution', async () => {
    const inputSchema = z.object({})
    const outputSchema = z.object({ data: z.string() })
    const operation = {
      id: 'test.execute',
      toolName: 'test_execute',
      description: 'Test operation',
      rest: { method: 'GET', path: '/api/test' },
      inputSchema,
      outputSchema,
      capabilities: ['public'],
      effect: 'read',
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true
      },
      execute: vi.fn(async () => ({ data: 'ok' }))
    } satisfies ApplicationOperation<typeof inputSchema, typeof outputSchema>
    const safeParse = vi.spyOn(outputSchema, 'safeParse')

    await expect(executeApplicationOperation({} as never, operation, {})).resolves.toEqual({ data: 'ok' })
    expect(safeParse).toHaveBeenCalledOnce()
  })
})
