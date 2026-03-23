import type { H3Event } from 'h3'

import { describe, expect, test, vi } from 'vitest'

import { ApiError } from '../../../../server/utils/api-error'
import { getDatabase, resolveD1Binding, withDatabaseBatch } from '../../../../server/database/client'

function createEvent(binding?: unknown): H3Event {
  return {
    context: {
      cloudflare: {
        env: binding ? { DB: binding } : {}
      }
    }
  } as H3Event
}

describe('resolveD1Binding', () => {
  test('prefers the Cloudflare binding when present', () => {
    const binding = { prepare() {} }

    expect(resolveD1Binding('DB', { DB: binding }, undefined)).toBe(binding)
  })

  test('falls back to an injected binding for non-Cloudflare execution contexts', () => {
    const binding = { prepare() {} }

    expect(resolveD1Binding('DB', undefined, binding as never)).toBe(binding)
  })

  test('throws a stable API error when no binding is available', () => {
    expect(() => resolveD1Binding('DB')).toThrow(ApiError)
  })

  test('caches the request-scoped database instance', () => {
    const event = createEvent({ prepare: vi.fn() })

    const first = getDatabase(event)
    const second = getDatabase(event)

    expect(first).toBe(second)
  })

  test('delegates batches through the shared database instance', async () => {
    const batch = vi.fn(async (queries: string[]) => queries.map(query => `${query}-done`))

    const result = await withDatabaseBatch({
      batch
    } as never, ['query_a', 'query_b'] as never)

    expect(result).toEqual(['query_a-done', 'query_b-done'])
    expect(batch).toHaveBeenCalledTimes(1)
  })
})
