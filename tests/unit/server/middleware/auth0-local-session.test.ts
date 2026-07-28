import type { H3Event } from 'h3'

import { createApp, defineEventHandler, toWebHandler } from 'h3'
import { afterEach, describe, expect, test, vi } from 'vitest'

import localAuthMiddleware from '../../../../server/middleware/auth0-local-session'

function createHandler(localCodexAuth: boolean) {
  const app = createApp()

  app.use(defineEventHandler((event) => {
    event.context.runtimeConfig = { localCodexAuth }
  }))
  app.use(localAuthMiddleware)
  app.use(defineEventHandler(async (event) => {
    const client = event.context.auth0Client as {
      getSession(): Promise<{ user: { email: string } } | null>
    } | undefined

    return client ? await client.getSession() : null
  }))

  vi.stubGlobal(
    'useRuntimeConfig',
    ((event: H3Event) => event.context.runtimeConfig) as typeof useRuntimeConfig
  )

  return toWebHandler(app)
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('local Codex Auth0 session seam', () => {
  test('presents the local cookie as an authenticated session', async () => {
    const response = await createHandler(true)(new Request('http://localhost', {
      headers: {
        cookie: 'codex-events-local-user=developer%40example.com'
      }
    }))

    expect(await response.json()).toMatchObject({
      user: {
        sub: 'local-chatgpt|developer@example.com',
        email: 'developer@example.com',
        email_verified: true
      }
    })
  })

  test('leaves the Auth0 client untouched when local auth is disabled', async () => {
    const response = await createHandler(false)(new Request('http://localhost'))

    expect(response.status).toBe(204)
  })
})
