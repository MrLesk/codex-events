import type { H3Event } from 'h3'

import { describe, expect, test, vi } from 'vitest'

import { sendEventOutcomeEmail } from '../../../../../server/domains/outcomes/emails'

function createEvent(runtimeConfig?: Record<string, unknown>) {
  return {
    context: {
      runtimeConfig: runtimeConfig ?? {}
    }
  } as H3Event
}

describe('event outcome email utilities', () => {
  test('skips delivery when outbound email configuration is missing', async () => {
    const result = await sendEventOutcomeEmail(createEvent(), {
      notificationType: 'shortlist',
      eventId: 'event_1',
      eventName: 'Codex Spring',
      eventSlug: 'codex-spring',
      teamId: 'team_1',
      teamName: 'North Star Builders',
      recipientUserId: 'user_1',
      recipientEmail: 'participant@example.com',
      recipientDisplayName: 'Ada Lovelace',
      announcedAt: '2026-03-27T12:00:00.000Z'
    })

    expect(result).toEqual({
      status: 'skipped',
      reason: 'outbound_email_configuration_missing'
    })
  })

  test('sends shortlist notifications through Cloudflare Email Service when configured', async () => {
    const send = vi.fn(async () => ({
      messageId: 'email_1'
    }))
    const event = createEvent({
      outboundEmail: {
        binding: 'EMAIL',
        fromEmail: 'notifications@example.com',
        fromName: 'Codex Events',
        replyTo: 'support@example.com'
      },
      auth0: {
        appBaseUrl: 'https://events.example'
      }
    })

    const result = await sendEventOutcomeEmail(event, {
      notificationType: 'shortlist',
      eventId: 'event_1',
      eventName: 'Codex Spring',
      eventSlug: 'codex-spring',
      teamId: 'team_1',
      teamName: 'North Star Builders',
      recipientUserId: 'user_1',
      recipientEmail: 'participant@example.com',
      recipientDisplayName: 'Ada Lovelace',
      announcedAt: '2026-03-27T12:00:00.000Z'
    }, {
      emailBinding: { send }
    })

    expect(result).toEqual({
      status: 'sent',
      messageId: 'email_1'
    })
    expect(send).toHaveBeenCalledWith(expect.objectContaining({
      from: { email: 'notifications@example.com', name: 'Codex Events' },
      to: 'participant@example.com',
      subject: 'North Star Builders is shortlisted for Codex Spring',
      replyTo: 'support@example.com',
      headers: {
        'X-Codex-Notification-Type': 'event_shortlist',
        'X-Codex-Email-Key': 'event-outcome:shortlist:team_1:user_1:2026-03-27T12:00:00.000Z'
      }
    }))

    const payload = send.mock.calls[0]?.[0]
    expect(payload?.text).toContain('advanced to the live pitch stage')
    expect(payload?.text).toContain('https://events.example/account/events/codex-spring')
  })

  test('sends winner notifications with prizes and final rank', async () => {
    const send = vi.fn(async () => ({
      messageId: 'email_2'
    }))
    const event = createEvent({
      outboundEmail: {
        fromEmail: 'notifications@example.com'
      }
    })

    const result = await sendEventOutcomeEmail(event, {
      notificationType: 'winner',
      eventId: 'event_1',
      eventName: 'Codex Spring',
      eventSlug: 'codex-spring',
      teamId: 'team_1',
      teamName: 'North Star Builders',
      recipientUserId: 'user_1',
      recipientEmail: 'participant@example.com',
      recipientDisplayName: 'Ada Lovelace',
      announcedAt: '2026-03-27T12:00:00.000Z',
      finalRank: 1,
      rankedTeamCount: 12,
      prizeNames: ['Grand Prize', 'Best Demo']
    }, {
      emailBinding: { send }
    })

    expect(result).toEqual({
      status: 'sent',
      messageId: 'email_2'
    })

    const payload = send.mock.calls[0]?.[0]
    expect(payload?.subject).toBe('Congratulations - North Star Builders won at Codex Spring')
    expect(payload?.text).toContain('finished #1 of 12 and won Grand Prize and Best Demo')
    expect(payload?.headers?.['X-Codex-Notification-Type']).toBe('event_winner')
  })

  test('sends certificate thank-you emails with the certificate link', async () => {
    const send = vi.fn(async () => ({
      messageId: 'email_3'
    }))
    const event = createEvent({
      outboundEmail: {
        fromEmail: 'notifications@example.com'
      }
    })

    const result = await sendEventOutcomeEmail(event, {
      notificationType: 'certificate',
      eventId: 'event_1',
      eventName: 'Codex Build Vienna',
      eventSlug: 'codex-build-vienna',
      applicationId: 'application_1',
      recipientUserId: 'user_1',
      recipientEmail: 'participant@example.com',
      recipientDisplayName: 'Ada Lovelace',
      certificateUrl: 'https://events.example/events/codex-build-vienna/user_1'
    }, {
      emailBinding: { send }
    })

    expect(result).toEqual({
      status: 'sent',
      messageId: 'email_3'
    })

    const payload = send.mock.calls[0]?.[0]
    expect(payload?.subject).toBe('Thank you for joining Codex Build Vienna')
    expect(payload?.text).toContain('Thank you for joining Codex Build Vienna.')
    expect(payload?.text).toContain('https://events.example/events/codex-build-vienna/user_1')
    expect(payload?.html).toContain('View your certificate')
    expect(payload?.headers?.['X-Codex-Notification-Type']).toBe('event_certificate')
    expect(payload?.headers?.['X-Codex-Email-Key']).toBe('event-outcome:certificate:application_1:user_1')
  })
})
