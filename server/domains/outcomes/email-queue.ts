import type { H3Event } from 'h3'

import { asc, eq, getTableColumns } from 'drizzle-orm'
import { z } from 'zod'

import type { AppDatabase } from '#server/database/client'
import { writeAuditLog } from '#server/database/audit-log'
import { prizeEligibilitySnapshots, users } from '#server/database/schema'
import { getFinalDeliberationView } from '#server/domains/outcomes'
import {
  sendEventOutcomeEmail,
  type EventOutcomeEmailDeliveryResult,
  type EventOutcomeEmailInput
} from './emails'
import { isRetryableOutboundEmailProviderError } from '#server/utils/outbound-email'

export const defaultEventOutcomeEmailQueueBinding = 'EVENT_OUTCOME_EMAIL_QUEUE'
export const defaultEventOutcomeEmailQueueName = 'codex-events-dev-event-outcome-email-delivery'
export const defaultEventOutcomeEmailRetryDelaySeconds = 120

const eventOutcomeEmailsQueueRuntimeConfigSchema = z.object({
  eventOutcomeEmails: z.object({
    queueBinding: z.string().trim().optional(),
    queueName: z.string().trim().optional(),
    retryDelaySeconds: z.coerce.number().int().nonnegative().optional()
  }).optional()
})

const baseEventOutcomeEmailQueueMessageSchema = z.object({
  eventId: z.string().trim().min(1),
  eventName: z.string().trim().min(1).max(200),
  eventSlug: z.string().trim().min(1).max(200),
  teamId: z.string().trim().min(1),
  teamName: z.string().trim().min(1).max(200),
  recipientUserId: z.string().trim().min(1),
  recipientEmail: z.string().trim().email().nullable(),
  recipientDisplayName: z.string().trim().max(160).nullable().optional(),
  announcedAt: z.string().trim().min(1),
  enqueuedAt: z.string().trim().min(1)
})

export const eventOutcomeEmailQueueMessageSchema = z.discriminatedUnion('notificationType', [
  baseEventOutcomeEmailQueueMessageSchema.extend({
    notificationType: z.literal('shortlist')
  }),
  baseEventOutcomeEmailQueueMessageSchema.extend({
    notificationType: z.literal('winner'),
    finalRank: z.coerce.number().int().positive(),
    rankedTeamCount: z.coerce.number().int().positive(),
    prizeNames: z.array(z.string().trim().min(1)).min(1)
  })
])

export type EventOutcomeEmailQueueMessage = z.infer<typeof eventOutcomeEmailQueueMessageSchema>
type PrizeEligibilitySnapshotRecord = typeof prizeEligibilitySnapshots.$inferSelect
type UserRecord = typeof users.$inferSelect

interface QueueProducerLike {
  send: (message: unknown, options?: {
    contentType?: 'text' | 'json' | 'bytes' | 'v8'
    delaySeconds?: number
  }) => Promise<void>
}

interface QueueMessageLike<Body = unknown> {
  id: string
  body: Body
  attempts: number
  ack: () => void
  retry: (options?: { delaySeconds?: number }) => void
}

interface QueueBatchLike<Body = unknown> {
  queue: string
  messages: readonly QueueMessageLike<Body>[]
}

type EventOutcomeEmailQueueRuntimeConfig = z.infer<typeof eventOutcomeEmailsQueueRuntimeConfigSchema>

export type EventOutcomeEmailEnqueueResult = {
  status: 'enqueued'
} | {
  status: 'skipped'
  reason: string
} | {
  status: 'failed'
  reason: string
  errorMessage: string
}

export type EventOutcomeEmailQueueMessageOutcome = {
  messageId: string
  action: 'ack' | 'retry'
  reason: string
  delivery: EventOutcomeEmailDeliveryResult | null
}

export function buildEventOutcomeEmailQueueMessage(
  input: EventOutcomeEmailInput
): EventOutcomeEmailQueueMessage {
  return {
    ...input,
    recipientDisplayName: input.recipientDisplayName?.trim() || null,
    enqueuedAt: new Date().toISOString()
  }
}

