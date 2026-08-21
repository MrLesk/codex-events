import { afterEach, describe, expect, test, vi } from 'vitest'

import { d1BookmarkHeader, getDatabase, getDatabaseSession } from '../../../../server/database/client'
import eventsGetHandler from '../../../../server/api/events/index.get'
import publicEventsGetHandler from '../../../../server/api/public/events/index.get'
import platformLegalSettingsCurrentGetHandler from '../../../../server/api/platform-legal-settings/current.get'
import { defineApiHandler } from '../../../../server/http/api-handler'
import { apiData } from '../../../../server/http/api-response'
import { createApiRouteTestHarness } from '../../../support/backend/api-route'

function createD1Result(meta: Record<string, unknown>, results: unknown[] = []) {
  return {
    success: true,
    meta,
    results
  }
}

function createStubD1Binding(options?: {
  batchResults?: unknown[]
  onAll?: (query: string) => Promise<unknown>
}) {
  const createStatement = (query: string) => ({
    bind: vi.fn(() => createStatement(query)),
    first: vi.fn(async () => null),
    run: vi.fn(async () => createD1Result({
      timings: { sql_duration_ms: 0 },
      total_attempts: 1,
      served_by_region: 'test-region',
      served_by_colo: 'test-colo',
      served_by_primary: true
    })),
    all: vi.fn(async () => options?.onAll?.(query) ?? createD1Result({
      timings: { sql_duration_ms: 0 },
      total_attempts: 1,
      served_by_region: 'test-region',
      served_by_colo: 'test-colo',
      served_by_primary: true
    })),
    raw: vi.fn(async () => [])
  })
  const session = {
    prepare: vi.fn((query: string) => createStatement(query)),
    batch: vi.fn(async () => options?.batchResults ?? []),
    getBookmark: vi.fn(() => null)
  }
  const binding = {
    prepare: vi.fn((query: string) => createStatement(query)),
    batch: vi.fn(async () => options?.batchResults ?? []),
    withSession: vi.fn(() => session)
  }

  return { binding, session }
}

