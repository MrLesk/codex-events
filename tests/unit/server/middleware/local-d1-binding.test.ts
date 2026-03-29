import type { EventHandler, H3Event } from 'h3'

import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'

const { createLocalPlatformProxy } = vi.hoisted(() => ({
  createLocalPlatformProxy: vi.fn()
}))

vi.mock('../../../../server/database/local-platform-proxy', () => ({
  createLocalPlatformProxy
}))

function createEvent(options?: {
  cloudflareEnv?: Record<string, unknown>
  d1Database?: unknown
}) {
  return {
    context: {
      cloudflare: {
        env: {
          ...(options?.cloudflareEnv ?? {})
        }
      },
      runtimeConfig: {
        database: {
          binding: 'DB'
        },
        profileIcons: {
          binding: 'PROFILE_ICONS'
        },
        hackathonImages: {
          binding: 'HACKATHON_IMAGES'
        },
        applicationReviewEmails: {
          queueBinding: 'APPLICATION_REVIEW_EMAIL_QUEUE'
        }
      },
      d1Database: options?.d1Database
    }
  } as H3Event
}

async function loadMiddleware() {
  const module = await import('../../../../server/middleware/local-d1-binding')
  return module.default as EventHandler
}

describe('local D1 binding middleware', () => {
  beforeEach(() => {
    vi.resetModules()
    createLocalPlatformProxy.mockReset()
    vi.stubGlobal('defineEventHandler', ((handler: EventHandler) => handler) as typeof defineEventHandler)
    vi.stubGlobal('useRuntimeConfig', ((event: H3Event) => event.context.runtimeConfig) as typeof useRuntimeConfig)
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  test('does not load the local Wrangler proxy when the request already has a database binding', async () => {
    const middleware = await loadMiddleware()
    const event = createEvent({
      cloudflareEnv: {
        DB: {
          prepare: vi.fn()
        }
      }
    })

    await middleware(event)

    expect(createLocalPlatformProxy).not.toHaveBeenCalled()
  })

  test('loads the local Wrangler proxy when the request has no database binding', async () => {
    const middleware = await loadMiddleware()
    const d1Database = {
      prepare: vi.fn()
    }
    const profileIconsBucket = {
      get: vi.fn(),
      put: vi.fn(),
      delete: vi.fn()
    }
    const hackathonImagesBucket = {
      get: vi.fn(),
      put: vi.fn(),
      delete: vi.fn()
    }
    const applicationReviewEmailQueue = {
      send: vi.fn()
    }

    createLocalPlatformProxy.mockResolvedValue({
      env: {
        DB: d1Database,
        PROFILE_ICONS: profileIconsBucket,
        HACKATHON_IMAGES: hackathonImagesBucket,
        APPLICATION_REVIEW_EMAIL_QUEUE: applicationReviewEmailQueue
      }
    })

    const event = createEvent()

    await middleware(event)

    expect(createLocalPlatformProxy).toHaveBeenCalledTimes(1)
    expect(event.context.d1Database).toBe(d1Database)
    expect(event.context.cloudflare?.env.DB).toBe(d1Database)
    expect(event.context.cloudflare?.env.PROFILE_ICONS).toBe(profileIconsBucket)
    expect(event.context.cloudflare?.env.HACKATHON_IMAGES).toBe(hackathonImagesBucket)
    expect(event.context.cloudflare?.env.APPLICATION_REVIEW_EMAIL_QUEUE).toBe(applicationReviewEmailQueue)
  })
})