export async function enqueueWinnerOutcomeEmails(options: {
  h3Event: H3Event
  database: AppDatabase
  event: {
    id: string
    name: string
    slug: string
  }
  winners: Array<{
    teamId: string
    teamName: string
    finalRank: number
    prizes: Array<{
      name: string
    }>
  }>
  trigger: 'announce_winners' | 'complete'
  triggeredByUserId: string
  announcedAt: string
}) {
  if (options.winners.length === 0) {
    return
  }

  const finalDeliberation = await getFinalDeliberationView(
    options.database,
    options.event.id
  )
  const rankedTeamCount = finalDeliberation.entries.filter(
    entry => entry.finalRank !== null
  ).length
  const winningTeamIds = [...new Set(options.winners.map(winner => winner.teamId))]
  const winningTeamIdSet = new Set(winningTeamIds)
  const snapshots = (await options.database.query.prizeEligibilitySnapshots.findMany({
    where: eq(prizeEligibilitySnapshots.eventId, options.event.id),
    orderBy: [asc(prizeEligibilitySnapshots.createdAt)]
  })).filter(snapshot => winningTeamIdSet.has(snapshot.teamId)) as PrizeEligibilitySnapshotRecord[]
  const winnerRecipients = await options.database
    .select(getTableColumns(users))
    .from(users)
    .innerJoin(prizeEligibilitySnapshots, eq(prizeEligibilitySnapshots.userId, users.id))
    .where(eq(prizeEligibilitySnapshots.eventId, options.event.id)) as UserRecord[]
  const winnersByTeamId = new Map(
    options.winners.map(winner => [winner.teamId, winner] as const)
  )
  const usersById = new Map(
    winnerRecipients.map(user => [user.id, user] as const)
  )
  const deliveredRecipientKeys = new Set<string>()

  for (const snapshot of snapshots) {
    const winner = winnersByTeamId.get(snapshot.teamId)

    if (!winner) {
      continue
    }

    const recipientKey = `${snapshot.teamId}:${snapshot.userId}`

    if (deliveredRecipientKeys.has(recipientKey)) {
      continue
    }

    deliveredRecipientKeys.add(recipientKey)

    const recipient = usersById.get(snapshot.userId)
    const enqueueResult = await enqueueEventOutcomeEmailMessage(
      options.h3Event,
      buildEventOutcomeEmailQueueMessage({
        notificationType: 'winner',
        eventId: options.event.id,
        eventName: options.event.name,
        eventSlug: options.event.slug,
        teamId: winner.teamId,
        teamName: winner.teamName,
        recipientUserId: snapshot.userId,
        recipientEmail: recipient?.email ?? null,
        recipientDisplayName: recipient?.displayName ?? null,
        announcedAt: options.announcedAt,
        finalRank: winner.finalRank,
        rankedTeamCount: rankedTeamCount || winner.finalRank,
        prizeNames: winner.prizes.map(prize => prize.name)
      })
    )

    await writeAuditLog(options.database, {
      actorUserId: options.triggeredByUserId,
      entityType: 'event',
      entityId: options.event.id,
      action: 'event.winner_email_enqueued',
      metadata: {
        trigger: options.trigger,
        teamId: winner.teamId,
        userId: snapshot.userId,
        finalRank: winner.finalRank,
        enqueue: enqueueResult
      }
    })
  }
}

function resolveQueueRuntimeConfig(event: H3Event): EventOutcomeEmailQueueRuntimeConfig {
  const eventRuntimeConfig = (event.context as H3Event['context'] & { runtimeConfig?: unknown }).runtimeConfig
  const runtimeConfigGetter = (globalThis as { useRuntimeConfig?: (event: H3Event) => unknown }).useRuntimeConfig
  const candidate = eventRuntimeConfig ?? runtimeConfigGetter?.(event) ?? {}
  const parsed = eventOutcomeEmailsQueueRuntimeConfigSchema.safeParse(candidate)

  return parsed.success ? parsed.data : {}
}

function resolveQueueRuntimeConfigFromUnknown(candidate: unknown): EventOutcomeEmailQueueRuntimeConfig {
  const parsed = eventOutcomeEmailsQueueRuntimeConfigSchema.safeParse(candidate)

  return parsed.success ? parsed.data : {}
}

function getQueueBindingName(config: EventOutcomeEmailQueueRuntimeConfig) {
  return config.eventOutcomeEmails?.queueBinding?.trim() || defaultEventOutcomeEmailQueueBinding
}

function getQueueName(config: EventOutcomeEmailQueueRuntimeConfig) {
  return config.eventOutcomeEmails?.queueName?.trim() || defaultEventOutcomeEmailQueueName
}

function getRetryDelaySeconds(config: EventOutcomeEmailQueueRuntimeConfig) {
  return config.eventOutcomeEmails?.retryDelaySeconds ?? defaultEventOutcomeEmailRetryDelaySeconds
}

function isQueueProducerLike(value: unknown): value is QueueProducerLike {
  if (!value || typeof value !== 'object') {
    return false
  }

  const candidate = value as Partial<QueueProducerLike>
  return typeof candidate.send === 'function'
}