describe('protected request timing', () => {
  const harnesses: Array<ReturnType<typeof createApiRouteTestHarness>> = []

  afterEach(async () => {
    while (harnesses.length > 0) {
      await harnesses.pop()?.d1Database.close()
    }
  })

  test('reports application phases and the strong first-primary session without exposing a bookmark', async () => {
    const harness = createApiRouteTestHarness({
      routes: [{
        method: 'get',
        path: '/api/request-timing',
        handler: defineApiHandler(async (event) => {
          await getDatabase(event).query.users.findFirst()
          return apiData({ ok: true })
        })
      }]
    })
    harnesses.push(harness)

    const response = await harness.request('/api/request-timing')
    const timing = response.headers.get('server-timing')

    expect(response.status).toBe(200)
    expect(timing).toMatch(/actor;dur=\d+\.\d+/u)
    expect(timing).toMatch(/authorization;dur=\d+\.\d+/u)
    expect(timing).toMatch(/database-session;dur=\d+\.\d+/u)
    expect(timing).toMatch(/d1;dur=\d+\.\d+;desc="strong:first-primary"/u)
    expect(timing).toMatch(/serialization;dur=\d+\.\d+/u)
    expect(timing).toMatch(/total;dur=\d+\.\d+/u)
    expect(timing).not.toContain('test-bookmark')
  })

  test('labels a bookmark-anchored strong session separately from first-primary', async () => {
    const harness = createApiRouteTestHarness({
      routes: [{
        method: 'get',
        path: '/api/request-timing-bookmark',
        handler: defineApiHandler(async (event) => {
          await getDatabase(event).query.users.findFirst()
          return apiData({ ok: true })
        })
      }]
    })
    harnesses.push(harness)

    await harness.request('/api/request-timing-bookmark')
    const bookmark = harness.d1Database.getLatestBookmark()
    expect(bookmark).toBeTruthy()

    const response = await harness.request('/api/request-timing-bookmark', {
      headers: { [d1BookmarkHeader]: bookmark ?? '' }
    })
    const timing = response.headers.get('server-timing')

    expect(response.status).toBe(200)
    expect(timing).toContain('d1;dur=')
    expect(timing).toContain('desc="strong:bookmark"')
    expect(timing).not.toContain(bookmark ?? '')
  })

  test.each(['first-unconstrained', 'first-primary', 'first-replica', 'unconstrained'])('rejects constraint-like incoming D1 session value %s before withSession', async (constraint) => {
    const harness = createApiRouteTestHarness({
      routes: [{
        method: 'get',
        path: '/api/request-timing-invalid-bookmark',
        handler: defineApiHandler(async (event) => {
          await getDatabase(event).query.users.findFirst()
          return apiData({ ok: true })
        })
      }]
    })
    harnesses.push(harness)

    const response = await harness.request('/api/request-timing-invalid-bookmark', {
      headers: { [d1BookmarkHeader]: constraint }
    })
    const timing = response.headers.get('server-timing') ?? ''

    expect(response.status).toBe(400)
    expect(harness.d1Database.sessionStarts).toEqual([])
    expect(timing).not.toContain('strong:bookmark')
    expect(timing).not.toContain('first-unconstrained')
    expect(timing).not.toContain('first-primary')
  })

  test('attributes shared database setup and D1 work on public structured reads', async () => {
    const harness = createApiRouteTestHarness({
      routes: [
        { method: 'get', path: '/api/events', handler: eventsGetHandler },
        { method: 'get', path: '/api/public/events', handler: publicEventsGetHandler },
        { method: 'get', path: '/api/platform-legal-settings/current', handler: platformLegalSettingsCurrentGetHandler }
      ],
      sessionUser: null
    })
    harnesses.push(harness)

    const responses = await Promise.all([
      harness.request('/api/events?page=1&page_size=1'),
      harness.request('/api/public/events?page=1&page_size=1'),
      harness.request('/api/platform-legal-settings/current')
    ])

    for (const response of responses) {
      const timing = response.headers.get('server-timing')
      expect(response.status).toBe(200)
      expect(timing).toMatch(/database-session;dur=\d+\.\d+/u)
      expect(timing).toMatch(/d1;dur=\d+\.\d+;desc="strong:first-primary"/u)
      expect(timing).toMatch(/total;dur=\d+\.\d+/u)
    }
  })

  test('attributes prepared and batched session executions without exposing query details', async () => {
    const harness = createApiRouteTestHarness({
      routes: [{
        method: 'get',
        path: '/api/request-timing-executions',
        handler: defineApiHandler(async (event) => {
          const session = getDatabaseSession(event)
          await session.prepare('select ?').bind('secret-value').all()
          await session.batch([
            session.prepare('select 1'),
            session.prepare('select 2')
          ])
          return apiData({ ok: true })
        })
      }]
    })
    harnesses.push(harness)

    const response = await harness.request('/api/request-timing-executions')
    const timing = response.headers.get('server-timing') ?? ''

    expect(response.status).toBe(200)
    expect(timing).toMatch(/d1-exec-total;dur=\d+\.\d+;desc="executions=2;complete=2;inflight=0;statements=3;inflight-statements=0;overflow=0"/u)
    expect(timing).toMatch(/d1-db-total;dur=\d+\.\d+;desc="unknown=0;attempts=3;attempts-unknown=0;region=test-region;colo=test-colo;primary=1"/u)
    expect(timing).toMatch(/d1-exec-1;dur=\d+\.\d+;desc="ordinal=1;api=prepare;kind=all;status=complete;statements=1;db=0\.00;attempts=1;attempts-unknown=0;region=test-region;colo=test-colo;primary=1"/u)
    expect(timing).toMatch(/d1-exec-2;dur=\d+\.\d+;desc="ordinal=2;api=batch;kind=batch;status=complete;statements=2;db=0\.00;attempts=2;attempts-unknown=0;region=test-region;colo=test-colo;primary=1;stmt=1:db=0\.00;attempts=1;attempts-unknown=0;region=test-region;colo=test-colo;primary=1\|2:db=0\.00;attempts=1;attempts-unknown=0;region=test-region;colo=test-colo;primary=1;stmt-overflow=0"/u)
    expect(timing).not.toContain('select')
    expect(timing).not.toContain('secret-value')
    expect(timing).not.toContain('$client')
  })

  test('keeps first and raw execution metadata explicitly unknown', async () => {
    const harness = createApiRouteTestHarness({
      routes: [{
        method: 'get',
        path: '/api/request-timing-unknown-shapes',
        handler: defineApiHandler(async (event) => {
          const session = getDatabaseSession(event)
          await session.prepare('select 1').first()
          await session.prepare('select 1').raw()
          return apiData({ ok: true })
        })
      }]
    })
    harnesses.push(harness)

    const response = await harness.request('/api/request-timing-unknown-shapes')
    const timing = response.headers.get('server-timing') ?? ''

    expect(response.status).toBe(200)
    expect(timing).toMatch(/d1-exec-total;dur=\d+\.\d+;desc="executions=2;complete=2;inflight=0;statements=2;inflight-statements=0;overflow=0"/u)
    expect(timing).toMatch(/d1-db-total;dur=\d+\.\d+;desc="unknown=2;attempts=0;attempts-unknown=2;region=unknown;colo=unknown;primary=unknown"/u)
    expect(timing).toMatch(/d1-exec-1;dur=\d+\.\d+;desc="ordinal=1;api=prepare;kind=first;status=complete;statements=1;db=0\.00;db-unknown=1;attempts=0;attempts-unknown=1;region=unknown;colo=unknown;primary=unknown"/u)
    expect(timing).toMatch(/d1-exec-2;dur=\d+\.\d+;desc="ordinal=2;api=prepare;kind=raw;status=complete;statements=1;db=0\.00;db-unknown=1;attempts=0;attempts-unknown=1;region=unknown;colo=unknown;primary=unknown"/u)
  })

  test('attributes ordered batch metadata and marks missing or mixed serving fields', async () => {
    const { binding } = createStubD1Binding({
      batchResults: [
        createD1Result({
          timings: { sql_duration_ms: 0.25 },
          total_attempts: 1,
          served_by_region: 'region-a',
          served_by_colo: 'colo-a',
          served_by_primary: true
        }),
        createD1Result({
          timings: { sql_duration_ms: 0.5 },
          total_attempts: 2
        }),
        createD1Result({
          timings: { sql_duration_ms: 0.75 },
          total_attempts: 1,
          served_by_region: 'region-b',
          served_by_colo: 'colo-b',
          served_by_primary: false
        })
      ]
    })
    const harness = createApiRouteTestHarness({
      cloudflareEnv: { DB: binding },
      routes: [{
        method: 'get',
        path: '/api/request-timing-batch-metadata',
        handler: defineApiHandler(async (event) => {
          const session = getDatabaseSession(event)
          await session.batch([
            session.prepare('select first'),
            session.prepare('select second'),
            session.prepare('select third')
          ])
          return apiData({ ok: true })
        })
      }]
    })
    harnesses.push(harness)

    const response = await harness.request('/api/request-timing-batch-metadata')
    const timing = response.headers.get('server-timing') ?? ''

    expect(response.status).toBe(200)
    expect(timing).toContain('d1-db-total;dur=1.50;desc="unknown=0;attempts=4;attempts-unknown=0;region=mixed;colo=mixed;primary=mixed"')
    expect(timing).toContain('d1-exec-1;dur=')
    expect(timing).toContain('stmt=1:db=0.25;attempts=1;attempts-unknown=0;region=region-a;colo=colo-a;primary=1|2:db=0.50;attempts=2;attempts-unknown=0;region=unknown;colo=unknown;primary=unknown|3:db=0.75;attempts=1;attempts-unknown=0;region=region-b;colo=colo-b;primary=0;stmt-overflow=0')
    expect(timing).not.toContain('select first')
    expect(timing).not.toContain('select second')
  })

  test('reports an outstanding sibling when Promise.all rejects early', async () => {
    let releaseSibling: () => void = () => {}
    const sibling = new Promise<void>((resolve) => {
      releaseSibling = resolve
    })
    const { binding } = createStubD1Binding({
      onAll: async (query) => {
        if (query === 'fail-fast') {
          throw new Error('expected failure')
        }

        await sibling
        return createD1Result({
          timings: { sql_duration_ms: 0 },
          total_attempts: 1,
          served_by_region: 'test-region',
          served_by_colo: 'test-colo',
          served_by_primary: true
        })
      }
    })
    const harness = createApiRouteTestHarness({
      cloudflareEnv: { DB: binding },
      routes: [{
        method: 'get',
        path: '/api/request-timing-inflight',
        handler: defineApiHandler(async (event) => {
          const session = getDatabaseSession(event)
          await Promise.all([
            session.prepare('fail-fast').all(),
            session.prepare('outstanding-sibling').all()
          ])
          return apiData({ ok: true })
        })
      }]
    })
    harnesses.push(harness)

    const response = await harness.request('/api/request-timing-inflight')
    const timing = response.headers.get('server-timing') ?? ''

    expect(response.status).toBe(500)
    expect(timing).toMatch(/d1-exec-total;dur=\d+\.\d+;desc="executions=2;complete=1;inflight=1;statements=2;inflight-statements=1;overflow=0"/u)
    expect(timing).toContain('status=failed')
    expect(timing).toContain('status=inflight')

    releaseSibling()
  })

  test('rejects a foreign-session statement before timing or executing a batch', async () => {
    const foreignStatement = { value: undefined as unknown }
    const harness = createApiRouteTestHarness({
      routes: [{
        method: 'get',
        path: '/api/request-timing-foreign-batch',
        handler: defineApiHandler(async (event) => {
          await getDatabaseSession(event).batch([foreignStatement.value as never])
          return apiData({ ok: true })
        })
      }]
    })
    harnesses.push(harness)
    foreignStatement.value = harness.d1Database.withSession('first-primary').prepare('select 1')

    const response = await harness.request('/api/request-timing-foreign-batch')
    const timing = response.headers.get('server-timing') ?? ''

    expect(response.status).toBe(500)
    expect(harness.d1Database.queries).toEqual([])
    expect(timing).toMatch(/d1-exec-total;dur=\d+\.\d+;desc="executions=0;complete=0;inflight=0;statements=0;inflight-statements=0;overflow=0"/u)
    expect(timing).not.toContain('d1-exec-1;')
  })

  test('keeps execution ordinals request-scoped and emits a failed execution timing', async () => {
    const harness = createApiRouteTestHarness({
      routes: [
        {
          method: 'get',
          path: '/api/request-timing-ordinal',
          handler: defineApiHandler(async (event) => {
            await getDatabaseSession(event).prepare('select 1').all()
            return apiData({ ok: true })
          })
        },
        {
          method: 'get',
          path: '/api/request-timing-error',
          handler: defineApiHandler(async (event) => {
            await getDatabaseSession(event).prepare('select missing_column').all()
            return apiData({ ok: true })
          })
        }
      ]
    })
    harnesses.push(harness)

    const firstResponse = await harness.request('/api/request-timing-ordinal')
    const secondResponse = await harness.request('/api/request-timing-ordinal')
    const errorResponse = await harness.request('/api/request-timing-error')
    const firstTiming = firstResponse.headers.get('server-timing') ?? ''
    const secondTiming = secondResponse.headers.get('server-timing') ?? ''
    const errorTiming = errorResponse.headers.get('server-timing') ?? ''

    expect(firstResponse.status).toBe(200)
    expect(secondResponse.status).toBe(200)
    expect(firstTiming).toContain('d1-exec-1;')
    expect(secondTiming).toContain('d1-exec-1;')
    expect(firstTiming).not.toMatch(/d1-exec-2;/u)
    expect(secondTiming).not.toMatch(/d1-exec-2;/u)
    expect(errorResponse.status).toBe(500)
    expect(errorTiming).toContain('d1-exec-1;')
    expect(errorTiming).toMatch(/d1-exec-total;dur=\d+\.\d+;desc="executions=1;complete=1;inflight=0;statements=1;inflight-statements=0;overflow=0"/u)
    expect(errorTiming).toMatch(/d1-db-total;dur=\d+\.\d+;desc="unknown=1;attempts=0;attempts-unknown=1;region=unknown;colo=unknown;primary=unknown"/u)
    expect(errorTiming).not.toContain('missing_column')
  })

  test('bounds per-execution timing entries and summarizes overflow', async () => {
    const harness = createApiRouteTestHarness({
      routes: [{
        method: 'get',
        path: '/api/request-timing-bounds',
        handler: defineApiHandler(async (event) => {
          const session = getDatabaseSession(event)
          for (let index = 0; index < 12; index += 1) {
            await session.prepare('select 1').all()
          }
          return apiData({ ok: true })
        })
      }]
    })
    harnesses.push(harness)

    const response = await harness.request('/api/request-timing-bounds')
    const timing = response.headers.get('server-timing') ?? ''
    const reportedExecutions = timing.match(/d1-exec-\d+;/gu) ?? []

    expect(response.status).toBe(200)
    expect(reportedExecutions).toHaveLength(8)
    expect(timing).toMatch(/d1-exec-total;dur=\d+\.\d+;desc="executions=12;complete=12;inflight=0;statements=12;inflight-statements=0;overflow=4"/u)
    expect(timing.length).toBeLessThan(5000)
  })
})
