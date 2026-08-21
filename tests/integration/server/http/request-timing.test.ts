import { afterEach, describe, expect, test } from 'vitest'

import { d1BookmarkHeader, getDatabase } from '../../../../server/database/client'
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
})
