import type { H3Event } from 'h3'

import { describe, expect, test, vi } from 'vitest'

import { platformSupportEmail } from '../../../../shared/platform-legal'
import { sendPublicLegalContactEmail } from '../../../../server/utils/legal-contact'

function createEvent(runtimeConfig?: Record<string, unknown>) {
  return {
    context: {
      runtimeConfig: runtimeConfig ?? {}
    }
  } as H3Event
}

describe('legal contact utilities', () => {
  test('skips delivery when Resend configuration is missing', async () => {
    const result = await sendPublicLegalContactEmail(createEvent(), {
      name: 'Ada Lovelace',
      email: 'ada@example.com',
      message: 'Hello there.',
      website: ''
    })

    expect(result).toEqual({
      status: 'skipped',
      reason: 'resend_configuration_missing'
    })
  })

  test('skips delivery when the honeypot field is filled', async () => {
    const send = vi.fn()

    const result = await sendPublicLegalContactEmail(createEvent({
      resend: {
        apiKey: 're_test_123',
        fromEmail: 'notifications@example.com',
        fromName: 'Codex Hackathons'
      }
    }), {
      name: 'Ada Lovelace',
      email: 'ada@example.com',
      message: 'Hello there.',
      website: 'https://spam.example'
    }, {
      resendClient: {
        emails: {
          send
        }
      } as never
    })

    expect(result).toEqual({
      status: 'skipped',
      reason: 'honeypot_triggered'
    })
    expect(send).not.toHaveBeenCalled()
  })

  test('sends contact requests through Resend when configured', async () => {
    const send = vi.fn(async () => ({
      data: { id: 'email_1' },
      error: null,
      headers: null
    }))

    const result = await sendPublicLegalContactEmail(createEvent({
      resend: {
        apiKey: 're_test_123',
        fromEmail: 'notifications@example.com',
        fromName: 'Codex Hackathons'
      }
    }), {
      name: 'Ada Lovelace',
      email: 'ada@example.com',
      message: 'Hello there.\nI have a legal question.',
      website: ''
    }, {
      resendClient: {
        emails: {
          send
        }
      } as never
    })

    expect(result).toEqual({
      status: 'sent',
      messageId: 'email_1'
    })
    expect(send).toHaveBeenCalledTimes(1)
    expect(send).toHaveBeenCalledWith(expect.objectContaining({
      from: 'Codex Hackathons <notifications@example.com>',
      to: [platformSupportEmail],
      replyTo: 'ada@example.com',
      subject: 'Codex Hackathons contact request from Ada Lovelace',
      tags: [{ name: 'notification_type', value: 'legal_contact' }]
    }), expect.objectContaining({
      idempotencyKey: expect.stringContaining('legal-contact:ada@example.com:Ada Lovelace:')
    }))
  })

  test('returns failed delivery status when Resend reports a provider error', async () => {
    const send = vi.fn(async () => ({
      data: null,
      error: {
        message: 'Too many requests',
        statusCode: 429,
        name: 'rate_limit_exceeded'
      },
      headers: null
    }))

    const result = await sendPublicLegalContactEmail(createEvent({
      resend: {
        apiKey: 're_test_123',
        fromEmail: 'notifications@example.com'
      }
    }), {
      name: 'Ada Lovelace',
      email: 'ada@example.com',
      message: 'Hello there.',
      website: ''
    }, {
      resendClient: {
        emails: {
          send
        }
      } as never
    })

    expect(result).toEqual({
      status: 'failed',
      reason: 'provider_error',
      providerError: {
        message: 'Too many requests',
        statusCode: 429,
        name: 'rate_limit_exceeded'
      }
    })
  })
})
