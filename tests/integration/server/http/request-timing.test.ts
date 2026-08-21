import { afterEach, describe, expect, test } from 'vitest'

import { d1BookmarkHeader, getDatabase, getDatabaseSession } from '../../../../server/database/client'
import eventsGetHandler from '../../../../server/api/events/index.get'
import publicEventsGetHandler from '../../../../server/api/public/events/index.get'
import platformLegalSettingsCurrentGetHandler from '../../../../server/api/platform-legal-settings/current.get'
import { defineApiHandler } from '../../../../server/http/api-handler'
import { apiData } from '../../../../server/http/api-response'
import { createApiRouteTestHarness } from '../../../support/backend/api-route'

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
    expect(timing).toMatch(/d1-exec-total;dur=\d+\.\d+;desc="executions=2;statements=3;overflow=0"/u)
    expect(timing).toMatch(/d1-db-total;dur=\d+\.\d+;desc="unknown=0;attempts=3;attempts-unknown=0;region=test-region;colo=test-colo;primary=1"/u)
    expect(timing).toMatch(/d1-exec-1;dur=\d+\.\d+;desc="ordinal=1;api=prepare;kind=all;statements=1;db=0\.00;attempts=1;attempts-unknown=0;region=test-region;colo=test-colo;primary=1"/u)
    expect(timing).toMatch(/d1-exec-2;dur=\d+\.\d+;desc="ordinal=2;api=batch;kind=batch;statements=2;db=0\.00;attempts=2;attempts-unknown=0;region=test-region;colo=test-colo;primary=1"/u)
    expect(timing).not.toContain('select')
    expect(timing).not.toContain('secret-value')
    expect(timing).not.toContain('$client')
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
    expect(errorTiming).toMatch(/d1-exec-total;dur=\d+\.\d+;desc="executions=1;statements=1;overflow=0"/u)
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
    expect(timing).toMatch(/d1-exec-total;dur=\d+\.\d+;desc="executions=12;statements=12;overflow=4"/u)
    expect(timing.length).toBeLessThan(5000)
  })
})
