import type { H3Event } from 'h3'

import { describe, expect, test, vi } from 'vitest'

import { ApiError } from '../../../../server/http/api-error'
import { getDatabase, withDatabaseBatch, type AppDatabase } from '../../../../server/database/client'
import { resolveNonHttpD1Binding, setTestDatabase } from '../../../../server/database/non-http'

function assertApplicationDatabaseClientType(client: AppDatabase['$client']) {
  void client.prepare
  void client.batch
  // @ts-expect-error Application database clients must not expose raw D1 session construction.
  void client.withSession
  // @ts-expect-error Application database clients must not expose raw D1 execution.
  void client.exec
}

function createEvent(binding?: unknown): H3Event {
  return {
    context: {
      cloudflare: {
        env: binding ? { DB: binding } : {}
      }
    }
  } as H3Event
}

describe('resolveNonHttpD1Binding', () => {
  test('prefers the Cloudflare binding when present', () => {
    const binding = { prepare() {} }

    expect(resolveNonHttpD1Binding('DB', { DB: binding }, undefined)).toBe(binding)
  })

  test('falls back to an injected binding for non-Cloudflare execution contexts', () => {
    const binding = { prepare() {} }

    expect(resolveNonHttpD1Binding('DB', undefined, binding as never)).toBe(binding)
  })

  test('throws a stable API error when no binding is available', () => {
    expect(() => resolveNonHttpD1Binding('DB')).toThrow(ApiError)
  })

  test('caches the request-scoped database instance', () => {
    const event = createEvent({
      prepare: vi.fn(),
      batch: vi.fn(),
      withSession: vi.fn(() => ({
        prepare: vi.fn(),
        batch: vi.fn(),
        getBookmark: () => null
      }))
    })

    const first = getDatabase(event)
    const second = getDatabase(event)

    expect(first).toBe(second)
  })

  test('uses strong consistency by default for HTTP requests', () => {
    const withSession = vi.fn(() => ({
      prepare: vi.fn(),
      batch: vi.fn(),
      getBookmark: () => null
    }))
    const event = createEvent({
      prepare: vi.fn(),
      batch: vi.fn(),
      withSession
    })

    getDatabase(event)

    expect(withSession).toHaveBeenCalledWith('first-primary')
  })

  test('keeps raw D1 capabilities out of the returned application database client', async () => {
    const session = {
      prepare: vi.fn(),
      batch: vi.fn(),
      getBookmark: vi.fn(() => null)
    }
    const binding = {
      prepare: vi.fn(),
      batch: vi.fn(),
      withSession: vi.fn(() => session)
    }
    const database = getDatabase(createEvent(binding))

    assertApplicationDatabaseClientType(database.$client)
    database.$client.prepare('select 1')
    await database.$client.batch([])

    expect(Object.keys(database.$client).sort()).toEqual(['batch', 'prepare'])
    expect(database.$client).not.toBe(binding)
    expect('withSession' in database.$client).toBe(false)
    expect('getBookmark' in database.$client).toBe(false)
    expect('exec' in database.$client).toBe(false)
    expect(session.prepare).toHaveBeenCalledWith('select 1')
    expect(session.batch).toHaveBeenCalledTimes(1)
  })

  test('allows direct database injection only on non-HTTP events', () => {
    const event = createEvent()
    const injectedDatabase = { query: {} } as never

    setTestDatabase(event, injectedDatabase)

    expect(getDatabase(event)).toBe(injectedDatabase)
  })

  test('does not allow HTTP requests to use an injected database', () => {
    const binding = {
      prepare: vi.fn(),
      batch: vi.fn(),
      withSession: vi.fn(() => ({
        prepare: vi.fn(),
        batch: vi.fn(),
        getBookmark: () => null
      }))
    }
    const event = createEvent(binding)
    event.node = { req: {} as never, res: {} as never } as never
    const injectedDatabase = { query: {} } as never
    Object.defineProperty(event.context, 'appDbAccess', {
      configurable: true,
      enumerable: true,
      value: { database: injectedDatabase }
    })
    Object.defineProperty(event.context, 'appDb', {
      configurable: true,
      enumerable: true,
      value: injectedDatabase
    })

    expect(() => setTestDatabase(event, injectedDatabase)).toThrow(ApiError)
    expect(getDatabase(event)).not.toBe(injectedDatabase)
    expect(binding.withSession).toHaveBeenCalledWith('first-primary')
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
