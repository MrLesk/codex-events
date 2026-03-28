/* eslint-disable import/first */
import { afterEach, describe, expect, test, vi } from 'vitest'

const send = vi.fn()

vi.mock('resend', () => ({
  Resend: class {
    emails = {
      send
    }
  }
}))

import { platformSupportEmail } from '../../../../shared/platform-legal'
import imprintContactPostHandler from '../../../../server/api/public/imprint-contact.post'
import { createApiRouteTestHarness } from '../../../support/backend/api-route'

describe('public legal API routes', () => {
  const databases: Array<ReturnType<typeof createApiRouteTestHarness>> = []

  afterEach(async () => {
    send.mockReset()
    vi.clearAllMocks()

    while (databases.length > 0) {
      await databases.pop()?.d1Database.close()
    }
  })

  test('POST /api/public/imprint-contact sends a public contact request', async () => {
    send.mockResolvedValue({
      data: { id: 'email_1' },
      error: null,
      headers: null
    })

    const harness = createApiRouteTestHarness({
      routes: [
        { method: 'post', path: '/api/public/imprint-contact', handler: imprintContactPostHandler }
      ],
      runtimeConfig: {
        resend: {
          apiKey: 're_test_123',
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
      to: [platformSupportEmail],
      replyTo: 'ada@example.com'
    }), expect.any(Object))
  })

  test('POST /api/public/imprint-contact returns 503 when email delivery is not configured', async () => {
    const harness = createApiRouteTestHarness({
      routes: [
        { method: 'post', path: '/api/public/imprint-contact', handler: imprintContactPostHandler }
      ]
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
      runtimeConfig: {
        resend: {
          apiKey: 're_test_123',
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
})
