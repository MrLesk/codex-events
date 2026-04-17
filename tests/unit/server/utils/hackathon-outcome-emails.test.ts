import type { H3Event } from 'h3'

import { describe, expect, test, vi } from 'vitest'

import { sendHackathonOutcomeEmail } from '../../../../server/utils/hackathon-outcome-emails'

function createEvent(runtimeConfig?: Record<string, unknown>) {
  return {
    context: {
      runtimeConfig: runtimeConfig ?? {}
    }
  } as H3Event
}

describe('hackathon outcome email utilities', () => {
  test('skips delivery when Resend configuration is missing', async () => {
    const result = await sendHackathonOutcomeEmail(createEvent(), {
      notificationType: 'shortlist',
      hackathonId: 'hackathon_1',
      hackathonName: 'Codex Spring',
      hackathonSlug: 'codex-spring',
      teamId: 'team_1',
      teamName: 'North Star Builders',
      recipientUserId: 'user_1',
      recipientEmail: 'participant@example.com',
      recipientDisplayName: 'Ada Lovelace',
      announcedAt: '2026-03-27T12:00:00.000Z'
    })

    expect(result).toEqual({
      status: 'skipped',
      reason: 'resend_configuration_missing'
    })
  })

  test('sends shortlist notifications through Resend when configured', async () => {
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

    const result = await sendHackathonOutcomeEmail(event, {
      notificationType: 'shortlist',
      hackathonId: 'hackathon_1',
      hackathonName: 'Codex Spring',
      hackathonSlug: 'codex-spring',
      teamId: 'team_1',
      teamName: 'North Star Builders',
      recipientUserId: 'user_1',
      recipientEmail: 'participant@example.com',
      recipientDisplayName: 'Ada Lovelace',
      announcedAt: '2026-03-27T12:00:00.000Z'
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
    expect(send).toHaveBeenCalledWith(expect.objectContaining({
      from: 'Codex Hackathons <notifications@example.com>',
      to: ['participant@example.com'],
      subject: 'North Star Builders is shortlisted for Codex Spring',
      replyTo: 'support@example.com',
      tags: [{ name: 'notification_type', value: 'hackathon_shortlist' }]
    }), expect.objectContaining({
      idempotencyKey: 'hackathon-outcome:shortlist:team_1:user_1:2026-03-27T12:00:00.000Z'
    }))

    const payload = send.mock.calls[0]?.[0]
    expect(payload?.text).toContain('advanced to the live pitch stage')
    expect(payload?.text).toContain('https://hackathons.example/account/hackathons/codex-spring')
  })

  test('sends winner notifications with prizes and final rank', async () => {
    const send = vi.fn(async () => ({
      data: { id: 'email_2' },
      error: null,
      headers: null
    }))
    const event = createEvent({
      resend: {
        apiKey: 're_test_123',
        fromEmail: 'notifications@example.com'
      }
    })

    const result = await sendHackathonOutcomeEmail(event, {
      notificationType: 'winner',
      hackathonId: 'hackathon_1',
      hackathonName: 'Codex Spring',
      hackathonSlug: 'codex-spring',
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
      resendClient: {
        emails: {
          send
        }
      } as never
    })

    expect(result).toEqual({
      status: 'sent',
      messageId: 'email_2'
    })

    const payload = send.mock.calls[0]?.[0]
    expect(payload?.subject).toBe('Congratulations - North Star Builders won at Codex Spring')
    expect(payload?.text).toContain('finished #1 of 12 and won Grand Prize and Best Demo')
    expect(payload?.tags).toEqual([{ name: 'notification_type', value: 'hackathon_winner' }])
  })
})
