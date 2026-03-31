import type { EventHandler, H3Event } from 'h3'

import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'

async function loadMiddlewareModule() {
  return await import('../../../../server/middleware/auth0-context')
}

function createEvent() {
  return {
    context: {}
  } as H3Event
}

describe('auth0 context middleware', () => {
  beforeEach(() => {
    vi.resetModules()
    vi.stubGlobal('defineEventHandler', ((handler: EventHandler) => handler) as typeof defineEventHandler)
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  test('derives a non-secure session cookie for local http development', async () => {
    const { buildAuth0ClientOptions } = await loadMiddlewareModule()

    expect(buildAuth0ClientOptions({
      appBaseUrl: 'http://localhost:3000'
    })).toMatchObject({
      appBaseUrl: 'http://localhost:3000',
      sessionConfiguration: {
        cookie: {
          secure: false
        }
      }
    })
  })

  test('keeps secure cookies for https environments', async () => {
    const { buildAuth0ClientOptions } = await loadMiddlewareModule()

    expect(buildAuth0ClientOptions({
      appBaseUrl: 'https://dev.codex-hackathons.com'
    })).toMatchObject({
      appBaseUrl: 'https://dev.codex-hackathons.com',
      sessionConfiguration: {
        cookie: {
          secure: true
        }
      }
    })
  })

  test('preserves an explicit secure-cookie override from runtime config', async () => {
    const { buildAuth0ClientOptions } = await loadMiddlewareModule()

    expect(buildAuth0ClientOptions({
      appBaseUrl: 'http://localhost:3000',
      sessionConfiguration: {
        cookie: {
          secure: true
        }
      }
    })).toMatchObject({
      sessionConfiguration: {
        cookie: {
          secure: true
        }
      }
    })
  })

  test('injects normalized request-scoped Auth0 options only once per request', async () => {
    const { default: middleware } = await loadMiddlewareModule()
    const event = createEvent()

    vi.stubGlobal('useRuntimeConfig', (() => ({
      auth0: {
        appBaseUrl: 'http://localhost:3000'
      }
    })) as typeof useRuntimeConfig)

    await middleware(event)
    const firstOptions = event.context.auth0ClientOptions

    expect(firstOptions).toMatchObject({
      appBaseUrl: 'http://localhost:3000',
      sessionConfiguration: {
        cookie: {
          secure: false
        }
      }
    })

    await middleware(event)

    expect(event.context.auth0ClientOptions).toStrictEqual(firstOptions)
  })

  test('normalizes Auth0 options that were already injected before the middleware runs', async () => {
    const { default: middleware } = await loadMiddlewareModule()
    const event = createEvent()

    event.context.auth0ClientOptions = {
      appBaseUrl: 'http://localhost:3000'
    }

    vi.stubGlobal('useRuntimeConfig', (() => ({
      auth0: {
        appBaseUrl: 'https://dev.codex-hackathons.com'
      }
    })) as typeof useRuntimeConfig)

    await middleware(event)

    expect(event.context.auth0ClientOptions).toMatchObject({
      appBaseUrl: 'http://localhost:3000',
      sessionConfiguration: {
        cookie: {
          secure: false
        }
      }
    })
  })
})
