import { afterAll, afterEach, beforeAll, describe, expect, test, vi } from 'vitest'
import { eventHandler } from 'h3'

import {
  d1BookmarkHeader,
  getDatabase,
  getDatabaseSession,
  getPublicReplicaDatabase
} from '../../../../server/database/client'
import { ApiError } from '../../../../server/http/api-error'
import { defineApiHandler } from '../../../../server/http/api-handler'
import { apiData } from '../../../../server/http/api-response'
import { users } from '../../../../server/database/schema'
import { createApiRouteTestHarness } from '../../../support/backend/api-route'

describe('request-scoped D1 sessions', () => {
  const harnesses: Array<ReturnType<typeof createApiRouteTestHarness>> = []
  let databaseBookmarkPlugin: unknown

  beforeAll(async () => {
    vi.stubGlobal('defineNitroPlugin', (plugin: unknown) => plugin)
    databaseBookmarkPlugin = (await import('../../../../server/plugins/database-bookmark')).default
  })

  afterAll(() => {
    vi.unstubAllGlobals()
  })

  afterEach(async () => {
    while (harnesses.length > 0) {
      await harnesses.pop()?.d1Database.close()
    }
  })

  test('reuses one Drizzle client and starts a read-only request with strong consistency by default', async () => {
    const harness = createApiRouteTestHarness({
      routes: [
        {
          method: 'get',
          path: '/api/database/read',
          handler: defineApiHandler(async (event) => {
            const firstDatabase = getDatabase(event)
            const secondDatabase = getDatabase(event)
            const user = await firstDatabase.query.users.findFirst()

            return apiData({
              sameDatabase: firstDatabase === secondDatabase,
              userId: user?.id ?? null
            })
          })
        }
      ],
      nitroPlugins: [databaseBookmarkPlugin as never]
    })
    harnesses.push(harness)

    await harness.database.insert(users).values({
      id: 'read_user',
      auth0Subject: 'local|read_user',
      email: 'read@example.com',
      displayName: 'Read User'
    })

    const response = await harness.request('/api/database/read')

    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({
      data: {
        sameDatabase: true,
        userId: 'read_user'
      }
    })
    expect(response.headers.get(d1BookmarkHeader)).toBe('test-bookmark-1')
    expect(harness.d1Database.sessionStarts).toEqual(['first-primary'])
  })

  test('anchors mutations from an incoming bookmark and preserves read-after-write data', async () => {
    const harness = createApiRouteTestHarness({
      routes: [
        {
          method: 'get',
          path: '/api/database/bookmark-source',
          handler: defineApiHandler(async (event) => {
            await getDatabase(event).query.users.findFirst()
            return apiData({ ready: true })
          })
        },
        {
          method: 'post',
          path: '/api/database/bookmark-write',
          handler: defineApiHandler(async (event) => {
            await getDatabase(event).insert(users).values({
              id: 'written_user',
              auth0Subject: 'local|written_user',
              email: 'written@example.com',
              displayName: 'Written User'
            })

            return apiData({ written: true })
          })
        },
        {
          method: 'get',
          path: '/api/database/bookmark-read',
          handler: defineApiHandler(async (event) => {
            const user = await getDatabase(event).query.users.findFirst()
            return apiData({ userId: user?.id ?? null })
          })
        }
      ],
      nitroPlugins: [databaseBookmarkPlugin as never]
    })
    harnesses.push(harness)

    const sourceResponse = await harness.request('/api/database/bookmark-source')
    const sourceBookmark = sourceResponse.headers.get(d1BookmarkHeader)

    expect(sourceBookmark).toBe('test-bookmark-0')

    const writeResponse = await harness.request('/api/database/bookmark-write', {
      method: 'POST',
      headers: {
        [d1BookmarkHeader]: sourceBookmark ?? ''
      }
    })

    expect(writeResponse.status).toBe(200)
    expect(writeResponse.headers.get(d1BookmarkHeader)).toBe('test-bookmark-1')
    expect(harness.d1Database.sessionStarts).toEqual([
      'first-primary',
      sourceBookmark
    ])

    const readResponse = await harness.request('/api/database/bookmark-read', {
      headers: {
        [d1BookmarkHeader]: writeResponse.headers.get(d1BookmarkHeader) ?? ''
      }
    })

    expect(readResponse.status).toBe(200)
    expect(await readResponse.json()).toEqual({
      data: {
        userId: 'written_user'
      }
    })
    expect(harness.d1Database.sessionStarts).toEqual([
      'first-primary',
      sourceBookmark,
      'test-bookmark-1'
    ])
  })

  test('starts a vetted public read on a replica only when explicitly requested', async () => {
    const harness = createApiRouteTestHarness({
      routes: [
        {
          method: 'get',
          path: '/api/public/database/read',
          handler: defineApiHandler(async (event) => {
            await getPublicReplicaDatabase(event).query.users.findFirst()
            return apiData({ ok: true })
          })
        }
      ]
    })
    harnesses.push(harness)

    const response = await harness.request('/api/public/database/read')

    expect(response.status).toBe(200)
    expect(harness.d1Database.sessionStarts).toEqual(['first-unconstrained'])
  })

  test('uses one recorded session id for Drizzle, raw prepare, and batch operations', async () => {
    const harness = createApiRouteTestHarness({
      routes: [
        {
          method: 'get',
          path: '/api/database/session-operations',
          handler: defineApiHandler(async (event) => {
            await getDatabase(event).query.users.findFirst()
            const session = getDatabaseSession(event)
            await session.prepare('select 1').all()
            await session.batch([session.prepare('select 1')])
            return apiData({ ok: true })
          })
        }
      ]
    })
    harnesses.push(harness)

    const response = await harness.request('/api/database/session-operations')

    expect(response.status).toBe(200)
    expect(harness.d1Database.queries.length).toBeGreaterThanOrEqual(3)
    expect(new Set(harness.d1Database.queries.map(query => query.sessionId)).size).toBe(1)
  })

  test('emits one bookmark for API and raw-route success and error responses', async () => {
    const harness = createApiRouteTestHarness({
      routes: [
        {
          method: 'get',
          path: '/api/database/hook-success',
          handler: defineApiHandler(async (event) => {
            await getDatabase(event).query.users.findFirst()
            return apiData({ ok: true })
          })
        },
        {
          method: 'get',
          path: '/api/database/hook-api-error',
          handler: defineApiHandler(async (event) => {
            await getDatabase(event).query.users.findFirst()
            throw new ApiError({
              statusCode: 409,
              code: 'hook_api_error',
              message: 'The API request failed.'
            })
          })
        },
        {
          method: 'get',
          path: '/raw/database/hook-success',
          handler: eventHandler(async (event) => {
            await getDatabaseSession(event).prepare('select 1').all()
            return { ok: true }
          })
        },
        {
          method: 'get',
          path: '/raw/database/hook-error',
          handler: eventHandler(async (event) => {
            await getDatabaseSession(event).prepare('select 1').all()
            throw new Error('raw route failed')
          })
        }
      ],
      nitroPlugins: [databaseBookmarkPlugin as never]
    })
    harnesses.push(harness)

    const apiSuccessResponse = await harness.request('/api/database/hook-success')
    const apiErrorResponse = await harness.request('/api/database/hook-api-error')
    const rawSuccessResponse = await harness.request('/raw/database/hook-success')
    const rawErrorResponse = await harness.request('/raw/database/hook-error')

    expect(apiSuccessResponse.headers.get(d1BookmarkHeader)).toBe('test-bookmark-0')
    expect(apiErrorResponse.status).toBe(409)
    expect(apiErrorResponse.headers.get(d1BookmarkHeader)).toBe('test-bookmark-0')
    expect(rawSuccessResponse.status).toBe(200)
    expect(rawSuccessResponse.headers.get(d1BookmarkHeader)).toBe('test-bookmark-0')
    expect(rawErrorResponse.status).toBe(500)
    expect(rawErrorResponse.headers.get(d1BookmarkHeader)).toBe('test-bookmark-0')
    expect(harness.beforeResponseHookInvocations).toBe(4)
  })

  test('rejects changing consistency constraints after a request session starts', async () => {
    const harness = createApiRouteTestHarness({
      routes: [
        {
          method: 'get',
          path: '/api/database/conflict',
          handler: defineApiHandler(async (event) => {
            getDatabase(event, { consistency: 'strong' })
            getPublicReplicaDatabase(event)
            return apiData({ ok: true })
          })
        }
      ]
    })
    harnesses.push(harness)

    const response = await harness.request('/api/database/conflict')

    expect(response.status).toBe(500)
    expect(await response.json()).toMatchObject({
      error: {
        code: 'database_consistency_conflict'
      }
    })
    expect(harness.d1Database.sessionStarts).toEqual(['first-primary'])
  })
})
