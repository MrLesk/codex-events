import { afterEach, describe, expect, test, vi } from 'vitest'

import { platformSupportEmail } from '../../../../shared/domains/platform/legal'
import imprintContactPostHandler from '../../../../server/api/public/imprint-contact.post'
import { publicContactRateLimitBindingName } from '../../../../server/utils/rate-limit'
import { createApiRouteTestHarness } from '../../../support/backend/api-route'

const send = vi.fn()

describe('public legal API routes', () => {
  const databases: Array<ReturnType<typeof createApiRouteTestHarness>> = []

  function createRateLimiter(success = true) {
    return {
      limit: vi.fn(async () => ({ success }))
    }
  }

  afterEach(async () => {
    send.mockReset()
    vi.clearAllMocks()

    while (databases.length > 0) {
      await databases.pop()?.d1Database.close()
    }
  })

  test('POST /api/public/imprint-contact sends a public contact request', async () => {
    send.mockResolvedValue({
      messageId: 'email_1'
    })

    const harness = createApiRouteTestHarness({
      routes: [
        { method: 'post', path: '/api/public/imprint-contact', handler: imprintContactPostHandler }
      ],
      cloudflareEnv: {
        EMAIL: { send },
        [publicContactRateLimitBindingName]: createRateLimiter()
      },
      runtimeConfig: {
        outboundEmail: {
          binding: 'EMAIL',
          fromEmail: 'notifications@example.com',
          fromName: 'Codex Hackathons'
        }
      }
    })
    databases.push(harness)
    await harness.d1Database.exec('select 1;')

    const response = await harness.request('/api/public/imprint-contact', {
      method: 'POST',
      body: JSON.stringify({
        name: 'Ada Lovelace',
        email: 'ada@example.com',
        message: 'Hello there.'
      })
    })

    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({
      data: {
        status: 'sent'
      }
    })
    expect(send).toHaveBeenCalledWith(expect.objectContaining({
      to: platformSupportEmail,
      replyTo: 'ada@example.com'
    }))
  })

  test('POST /api/public/imprint-contact returns 503 when email delivery is not configured', async () => {
    const harness = createApiRouteTestHarness({
      routes: [
        { method: 'post', path: '/api/public/imprint-contact', handler: imprintContactPostHandler }
      ],
      cloudflareEnv: {
        [publicContactRateLimitBindingName]: createRateLimiter()
      }
    })
    databases.push(harness)
    await harness.d1Database.exec('select 1;')

    const response = await harness.request('/api/public/imprint-contact', {
      method: 'POST',
      body: JSON.stringify({
        name: 'Ada Lovelace',
        email: 'ada@example.com',
        message: 'Hello there.'
      })
    })

    expect(response.status).toBe(503)
    expect(await response.json()).toEqual({
      error: {
        code: 'support_contact_unavailable',
        message: 'The contact form is not available right now. Please email support directly.'
      }
    })
  })

  test('POST /api/public/imprint-contact returns success for honeypot submissions without sending', async () => {
    const harness = createApiRouteTestHarness({
      routes: [
        { method: 'post', path: '/api/public/imprint-contact', handler: imprintContactPostHandler }
      ],
      cloudflareEnv: {
        EMAIL: { send },
        [publicContactRateLimitBindingName]: createRateLimiter()
      },
      runtimeConfig: {
        outboundEmail: {
          binding: 'EMAIL',
          fromEmail: 'notifications@example.com',
          fromName: 'Codex Hackathons'
        }
      }
    })
    databases.push(harness)
    await harness.d1Database.exec('select 1;')

    const response = await harness.request('/api/public/imprint-contact', {
      method: 'POST',
      body: JSON.stringify({
        name: 'Ada Lovelace',
        email: 'ada@example.com',
        message: 'Hello there.',
        website: 'https://spam.example'
      })
    })

    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({
      data: {
        status: 'sent'
      }
    })
    expect(send).not.toHaveBeenCalled()
  })

  test('POST /api/public/imprint-contact returns 429 when the public contact rate limit is exceeded', async () => {
    const harness = createApiRouteTestHarness({
      routes: [
        { method: 'post', path: '/api/public/imprint-contact', handler: imprintContactPostHandler }
      ],
      cloudflareEnv: {
        [publicContactRateLimitBindingName]: createRateLimiter(false)
      },
      runtimeConfig: {
        outboundEmail: {
          binding: 'EMAIL',
          fromEmail: 'notifications@example.com',
          fromName: 'Codex Hackathons'
        }
      }
    })
    databases.push(harness)
    await harness.d1Database.exec('select 1;')

    const response = await harness.request('/api/public/imprint-contact', {
      method: 'POST',
      headers: {
        'cf-connecting-ip': '203.0.113.10'
      },
      body: JSON.stringify({
        name: 'Ada Lovelace',
        email: 'ada@example.com',
        message: 'Hello there.'
      })
    })

    expect(response.status).toBe(429)
    expect(await response.json()).toEqual({
      error: {
        code: 'support_contact_rate_limited',
        message: 'Too many contact requests were submitted. Please try again shortly.'
      }
    })
    expect(send).not.toHaveBeenCalled()
  })
})
