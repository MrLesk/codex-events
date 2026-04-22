import type { EventHandler, H3Event } from 'h3'

import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'

import {
  authenticatedUploadRateLimitBindingName,
  publicContactRateLimitBindingName,
  publicHackathonFeedbackRateLimitBindingName
} from '../../../../server/utils/rate-limit'

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
        outboundEmail: {
          binding: 'EMAIL'
        },
        applicationReviewEmails: {
          queueBinding: 'APPLICATION_REVIEW_EMAIL_QUEUE'
        },
        hackathonOutcomeEmails: {
          queueBinding: 'HACKATHON_OUTCOME_EMAIL_QUEUE'
        },
        luma: {
          queueBinding: 'APPLICATION_LUMA_SYNC_QUEUE'
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
    vi.unstubAllEnvs()
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

  test('does not load the local Wrangler proxy for production requests without a database binding', async () => {
    vi.stubEnv('NODE_ENV', 'production')
    vi.stubEnv('VITEST', '')

    const middleware = await loadMiddleware()
    const event = createEvent()

    await middleware(event)

    expect(createLocalPlatformProxy).not.toHaveBeenCalled()
    expect(event.context.d1Database).toBeUndefined()
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
    const imagesBinding = {
      info: vi.fn(async () => ({ width: 1600, height: 900 })),
      input: vi.fn(() => ({
        transform: vi.fn(() => ({
          output: vi.fn(async () => ({
            response: () => new Response(new Uint8Array([1, 2, 3])),
            contentType: () => 'image/webp'
          }))
        }))
      }))
    }
    const outboundEmailBinding = {
      send: vi.fn(async () => ({ messageId: 'email_1' }))
    }
    const applicationReviewEmailQueue = {
      send: vi.fn()
    }
    const hackathonOutcomeEmailQueue = {
      send: vi.fn()
    }
    const applicationLumaSyncQueue = {
      send: vi.fn()
    }
    const publicContactRateLimiter = {
      limit: vi.fn(async () => ({ success: true }))
    }
    const publicHackathonFeedbackRateLimiter = {
      limit: vi.fn(async () => ({ success: true }))
    }
    const authenticatedUploadRateLimiter = {
      limit: vi.fn(async () => ({ success: true }))
    }

    createLocalPlatformProxy.mockResolvedValue({
      env: {
        DB: d1Database,
        PROFILE_ICONS: profileIconsBucket,
        HACKATHON_IMAGES: hackathonImagesBucket,
        IMAGES: imagesBinding,
        EMAIL: outboundEmailBinding,
        APPLICATION_REVIEW_EMAIL_QUEUE: applicationReviewEmailQueue,
        HACKATHON_OUTCOME_EMAIL_QUEUE: hackathonOutcomeEmailQueue,
        APPLICATION_LUMA_SYNC_QUEUE: applicationLumaSyncQueue,
        [publicContactRateLimitBindingName]: publicContactRateLimiter,
        [publicHackathonFeedbackRateLimitBindingName]: publicHackathonFeedbackRateLimiter,
        [authenticatedUploadRateLimitBindingName]: authenticatedUploadRateLimiter
      }
    })

    const event = createEvent()

    await middleware(event)

    expect(createLocalPlatformProxy).toHaveBeenCalledTimes(1)
    expect(event.context.d1Database).toBe(d1Database)
    expect(event.context.cloudflare?.env.DB).toBe(d1Database)
    expect(event.context.cloudflare?.env.PROFILE_ICONS).toBe(profileIconsBucket)
    expect(event.context.cloudflare?.env.HACKATHON_IMAGES).toBe(hackathonImagesBucket)
    expect(event.context.cloudflare?.env.IMAGES).toBe(imagesBinding)
    expect(event.context.cloudflare?.env.EMAIL).toBe(outboundEmailBinding)
    expect(event.context.cloudflare?.env.APPLICATION_REVIEW_EMAIL_QUEUE).toBe(applicationReviewEmailQueue)
    expect(event.context.cloudflare?.env.HACKATHON_OUTCOME_EMAIL_QUEUE).toBe(hackathonOutcomeEmailQueue)
    expect(event.context.cloudflare?.env.APPLICATION_LUMA_SYNC_QUEUE).toBe(applicationLumaSyncQueue)
    expect(event.context.cloudflare?.env[publicContactRateLimitBindingName]).toBe(publicContactRateLimiter)
    expect(event.context.cloudflare?.env[publicHackathonFeedbackRateLimitBindingName]).toBe(
      publicHackathonFeedbackRateLimiter
    )
    expect(event.context.cloudflare?.env[authenticatedUploadRateLimitBindingName]).toBe(authenticatedUploadRateLimiter)
  })
})
