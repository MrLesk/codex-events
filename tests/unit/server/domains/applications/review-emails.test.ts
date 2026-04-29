import type { H3Event } from 'h3'

import { describe, expect, test, vi } from 'vitest'

import { sendApplicationReviewDecisionEmail } from '../../../../../server/domains/applications/review-emails'

function createEvent(runtimeConfig?: Record<string, unknown>) {
  return {
    context: {
      runtimeConfig: runtimeConfig ?? {}
    }
  } as H3Event
}

describe('application review email utilities', () => {
  test('skips delivery when outbound email configuration is missing', async () => {
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
      reason: 'outbound_email_configuration_missing'
    })
  })

  test('sends approval notifications through Cloudflare Email Service when configured', async () => {
    const send = vi.fn(async () => ({
      messageId: 'email_1'
    }))
    const event = createEvent({
      outboundEmail: {
        binding: 'EMAIL',
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
      emailBinding: { send }
    })

    expect(result).toEqual({
      status: 'sent',
      messageId: 'email_1'
    })
    expect(send).toHaveBeenCalledTimes(1)
    expect(send).toHaveBeenCalledWith(expect.objectContaining({
      from: { email: 'notifications@example.com', name: 'Codex Hackathons' },
      to: 'participant@example.com',
      subject: 'You\'re accepted to Codex Spring',
      replyTo: 'support@example.com',
      headers: {
        'X-Codex-Notification-Type': 'application_approved',
        'X-Codex-Email-Key': 'application-review:application_1:approved:2026-03-27T12:00:00.000Z'
      }
    }))

    const payload = send.mock.calls[0]?.[0]
    expect(payload?.html).toContain('Open your hackathon dashboard')
    expect(payload?.text).toContain('https://hackathons.example/account/hackathons/codex-spring')
  })

  test('returns failed delivery status when Cloudflare reports a provider error', async () => {
    const error = Object.assign(new Error('Too many requests'), {
      code: 'E_RATE_LIMIT_EXCEEDED'
    })
    const send = vi.fn(async () => {
      throw error
    })
    const event = createEvent({
      outboundEmail: {
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
      emailBinding: { send }
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

  test('returns failed delivery status when transport throws', async () => {
    const send = vi.fn(async () => {
      throw new Error('network unavailable')
    })
    const event = createEvent({
      outboundEmail: {
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
      emailBinding: { send }
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
      outboundEmail: {
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
