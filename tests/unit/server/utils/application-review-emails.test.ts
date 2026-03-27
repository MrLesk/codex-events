import type { H3Event } from 'h3'

import { describe, expect, test, vi } from 'vitest'

import { sendApplicationReviewDecisionEmail } from '../../../../server/utils/application-review-emails'

function createEvent(runtimeConfig?: Record<string, unknown>) {
  return {
    context: {
      runtimeConfig: runtimeConfig ?? {}
    }
  } as H3Event
}

describe('application review email utilities', () => {
  test('skips delivery when Resend configuration is missing', async () => {
    const result = await sendApplicationReviewDecisionEmail(createEvent(), {
      applicationId: 'application_1',
      decision: 'approved',
      reviewedAt: '2026-03-27T12:00:00.000Z',
      recipientEmail: 'participant@example.com',
      recipientDisplayName: 'Ada Lovelace',
      hackathonName: 'Codex Spring',
      hackathonSlug: 'codex-spring'
    })

    expect(result).toEqual({
      status: 'skipped',
      reason: 'resend_configuration_missing'
    })
  })

  test('sends approval notifications through Resend when configured', async () => {
    const send = vi.fn(async () => ({
      data: { id: 'email_1' },
      error: null,
      headers: null
    }))
    const event = createEvent({
      resend: {
        apiKey: 're_test_123',
        fromEmail: 'notifications@example.com',
        fromName: 'Codex Hackathons',
        replyTo: 'support@example.com'
      },
      auth0: {
        appBaseUrl: 'https://hackathons.example'
      }
    })

    const result = await sendApplicationReviewDecisionEmail(event, {
      applicationId: 'application_1',
      decision: 'approved',
      reviewedAt: '2026-03-27T12:00:00.000Z',
      recipientEmail: 'participant@example.com',
      recipientDisplayName: 'Ada Lovelace',
      hackathonName: 'Codex Spring',
      hackathonSlug: 'codex-spring'
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
      to: ['participant@example.com'],
      subject: 'You\'re accepted to Codex Spring',
      replyTo: 'support@example.com',
      tags: [{ name: 'notification_type', value: 'application_approved' }]
    }), expect.objectContaining({
      idempotencyKey: 'application-review:application_1:approved:2026-03-27T12:00:00.000Z'
    }))

    const payload = send.mock.calls[0]?.[0]
    expect(payload?.html).toContain('Open your hackathon dashboard')
    expect(payload?.text).toContain('https://hackathons.example/account/hackathons/codex-spring')
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
    const event = createEvent({
      resend: {
        apiKey: 're_test_123',
        fromEmail: 'notifications@example.com'
      }
    })

    const result = await sendApplicationReviewDecisionEmail(event, {
      applicationId: 'application_1',
      decision: 'rejected',
      reviewedAt: '2026-03-27T12:00:00.000Z',
      recipientEmail: 'participant@example.com',
      recipientDisplayName: 'Ada Lovelace',
      hackathonName: 'Codex Spring',
      hackathonSlug: 'codex-spring'
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

  test('returns failed delivery status when transport throws', async () => {
    const send = vi.fn(async () => {
      throw new Error('network unavailable')
    })
    const event = createEvent({
      resend: {
        apiKey: 're_test_123',
        fromEmail: 'notifications@example.com'
      }
    })

    const result = await sendApplicationReviewDecisionEmail(event, {
      applicationId: 'application_1',
      decision: 'rejected',
      reviewedAt: '2026-03-27T12:00:00.000Z',
      recipientEmail: 'participant@example.com',
      recipientDisplayName: 'Ada Lovelace',
      hackathonName: 'Codex Spring',
      hackathonSlug: 'codex-spring'
    }, {
      resendClient: {
        emails: {
          send
        }
      } as never
    })

    expect(result).toEqual({
      status: 'failed',
      reason: 'transport_error',
      providerError: {
        name: 'application_error',
        statusCode: null,
        message: 'network unavailable'
      }
    })
  })

  test('skips deleted-account recipients', async () => {
    const result = await sendApplicationReviewDecisionEmail(createEvent({
      resend: {
        apiKey: 're_test_123',
        fromEmail: 'notifications@example.com'
      }
    }), {
      applicationId: 'application_1',
      decision: 'approved',
      reviewedAt: '2026-03-27T12:00:00.000Z',
      recipientEmail: 'deleted_user_1_20260327120000000@deleted.invalid',
      recipientDisplayName: 'Deleted User',
      hackathonName: 'Codex Spring',
      hackathonSlug: 'codex-spring'
    })

    expect(result).toEqual({
      status: 'skipped',
      reason: 'recipient_account_deleted'
    })
  })
})
