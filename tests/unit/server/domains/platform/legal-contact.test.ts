import type { H3Event } from 'h3'

import { describe, expect, test, vi } from 'vitest'

import { sendPublicLegalContactEmail } from '../../../../../server/domains/platform/legal-contact'

const configuredSupportEmail = 'legal-support@example.com'

function createEvent(runtimeConfig?: Record<string, unknown>) {
  return {
    context: {
      runtimeConfig: runtimeConfig ?? {}
    }
  } as H3Event
}

describe('legal contact utilities', () => {
  test('reads outbound email configuration from useRuntimeConfig when event context does not include it', async () => {
    const send = vi.fn(async () => ({
      messageId: 'email_runtime_config'
    }))
    const runtimeConfigHolder = globalThis as typeof globalThis & {
      useRuntimeConfig?: (event: H3Event) => Record<string, unknown>
    }
    const previousUseRuntimeConfig = runtimeConfigHolder.useRuntimeConfig

    runtimeConfigHolder.useRuntimeConfig = () => ({
      outboundEmail: {
        fromEmail: 'notifications@example.com',
        fromName: 'Codex Hackathons'
      }
    })

    try {
      const result = await sendPublicLegalContactEmail({
        context: {}
      } as H3Event, {
        name: 'Ada Lovelace',
        email: 'ada@example.com',
        message: 'Hello there.',
        website: ''
      }, {
        emailBinding: { send },
        supportEmail: configuredSupportEmail
      })

      expect(result).toEqual({
        status: 'sent',
        messageId: 'email_runtime_config'
      })
    } finally {
      if (previousUseRuntimeConfig) {
        runtimeConfigHolder.useRuntimeConfig = previousUseRuntimeConfig
      } else {
        delete runtimeConfigHolder.useRuntimeConfig
      }
    }
  })

  test('skips delivery when outbound email configuration is missing', async () => {
    const result = await sendPublicLegalContactEmail(createEvent(), {
      name: 'Ada Lovelace',
      email: 'ada@example.com',
      message: 'Hello there.',
      website: ''
    })

    expect(result).toEqual({
      status: 'skipped',
      reason: 'outbound_email_configuration_missing'
    })
  })

  test('skips delivery when platform legal settings do not provide a support email', async () => {
    const send = vi.fn()

    const result = await sendPublicLegalContactEmail(createEvent({
      outboundEmail: {
        fromEmail: 'notifications@example.com',
        fromName: 'Codex Hackathons'
      }
    }), {
      name: 'Ada Lovelace',
      email: 'ada@example.com',
      message: 'Hello there.',
      website: ''
    }, {
      emailBinding: { send },
      supportEmail: ''
    })

    expect(result).toEqual({
      status: 'skipped',
      reason: 'legal_settings_missing'
    })
    expect(send).not.toHaveBeenCalled()
  })

  test('skips delivery when the honeypot field is filled', async () => {
    const send = vi.fn()

    const result = await sendPublicLegalContactEmail(createEvent({
      outboundEmail: {
        fromEmail: 'notifications@example.com',
        fromName: 'Codex Hackathons'
      }
    }), {
      name: 'Ada Lovelace',
      email: 'ada@example.com',
      message: 'Hello there.',
      website: 'https://spam.example'
    }, {
      emailBinding: { send },
      supportEmail: configuredSupportEmail
    })

    expect(result).toEqual({
      status: 'skipped',
      reason: 'honeypot_triggered'
    })
    expect(send).not.toHaveBeenCalled()
  })

  test('sends contact requests through Cloudflare Email Service when configured', async () => {
    const send = vi.fn(async () => ({
      messageId: 'email_1'
    }))

    const result = await sendPublicLegalContactEmail(createEvent({
      outboundEmail: {
        fromEmail: 'notifications@example.com',
        fromName: 'Codex Hackathons'
      }
    }), {
      name: 'Ada Lovelace',
      email: 'ada@example.com',
      message: 'Hello there.\nI have a legal question.',
      website: ''
    }, {
      emailBinding: { send },
      supportEmail: configuredSupportEmail
    })

    expect(result).toEqual({
      status: 'sent',
      messageId: 'email_1'
    })
    expect(send).toHaveBeenCalledTimes(1)
    expect(send).toHaveBeenCalledWith(expect.objectContaining({
      from: { email: 'notifications@example.com', name: 'Codex Hackathons' },
      to: configuredSupportEmail,
      replyTo: 'ada@example.com',
      subject: 'Codex Hackathons contact request from Ada Lovelace',
      headers: {
        'X-Codex-Notification-Type': 'legal_contact',
        'X-Codex-Email-Key': expect.stringContaining('legal-contact:ada@example.com:Ada Lovelace:')
      }
    }))
  })

  test('returns failed delivery status when Cloudflare reports a provider error', async () => {
    const error = Object.assign(new Error('Too many requests'), {
      code: 'E_RATE_LIMIT_EXCEEDED'
    })
    const send = vi.fn(async () => {
      throw error
    })

    const result = await sendPublicLegalContactEmail(createEvent({
      outboundEmail: {
        fromEmail: 'notifications@example.com'
      }
    }), {
      name: 'Ada Lovelace',
      email: 'ada@example.com',
      message: 'Hello there.',
      website: ''
    }, {
      emailBinding: { send },
      supportEmail: configuredSupportEmail
    })

    expect(result).toEqual({
      status: 'failed',
      reason: 'provider_error',
      providerError: {
        message: 'Too many requests',
        statusCode: 429,
        name: 'E_RATE_LIMIT_EXCEEDED'
      }
    })
  })
})
