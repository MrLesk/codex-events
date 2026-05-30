import type { H3Event } from 'h3'

import { describe, expect, test, vi } from 'vitest'

import {
  buildApplicationReviewEmailQueueMessage,
  enqueueApplicationReviewEmailMessage,
  processApplicationReviewEmailQueueBatch,
  processApplicationReviewEmailQueueMessage
} from '../../../../../server/domains/applications/review-email-queue'

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
          ? { APPLICATION_REVIEW_EMAIL_QUEUE: options.queueProducer }
          : {}
      },
      runtimeConfig: options?.runtimeConfig ?? {
        applicationReviewEmails: {
          queueBinding: 'APPLICATION_REVIEW_EMAIL_QUEUE',
          queueName: 'codex-events-dev-application-review-email-delivery',
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
    body: options?.body ?? buildApplicationReviewEmailQueueMessage({
      applicationId: 'application_1',
      decision: 'approved',
      reviewedAt: '2026-03-27T20:00:00.000Z',
      recipientEmail: 'participant@example.com',
      recipientDisplayName: 'Ada Lovelace',
      eventName: 'Codex Spring',
      eventSlug: 'codex-spring'
    }),
    ack: vi.fn(),
    retry: vi.fn()
  }
}

describe('application review email queue utilities', () => {
  test('enqueue sends json payload to the configured queue binding', async () => {
    const send = vi.fn(async () => undefined)
    const event = createEvent({
      queueProducer: { send }
    })

    const result = await enqueueApplicationReviewEmailMessage(event, buildApplicationReviewEmailQueueMessage({
      applicationId: 'application_1',
      decision: 'approved',
      reviewedAt: '2026-03-27T20:00:00.000Z',
      recipientEmail: 'participant@example.com',
      recipientDisplayName: 'Ada Lovelace',
      eventName: 'Codex Spring',
      eventSlug: 'codex-spring'
    }))

    expect(result).toEqual({
      status: 'enqueued'
    })
    expect(send).toHaveBeenCalledTimes(1)
    expect(send).toHaveBeenCalledWith(expect.objectContaining({
      applicationId: 'application_1',
      decision: 'approved'
    }), {
      contentType: 'json'
    })
  })

  test('enqueue skips when queue binding is not available', async () => {
    const result = await enqueueApplicationReviewEmailMessage(createEvent(), buildApplicationReviewEmailQueueMessage({
      applicationId: 'application_1',
      decision: 'rejected',
      reviewedAt: '2026-03-27T20:00:00.000Z',
      recipientEmail: 'participant@example.com',
      recipientDisplayName: null,
      eventName: 'Codex Spring',
      eventSlug: 'codex-spring'
    }))

    expect(result).toEqual({
      status: 'skipped',
      reason: 'queue_binding_missing:APPLICATION_REVIEW_EMAIL_QUEUE'
    })
  })

  test('queue message processing retries retryable failures', async () => {
    const message = createQueueMessage()
    const sendDecisionEmail = vi.fn(async () => ({
      status: 'failed' as const,
      reason: 'provider_error',
      providerError: {
        name: 'E_RATE_LIMIT_EXCEEDED',
        statusCode: 429,
        message: 'too many requests'
      }
    }))

    const result = await processApplicationReviewEmailQueueMessage(message, {
      runtimeConfig: {
        applicationReviewEmails: {
          retryDelaySeconds: 90
        }
      },
      sendDecisionEmail
    })

    expect(result).toEqual(expect.objectContaining({
      action: 'retry',
      reason: 'delivery_failed_retryable'
    }))
    expect(message.retry).toHaveBeenCalledWith({ delaySeconds: 90 })
    expect(message.ack).not.toHaveBeenCalled()
  })

  test('queue message processing acknowledges non-retryable failures', async () => {
    const message = createQueueMessage()
    const sendDecisionEmail = vi.fn(async () => ({
      status: 'failed' as const,
      reason: 'provider_error',
      providerError: {
        name: 'E_VALIDATION_ERROR',
        statusCode: null,
        message: 'invalid from address'
      }
    }))

    const result = await processApplicationReviewEmailQueueMessage(message, {
      sendDecisionEmail
    })

    expect(result).toEqual(expect.objectContaining({
      action: 'ack',
      reason: 'delivery_failed_non_retryable'
    }))
    expect(message.ack).toHaveBeenCalledTimes(1)
    expect(message.retry).not.toHaveBeenCalled()
  })

  test('queue batch processing skips unrelated queues', async () => {
    const message = createQueueMessage()
    const result = await processApplicationReviewEmailQueueBatch({
      queue: 'different-queue',
      messages: [message]
    }, {
      runtimeConfig: {
        applicationReviewEmails: {
          queueName: 'codex-events-dev-application-review-email-delivery'
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
