import type { H3Event } from 'h3'

import { z } from 'zod'

import {
  sendHackathonOutcomeEmail,
  type HackathonOutcomeEmailDeliveryResult,
  type HackathonOutcomeEmailInput
} from './hackathon-outcome-emails'

export const defaultHackathonOutcomeEmailQueueBinding = 'HACKATHON_OUTCOME_EMAIL_QUEUE'
export const defaultHackathonOutcomeEmailQueueName = 'codex-hackathons-hackathon-outcome-email-delivery'
export const defaultHackathonOutcomeEmailRetryDelaySeconds = 120

const hackathonOutcomeEmailsQueueRuntimeConfigSchema = z.object({
  hackathonOutcomeEmails: z.object({
    queueBinding: z.string().trim().optional(),
    queueName: z.string().trim().optional(),
    retryDelaySeconds: z.coerce.number().int().nonnegative().optional()
  }).optional()
})

const baseHackathonOutcomeEmailQueueMessageSchema = z.object({
  hackathonId: z.string().trim().min(1),
  hackathonName: z.string().trim().min(1).max(200),
  hackathonSlug: z.string().trim().min(1).max(200),
  teamId: z.string().trim().min(1),
  teamName: z.string().trim().min(1).max(200),
  recipientUserId: z.string().trim().min(1),
  recipientEmail: z.string().trim().email().nullable(),
  recipientDisplayName: z.string().trim().max(160).nullable().optional(),
  announcedAt: z.string().trim().min(1),
  enqueuedAt: z.string().trim().min(1)
})

export const hackathonOutcomeEmailQueueMessageSchema = z.discriminatedUnion('notificationType', [
  baseHackathonOutcomeEmailQueueMessageSchema.extend({
    notificationType: z.literal('shortlist')
  }),
  baseHackathonOutcomeEmailQueueMessageSchema.extend({
    notificationType: z.literal('winner'),
    finalRank: z.coerce.number().int().positive(),
    rankedTeamCount: z.coerce.number().int().positive(),
    prizeNames: z.array(z.string().trim().min(1)).min(1)
  })
])

export type HackathonOutcomeEmailQueueMessage = z.infer<typeof hackathonOutcomeEmailQueueMessageSchema>

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

type HackathonOutcomeEmailQueueRuntimeConfig = z.infer<typeof hackathonOutcomeEmailsQueueRuntimeConfigSchema>

export type HackathonOutcomeEmailEnqueueResult = {
  status: 'enqueued'
} | {
  status: 'skipped'
  reason: string
} | {
  status: 'failed'
  reason: string
  errorMessage: string
}

export type HackathonOutcomeEmailQueueMessageOutcome = {
  messageId: string
  action: 'ack' | 'retry'
  reason: string
  delivery: HackathonOutcomeEmailDeliveryResult | null
}

export function buildHackathonOutcomeEmailQueueMessage(
  input: HackathonOutcomeEmailInput
): HackathonOutcomeEmailQueueMessage {
  return {
    ...input,
    recipientDisplayName: input.recipientDisplayName?.trim() || null,
    enqueuedAt: new Date().toISOString()
  }
}

function resolveQueueRuntimeConfig(event: H3Event): HackathonOutcomeEmailQueueRuntimeConfig {
  const eventRuntimeConfig = (event.context as H3Event['context'] & { runtimeConfig?: unknown }).runtimeConfig
  const runtimeConfigGetter = (globalThis as { useRuntimeConfig?: (event: H3Event) => unknown }).useRuntimeConfig
  const candidate = eventRuntimeConfig ?? runtimeConfigGetter?.(event) ?? {}
  const parsed = hackathonOutcomeEmailsQueueRuntimeConfigSchema.safeParse(candidate)

  return parsed.success ? parsed.data : {}
}

function resolveQueueRuntimeConfigFromUnknown(candidate: unknown): HackathonOutcomeEmailQueueRuntimeConfig {
  const parsed = hackathonOutcomeEmailsQueueRuntimeConfigSchema.safeParse(candidate)

  return parsed.success ? parsed.data : {}
}

function getQueueBindingName(config: HackathonOutcomeEmailQueueRuntimeConfig) {
  return config.hackathonOutcomeEmails?.queueBinding?.trim() || defaultHackathonOutcomeEmailQueueBinding
}

function getQueueName(config: HackathonOutcomeEmailQueueRuntimeConfig) {
  return config.hackathonOutcomeEmails?.queueName?.trim() || defaultHackathonOutcomeEmailQueueName
}

function getRetryDelaySeconds(config: HackathonOutcomeEmailQueueRuntimeConfig) {
  return config.hackathonOutcomeEmails?.retryDelaySeconds ?? defaultHackathonOutcomeEmailRetryDelaySeconds
}

function isQueueProducerLike(value: unknown): value is QueueProducerLike {
  if (!value || typeof value !== 'object') {
    return false
  }

  const candidate = value as Partial<QueueProducerLike>
  return typeof candidate.send === 'function'
}

export function getHackathonOutcomeEmailQueueProducer(event: H3Event) {
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

export async function enqueueHackathonOutcomeEmailMessage(
  event: H3Event,
  messageInput: HackathonOutcomeEmailQueueMessage
): Promise<HackathonOutcomeEmailEnqueueResult> {
  const parsedMessage = hackathonOutcomeEmailQueueMessageSchema.safeParse(messageInput)

  if (!parsedMessage.success) {
    return {
      status: 'skipped',
      reason: 'queue_message_invalid'
    }
  }

  const { producer, bindingName } = getHackathonOutcomeEmailQueueProducer(event)

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

function shouldRetryDeliveryFailure(delivery: HackathonOutcomeEmailDeliveryResult) {
  if (delivery.status !== 'failed') {
    return false
  }

  if (delivery.reason === 'transport_error') {
    return true
  }

  const providerError = delivery.providerError
  const statusCode = providerError?.statusCode ?? null
  const providerName = providerError?.name ?? ''

  if (statusCode === 429 || (statusCode !== null && statusCode >= 500)) {
    return true
  }

  return providerName === 'application_error'
    || providerName === 'internal_server_error'
    || providerName === 'rate_limit_exceeded'
    || providerName === 'concurrent_idempotent_requests'
}

export async function processHackathonOutcomeEmailQueueMessage(
  message: QueueMessageLike,
  options?: {
    runtimeConfig?: unknown
    sendOutcomeEmail?: typeof sendHackathonOutcomeEmail
  }
): Promise<HackathonOutcomeEmailQueueMessageOutcome> {
  const parsedMessage = hackathonOutcomeEmailQueueMessageSchema.safeParse(message.body)

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
  const sendOutcomeEmail = options?.sendOutcomeEmail ?? sendHackathonOutcomeEmail
  const delivery = await sendOutcomeEmail(
    { context: {} } as H3Event,
    parsedMessage.data,
    {
      runtimeConfig: options?.runtimeConfig
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

export async function processHackathonOutcomeEmailQueueBatch(
  batch: QueueBatchLike,
  options?: {
    runtimeConfig?: unknown
    queueName?: string
    sendOutcomeEmail?: typeof sendHackathonOutcomeEmail
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

  const outcomes: HackathonOutcomeEmailQueueMessageOutcome[] = []

  for (const message of batch.messages) {
    outcomes.push(await processHackathonOutcomeEmailQueueMessage(message, {
      runtimeConfig: options?.runtimeConfig,
      sendOutcomeEmail: options?.sendOutcomeEmail
    }))
  }

  return {
    queue: batch.queue,
    skipped: false,
    outcomes
  }
}
