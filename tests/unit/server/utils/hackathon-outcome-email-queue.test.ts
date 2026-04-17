import type { H3Event } from 'h3'

import { describe, expect, test, vi } from 'vitest'

import {
  buildHackathonOutcomeEmailQueueMessage,
  enqueueHackathonOutcomeEmailMessage,
  processHackathonOutcomeEmailQueueBatch,
  processHackathonOutcomeEmailQueueMessage
} from '../../../../server/utils/hackathon-outcome-email-queue'

function createEvent(options?: {
  queueProducer?: {
    send: (message: unknown, options?: unknown) => Promise<void>
  }
  runtimeConfig?: Record<string, unknown>
}) {
  return {
    context: {
      cloudflare: {
        env: options?.queueProducer
          ? { HACKATHON_OUTCOME_EMAIL_QUEUE: options.queueProducer }
          : {}
      },
      runtimeConfig: options?.runtimeConfig ?? {
        hackathonOutcomeEmails: {
          queueBinding: 'HACKATHON_OUTCOME_EMAIL_QUEUE',
          queueName: 'codex-hackathons-hackathon-outcome-email-delivery',
          retryDelaySeconds: 120
        }
      }
    }
  } as H3Event
}

function createQueueMessage(options?: {
  body?: unknown
  attempts?: number
}) {
  return {
    id: 'msg_1',
    attempts: options?.attempts ?? 1,
    body: options?.body ?? buildHackathonOutcomeEmailQueueMessage({
      notificationType: 'winner',
      hackathonId: 'hackathon_1',
      hackathonName: 'Codex Spring',
      hackathonSlug: 'codex-spring',
      teamId: 'team_1',
      teamName: 'North Star Builders',
      recipientUserId: 'user_1',
      recipientEmail: 'participant@example.com',
      recipientDisplayName: 'Ada Lovelace',
      announcedAt: '2026-03-27T20:00:00.000Z',
      finalRank: 1,
      rankedTeamCount: 8,
      prizeNames: ['Grand Prize']
    }),
    ack: vi.fn(),
    retry: vi.fn()
  }
}

describe('hackathon outcome email queue utilities', () => {
  test('enqueue sends json payload to the configured queue binding', async () => {
    const send = vi.fn(async () => undefined)
    const event = createEvent({
      queueProducer: { send }
    })

    const result = await enqueueHackathonOutcomeEmailMessage(event, buildHackathonOutcomeEmailQueueMessage({
      notificationType: 'shortlist',
      hackathonId: 'hackathon_1',
      hackathonName: 'Codex Spring',
      hackathonSlug: 'codex-spring',
      teamId: 'team_1',
      teamName: 'North Star Builders',
      recipientUserId: 'user_1',
      recipientEmail: 'participant@example.com',
      recipientDisplayName: 'Ada Lovelace',
      announcedAt: '2026-03-27T20:00:00.000Z'
    }))

    expect(result).toEqual({
      status: 'enqueued'
    })
    expect(send).toHaveBeenCalledWith(expect.objectContaining({
      notificationType: 'shortlist',
      teamId: 'team_1'
    }), {
      contentType: 'json'
    })
  })

  test('enqueue skips when queue binding is not available', async () => {
    const result = await enqueueHackathonOutcomeEmailMessage(createEvent(), buildHackathonOutcomeEmailQueueMessage({
      notificationType: 'shortlist',
      hackathonId: 'hackathon_1',
      hackathonName: 'Codex Spring',
      hackathonSlug: 'codex-spring',
      teamId: 'team_1',
      teamName: 'North Star Builders',
      recipientUserId: 'user_1',
      recipientEmail: 'participant@example.com',
      recipientDisplayName: null,
      announcedAt: '2026-03-27T20:00:00.000Z'
    }))

    expect(result).toEqual({
      status: 'skipped',
      reason: 'queue_binding_missing:HACKATHON_OUTCOME_EMAIL_QUEUE'
    })
  })

  test('queue message processing retries retryable failures', async () => {
    const message = createQueueMessage()
    const sendOutcomeEmail = vi.fn(async () => ({
      status: 'failed' as const,
      reason: 'provider_error',
      providerError: {
        name: 'rate_limit_exceeded',
        statusCode: 429,
        message: 'too many requests'
      }
    }))

    const result = await processHackathonOutcomeEmailQueueMessage(message, {
      runtimeConfig: {
        hackathonOutcomeEmails: {
          retryDelaySeconds: 90
        }
      },
      sendOutcomeEmail
    })

    expect(result).toEqual(expect.objectContaining({
      action: 'retry',
      reason: 'delivery_failed_retryable'
    }))
    expect(message.retry).toHaveBeenCalledWith({ delaySeconds: 90 })
    expect(message.ack).not.toHaveBeenCalled()
  })

  test('queue batch processing skips unrelated queues', async () => {
    const message = createQueueMessage()
    const result = await processHackathonOutcomeEmailQueueBatch({
      queue: 'different-queue',
      messages: [message]
    }, {
      runtimeConfig: {
        hackathonOutcomeEmails: {
          queueName: 'codex-hackathons-hackathon-outcome-email-delivery'
        }
      }
    })

    expect(result).toEqual({
      queue: 'different-queue',
      skipped: true,
      outcomes: []
    })
    expect(message.ack).not.toHaveBeenCalled()
    expect(message.retry).not.toHaveBeenCalled()
  })
})