export function getEventOutcomeEmailQueueProducer(event: H3Event) {
  const config = resolveQueueRuntimeConfig(event)
  const bindingName = getQueueBindingName(config)
  const cloudflareEnv = event.context.cloudflare?.env as Record<string, unknown> | undefined
  const producerCandidate = cloudflareEnv?.[bindingName]

  if (isQueueProducerLike(producerCandidate)) {
    return {
      producer: producerCandidate,
      bindingName
    }
  }

  return {
    producer: null,
    bindingName
  }
}

export async function enqueueEventOutcomeEmailMessage(
  event: H3Event,
  messageInput: EventOutcomeEmailQueueMessage
): Promise<EventOutcomeEmailEnqueueResult> {
  const parsedMessage = eventOutcomeEmailQueueMessageSchema.safeParse(messageInput)

  if (!parsedMessage.success) {
    return {
      status: 'skipped',
      reason: 'queue_message_invalid'
    }
  }

  const { producer, bindingName } = getEventOutcomeEmailQueueProducer(event)

  if (!producer) {
    return {
      status: 'skipped',
      reason: `queue_binding_missing:${bindingName}`
    }
  }

  try {
    await producer.send(parsedMessage.data, {
      contentType: 'json'
    })
  } catch (error) {
    return {
      status: 'failed',
      reason: 'queue_send_error',
      errorMessage: error instanceof Error ? error.message : 'Unexpected queue send error'
    }
  }

  return {
    status: 'enqueued'
  }
}

function shouldRetryDeliveryFailure(delivery: EventOutcomeEmailDeliveryResult) {
  if (delivery.status !== 'failed') {
    return false
  }

  if (delivery.reason === 'transport_error') {
    return true
  }

  return isRetryableOutboundEmailProviderError(delivery.providerError)
}

export async function processEventOutcomeEmailQueueMessage(
  message: QueueMessageLike,
  options?: {
    runtimeConfig?: unknown
    cloudflareEnv?: Record<string, unknown>
    sendOutcomeEmail?: typeof sendEventOutcomeEmail
  }
): Promise<EventOutcomeEmailQueueMessageOutcome> {
  const parsedMessage = eventOutcomeEmailQueueMessageSchema.safeParse(message.body)

  if (!parsedMessage.success) {
    message.ack()

    return {
      messageId: message.id,
      action: 'ack',
      reason: 'queue_message_invalid',
      delivery: null
    }
  }

  const config = resolveQueueRuntimeConfigFromUnknown(options?.runtimeConfig ?? {})
  const sendOutcomeEmail = options?.sendOutcomeEmail ?? sendEventOutcomeEmail
  const delivery = await sendOutcomeEmail(
    { context: {} } as H3Event,
    parsedMessage.data,
    {
      runtimeConfig: options?.runtimeConfig,
      cloudflareEnv: options?.cloudflareEnv
    }
  )

  if (delivery.status === 'sent' || delivery.status === 'skipped') {
    message.ack()

    return {
      messageId: message.id,
      action: 'ack',
      reason: `delivery_${delivery.status}`,
      delivery
    }
  }

  if (shouldRetryDeliveryFailure(delivery)) {
    message.retry({
      delaySeconds: getRetryDelaySeconds(config)
    })

    return {
      messageId: message.id,
      action: 'retry',
      reason: 'delivery_failed_retryable',
      delivery
    }
  }

  message.ack()

  return {
    messageId: message.id,
    action: 'ack',
    reason: 'delivery_failed_non_retryable',
    delivery
  }
}

export async function processEventOutcomeEmailQueueBatch(
  batch: QueueBatchLike,
  options?: {
    runtimeConfig?: unknown
    cloudflareEnv?: Record<string, unknown>
    queueName?: string
    sendOutcomeEmail?: typeof sendEventOutcomeEmail
  }
) {
  const config = resolveQueueRuntimeConfigFromUnknown(options?.runtimeConfig ?? {})
  const expectedQueueName = options?.queueName ?? getQueueName(config)

  if (batch.queue !== expectedQueueName) {
    return {
      queue: batch.queue,
      skipped: true,
      outcomes: []
    }
  }

  const outcomes: EventOutcomeEmailQueueMessageOutcome[] = []

  for (const message of batch.messages) {
    outcomes.push(await processEventOutcomeEmailQueueMessage(message, {
      runtimeConfig: options?.runtimeConfig,
      cloudflareEnv: options?.cloudflareEnv,
      sendOutcomeEmail: options?.sendOutcomeEmail
    }))
  }

  return {
    queue: batch.queue,
    skipped: false,
    outcomes
  }
}
