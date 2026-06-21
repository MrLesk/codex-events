import type { H3Event } from 'h3'

import { describe, expect, test, vi } from 'vitest'
import { eq } from 'drizzle-orm'

import { createDatabase } from '../../../../../server/database/client'
import {
  events,
  userApplications,
  users
} from '../../../../../server/database/schema'
import {
  buildEventOutcomeEmailQueueMessage,
  enqueueEventOutcomeEmailMessage,
  processEventOutcomeEmailQueueBatch,
  processEventOutcomeEmailQueueMessage
} from '../../../../../server/domains/outcomes/email-queue'
import { createTestD1Database } from '../../../../support/backend/fake-d1'

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
          ? { EVENT_OUTCOME_EMAIL_QUEUE: options.queueProducer }
          : {}
      },
      runtimeConfig: options?.runtimeConfig ?? {
        eventOutcomeEmails: {
          queueBinding: 'EVENT_OUTCOME_EMAIL_QUEUE',
          queueName: 'codex-events-dev-event-outcome-email-delivery',
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
    body: options?.body ?? buildEventOutcomeEmailQueueMessage({
      notificationType: 'winner',
      eventId: 'event_1',
      eventName: 'Codex Spring',
      eventSlug: 'codex-spring',
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

describe('event outcome email queue utilities', () => {
  test('enqueue sends json payload to the configured queue binding', async () => {
    const send = vi.fn(async () => undefined)
    const event = createEvent({
      queueProducer: { send }
    })

    const result = await enqueueEventOutcomeEmailMessage(event, buildEventOutcomeEmailQueueMessage({
      notificationType: 'shortlist',
      eventId: 'event_1',
      eventName: 'Codex Spring',
      eventSlug: 'codex-spring',
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
    const result = await enqueueEventOutcomeEmailMessage(createEvent(), buildEventOutcomeEmailQueueMessage({
      notificationType: 'shortlist',
      eventId: 'event_1',
      eventName: 'Codex Spring',
      eventSlug: 'codex-spring',
      teamId: 'team_1',
      teamName: 'North Star Builders',
      recipientUserId: 'user_1',
      recipientEmail: 'participant@example.com',
      recipientDisplayName: null,
      announcedAt: '2026-03-27T20:00:00.000Z'
    }))

    expect(result).toEqual({
      status: 'skipped',
      reason: 'queue_binding_missing:EVENT_OUTCOME_EMAIL_QUEUE'
    })
  })

  test('queue message processing retries retryable failures', async () => {
    const message = createQueueMessage()
    const sendOutcomeEmail = vi.fn(async () => ({
      status: 'failed' as const,
      reason: 'provider_error',
      providerError: {
        name: 'E_RATE_LIMIT_EXCEEDED',
        statusCode: 429,
        message: 'too many requests'
      }
    }))

    const result = await processEventOutcomeEmailQueueMessage(message, {
      runtimeConfig: {
        eventOutcomeEmails: {
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

  test('queue message processing skips delivery when the event is hidden', async () => {
    const message = createQueueMessage()
    const sendOutcomeEmail = vi.fn()
    const database = {
      query: {
        events: {
          findFirst: vi.fn(async () => ({
            hiddenAt: '2026-03-27T21:00:00.000Z'
          }))
        }
      }
    }

    const result = await processEventOutcomeEmailQueueMessage(message, {
      database: database as never,
      sendOutcomeEmail
    })

    expect(result).toEqual({
      messageId: 'msg_1',
      action: 'ack',
      reason: 'event_hidden',
      delivery: null
    })
    expect(message.ack).toHaveBeenCalled()
    expect(message.retry).not.toHaveBeenCalled()
    expect(sendOutcomeEmail).not.toHaveBeenCalled()
  })

  test('queue message processing marks certificate emails sent after delivery', async () => {
    const d1Database = createTestD1Database()
    const database = createDatabase(d1Database as never)

    try {
      await database.insert(users).values([
        {
          id: 'platform_admin',
          auth0Subject: 'auth0|platform_admin',
          email: 'platform-admin@example.com',
          displayName: 'Platform Admin',
          isPlatformAdmin: true
        },
        {
          id: 'participant_user',
          auth0Subject: 'auth0|participant_user',
          email: 'participant@example.com',
          displayName: 'Participant User'
        }
      ])
      await database.insert(events).values({
        id: 'event_1',
        eventType: 'build',
        name: 'Codex Build Vienna',
        slug: 'codex-build-vienna',
        description: 'Fixture event',
        city: 'Vienna',
        country: 'Austria',
        address: 'Fixture Address',
        registrationOpensAt: '2026-05-20T10:00:00.000Z',
        registrationClosesAt: '2026-06-18T22:00:00.000Z',
        submissionOpensAt: null,
        submissionClosesAt: null,
        state: 'registration_open',
        maxTeamMembers: 1,
        createdByUserId: 'platform_admin'
      })
      await database.insert(userApplications).values({
        id: 'application_1',
        eventId: 'event_1',
        userId: 'participant_user',
        status: 'approved',
        checkedInAt: '2026-06-20T08:05:00.000Z',
        certificateEmailQueuedAt: '2026-06-21T08:00:00.000Z',
        certificateEmailQueuedByUserId: 'platform_admin'
      })

      const message = createQueueMessage({
        body: buildEventOutcomeEmailQueueMessage({
          notificationType: 'certificate',
          eventId: 'event_1',
          eventName: 'Codex Build Vienna',
          eventSlug: 'codex-build-vienna',
          applicationId: 'application_1',
          recipientUserId: 'participant_user',
          recipientEmail: 'participant@example.com',
          recipientDisplayName: 'Participant User',
          certificateUrl: 'https://events.example/events/codex-build-vienna/participant_user'
        })
      })
      const sendOutcomeEmail = vi.fn(async () => ({
        status: 'sent' as const,
        messageId: 'email_1'
      }))

      const result = await processEventOutcomeEmailQueueMessage(message, {
        database,
        sendOutcomeEmail
      })

      expect(result).toEqual(expect.objectContaining({
        action: 'ack',
        reason: 'delivery_sent'
      }))
      expect(message.ack).toHaveBeenCalled()
      expect(message.retry).not.toHaveBeenCalled()

      const storedApplication = await database.query.userApplications.findFirst({
        where: eq(userApplications.id, 'application_1')
      })

      expect(storedApplication?.certificateEmailSentAt).not.toBeNull()
    } finally {
      await d1Database.close()
    }
  })

  test('queue batch processing skips unrelated queues', async () => {
    const message = createQueueMessage()
    const result = await processEventOutcomeEmailQueueBatch({
      queue: 'different-queue',
      messages: [message]
    }, {
      runtimeConfig: {
        eventOutcomeEmails: {
          queueName: 'codex-events-dev-event-outcome-email-delivery'
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
