import type { EventHandler } from 'h3'

import { createApp, createRouter, eventHandler, toWebHandler } from 'h3'

import { createDatabase, setDatabase } from '../../../server/database/client'
import { createTestD1Database } from './fake-d1'
import { stubAuth0Session } from './runtime'

interface TestSessionUser {
  sub: string
  email?: string | null
  name?: string | null
  nickname?: string | null
  picture?: string | null
}

interface RouteDefinition {
  method: 'get' | 'post' | 'patch' | 'put' | 'delete'
  path: string
  handler: EventHandler
}

export function createApiRouteTestHarness(options: {
  routes: RouteDefinition[]
  sessionUser?: TestSessionUser | null
}) {
  const d1Database = createTestD1Database()
  const database = createDatabase(d1Database as never)
  const app = createApp()
  const router = createRouter()

  stubAuth0Session(options.sessionUser ?? null)

  app.use(eventHandler((event) => {
    event.context.cloudflare = {
      env: {
        DB: d1Database
      }
    } as never
    event.context.runtimeConfig = {
      auth0: {},
      database: {
        binding: 'DB'
      }
    }
    event.context.auth0ClientOptions = {}
    event.context.d1Database = d1Database as never
    setDatabase(event, database)
  }))

  for (const route of options.routes) {
    router[route.method](route.path, route.handler)
  }

  app.use(router)

  const handleRequest = toWebHandler(app)

  return {
    database,
    d1Database,
    async request(path: string, init: RequestInit = {}) {
      const headers = new Headers(init.headers)

      if (init.body && !headers.has('content-type')) {
        headers.set('content-type', 'application/json')
      }

      return await handleRequest(new Request(`http://localhost${path}`, {
        ...init,
        headers
      }))
    }
  }
}
