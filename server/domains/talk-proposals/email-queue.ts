import type { H3Event } from 'h3'

import { and, asc, eq, isNull, lt, or, sql } from 'drizzle-orm'
import { z } from 'zod'

import type { AppDatabase, D1DatabaseBinding } from '#server/database/client'
import { createDatabase, resolveD1Binding } from '#server/database/client'
import { writeAuditLog } from '#server/database/audit-log'
import { events, talkProposals } from '#server/database/schema'
import { isRetryableOutboundEmailProviderError } from '#server/utils/outbound-email'
import { decideTalkProposal, getTalkProposalReviewDetail, serializeTalkProposal } from './index'
import { sendTalkProposalDecisionEmail, type TalkProposalEmailDeliveryResult } from './emails'

export const defaultTalkProposalDecisionEmailQueueBinding = 'TALK_PROPOSAL_DECISION_EMAIL_QUEUE'
export const defaultTalkProposalDecisionEmailQueueName = 'codex-events-dev-talk-proposal-decision-email-delivery'
export const defaultTalkProposalDecisionEmailRetryDelaySeconds = 120
export const defaultTalkProposalDecisionEmailLeaseSeconds = 300
export const defaultTalkProposalDecisionEmailRecoveryBatchSize = 50

const runtimeConfigSchema = z.object({
  database: z.object({ binding: z.string().optional() }).optional(),
  talkProposalDecisionEmails: z.object({
    queueBinding: z.string().optional(),
    queueName: z.string().optional(),
    retryDelaySeconds: z.coerce.number().int().nonnegative().optional()
  }).optional()
})

const messageSchema = z.object({
  proposalId: z.string().trim().min(1),
  deliveryId: z.string().trim().min(1)
})

export type TalkProposalDecisionEmailQueueMessage = z.infer<typeof messageSchema>

interface QueueProducerLike { send: (message: unknown, options?: { contentType?: 'json' }) => Promise<void> }
interface QueueMessageLike { id: string, body: unknown, attempts: number, ack: () => void, retry: (options?: { delaySeconds?: number }) => void }
interface QueueBatchLike { queue: string, messages: readonly QueueMessageLike[] }

type ProcessingOptions = {
  database: AppDatabase
  runtimeConfig?: unknown
  cloudflareEnv?: Record<string, unknown>
  sendEmail?: typeof sendTalkProposalDecisionEmail
  now?: Date
}

let startupRecoveryPromise: Promise<unknown> | null = null

function configValue(candidate: unknown) {
  const parsed = runtimeConfigSchema.safeParse(candidate)
  return parsed.success ? parsed.data : {}
}

function retryDelaySeconds(runtimeConfig?: unknown) {
  return configValue(runtimeConfig).talkProposalDecisionEmails?.retryDelaySeconds
    ?? defaultTalkProposalDecisionEmailRetryDelaySeconds
}

function leaseExpiresAt(now: Date) {
  return new Date(now.getTime() + defaultTalkProposalDecisionEmailLeaseSeconds * 1000).toISOString()
}

function queueBindingName(runtimeConfig?: unknown) {
  return configValue(runtimeConfig).talkProposalDecisionEmails?.queueBinding?.trim()
    || defaultTalkProposalDecisionEmailQueueBinding
}

function queueName(runtimeConfig?: unknown) {
  return configValue(runtimeConfig).talkProposalDecisionEmails?.queueName?.trim()
    || defaultTalkProposalDecisionEmailQueueName
}

function resolveProducer(runtimeConfig?: unknown, cloudflareEnv?: Record<string, unknown>) {
  const bindingName = queueBindingName(runtimeConfig)
  const candidate = cloudflareEnv?.[bindingName] as Partial<QueueProducerLike> | undefined
  return {
    bindingName,
    producer: typeof candidate?.send === 'function' ? candidate as QueueProducerLike : null
  }
}

function eventRuntimeConfig(event: H3Event) {
  return (event.context as H3Event['context'] & { runtimeConfig?: unknown }).runtimeConfig
    ?? useRuntimeConfig(event)
}

export function buildTalkProposalDecisionEmailQueueMessage(input: {
  proposalId: string
  deliveryId?: string
  [key: string]: unknown
}) {
  return messageSchema.parse({
    proposalId: input.proposalId,
    deliveryId: input.deliveryId ?? `talk-proposal-decision:${input.proposalId}`
  })
}

async function recordEnqueueAudit(
  database: AppDatabase,
  proposal: typeof talkProposals.$inferSelect,
  outcome: 'enqueued' | 'failed' | 'skipped',
  trigger: 'decision' | 'startup' | 'scheduled',
  reason?: string
) {
  await writeAuditLog(database, {
    actorUserId: proposal.reviewedByUserId,
    entityType: 'talk_proposal',
    entityId: proposal.id,
    action: 'talk_proposal.decision_email_enqueue_attempted',
    metadata: {
      eventId: proposal.eventId,
      deliveryId: proposal.decisionEmailDeliveryId,
      outcome,
      trigger,
      ...(reason ? { reason } : {})
    }
  })
}

export async function enqueuePendingTalkProposalDecisionEmail(options: {
  database: AppDatabase
  proposalId: string
  runtimeConfig?: unknown
  cloudflareEnv?: Record<string, unknown>
  trigger: 'decision' | 'startup' | 'scheduled'
  now?: Date
}) {
  const now = options.now ?? new Date()
  const timestamp = now.toISOString()
  const retryableBefore = new Date(
    now.getTime() - defaultTalkProposalDecisionEmailLeaseSeconds * 1000
  ).toISOString()
  const leaseToken = crypto.randomUUID()
  const [proposal] = await options.database.update(talkProposals).set({
    decisionEmailEnqueueAttempts: sql`${talkProposals.decisionEmailEnqueueAttempts} + 1`,
    decisionEmailLastEnqueueAttemptedAt: timestamp,
    decisionEmailEnqueueLeaseToken: leaseToken,
    decisionEmailEnqueueLeaseExpiresAt: leaseExpiresAt(now),
    updatedAt: timestamp
  }).where(and(
    eq(talkProposals.id, options.proposalId),
    or(
      eq(talkProposals.decisionEmailState, 'pending'),
      and(
        eq(talkProposals.decisionEmailState, 'retryable'),
        lt(talkProposals.updatedAt, retryableBefore)
      )
    ),
    or(
      isNull(talkProposals.decisionEmailEnqueueLeaseExpiresAt),
      lt(talkProposals.decisionEmailEnqueueLeaseExpiresAt, timestamp)
    )
  )).returning()

  if (!proposal?.decisionEmailDeliveryId) {
    return { status: 'skipped' as const, reason: 'delivery_not_pending' }
  }

  const { bindingName, producer } = resolveProducer(options.runtimeConfig, options.cloudflareEnv)
  if (!producer) {
    const reason = `queue_binding_missing:${bindingName}`
    await options.database.update(talkProposals).set({
      decisionEmailEnqueueLeaseToken: null,
      decisionEmailEnqueueLeaseExpiresAt: null,
      decisionEmailLastFailureCode: reason,
      decisionEmailFailedAt: timestamp,
      updatedAt: timestamp
    }).where(and(
      eq(talkProposals.id, proposal.id),
      eq(talkProposals.decisionEmailEnqueueLeaseToken, leaseToken)
    ))
    await recordEnqueueAudit(options.database, proposal, 'skipped', options.trigger, reason)
    return { status: 'skipped' as const, reason }
  }

  try {
    await producer.send(buildTalkProposalDecisionEmailQueueMessage({
      proposalId: proposal.id,
      deliveryId: proposal.decisionEmailDeliveryId
    }), { contentType: 'json' })
    const queuedAt = new Date().toISOString()
    await options.database.update(talkProposals).set({
      decisionEmailState: 'enqueued',
      decisionEmailQueuedAt: queuedAt,
      decisionEmailEnqueueLeaseToken: null,
      decisionEmailEnqueueLeaseExpiresAt: null,
      decisionEmailLastFailureCode: null,
      decisionEmailFailedAt: null,
      updatedAt: queuedAt
    }).where(and(
      eq(talkProposals.id, proposal.id),
      eq(talkProposals.decisionEmailEnqueueLeaseToken, leaseToken)
    ))
    await recordEnqueueAudit(options.database, proposal, 'enqueued', options.trigger)
    return { status: 'enqueued' as const }
  } catch {
    const failedAt = new Date().toISOString()
    await options.database.update(talkProposals).set({
      decisionEmailEnqueueLeaseToken: null,
      decisionEmailEnqueueLeaseExpiresAt: null,
      decisionEmailLastFailureCode: 'queue_send_error',
      decisionEmailFailedAt: failedAt,
      updatedAt: failedAt
    }).where(and(
      eq(talkProposals.id, proposal.id),
      eq(talkProposals.decisionEmailEnqueueLeaseToken, leaseToken)
    ))
    await recordEnqueueAudit(options.database, proposal, 'failed', options.trigger, 'queue_send_error')
    return { status: 'failed' as const, reason: 'queue_send_error' }
  }
}

export async function decideTalkProposalAndEnqueue(
  event: H3Event,
  options: {
    database: AppDatabase
    eventId: string
    proposalId: string
    reviewerUserId: string
    decision: 'accepted' | 'rejected'
    message?: string | null
  }
) {
  const proposal = await decideTalkProposal(options.database, options)
  const runtimeConfig = eventRuntimeConfig(event)
  const enqueue = await enqueuePendingTalkProposalDecisionEmail({
    database: options.database,
    proposalId: proposal.id,
    runtimeConfig,
    cloudflareEnv: event.context.cloudflare?.env as Record<string, unknown> | undefined,
    trigger: 'decision'
  })
  await writeAuditLog(options.database, {
    actorUserId: options.reviewerUserId,
    entityType: 'talk_proposal',
    entityId: proposal.id,
    action: `talk_proposal.${options.decision}`,
    metadata: {
      eventId: options.eventId,
      decision: options.decision,
      deliveryId: proposal.decisionEmailDeliveryId,
      emailEnqueueStatus: enqueue.status
    }
  })
  const stored = await options.database.query.talkProposals.findFirst({
    where: eq(talkProposals.id, proposal.id)
  })
  return { proposal: serializeTalkProposal(stored ?? proposal), emailEnqueue: enqueue }
}

function shouldRetry(delivery: TalkProposalEmailDeliveryResult) {
  return delivery.status === 'failed'
    && (delivery.reason === 'transport_error' || isRetryableOutboundEmailProviderError(delivery.providerError))
}

async function recordDeliveryAudit(
  database: AppDatabase,
  proposal: typeof talkProposals.$inferSelect,
  action: string,
  metadata: Record<string, unknown>
) {
  await writeAuditLog(database, {
    actorUserId: proposal.reviewedByUserId,
    entityType: 'talk_proposal',
    entityId: proposal.id,
    action,
    metadata: {
      eventId: proposal.eventId,
      decision: proposal.status,
      deliveryId: proposal.decisionEmailDeliveryId,
      ...metadata
    }
  })
}

export async function processTalkProposalDecisionEmailQueueMessage(
  message: QueueMessageLike,
  options: ProcessingOptions
) {
  const parsed = messageSchema.safeParse(message.body)
  if (!parsed.success) {
    message.ack()
    return { action: 'ack' as const, reason: 'queue_message_invalid', delivery: null }
  }

  const now = options.now ?? new Date()
  const attemptedAt = now.toISOString()
  const leaseToken = crypto.randomUUID()
  const [proposal] = await options.database.update(talkProposals).set({
    decisionEmailState: 'delivering',
    decisionEmailDeliveryAttempts: sql`${talkProposals.decisionEmailDeliveryAttempts} + 1`,
    decisionEmailLastAttemptedAt: attemptedAt,
    decisionEmailDeliveryLeaseToken: leaseToken,
    decisionEmailDeliveryLeaseExpiresAt: leaseExpiresAt(now),
    updatedAt: attemptedAt
  }).where(and(
    eq(talkProposals.id, parsed.data.proposalId),
    eq(talkProposals.decisionEmailDeliveryId, parsed.data.deliveryId),
    or(
      eq(talkProposals.decisionEmailState, 'enqueued'),
      eq(talkProposals.decisionEmailState, 'retryable'),
      and(
        eq(talkProposals.decisionEmailState, 'delivering'),
        or(
          isNull(talkProposals.decisionEmailDeliveryLeaseExpiresAt),
          lt(talkProposals.decisionEmailDeliveryLeaseExpiresAt, attemptedAt)
        )
      )
    )
  )).returning()

  if (!proposal) {
    const current = await options.database.query.talkProposals.findFirst({
      where: eq(talkProposals.id, parsed.data.proposalId)
    })
    if (!current || current.decisionEmailDeliveryId !== parsed.data.deliveryId) {
      message.ack()
      return { action: 'ack' as const, reason: 'proposal_decision_stale', delivery: null }
    }
    if (current.decisionEmailState === 'sent') {
      message.ack()
      return { action: 'ack' as const, reason: 'delivery_already_sent', delivery: null }
    }
    if (current.decisionEmailState === 'delivering') {
      message.retry({ delaySeconds: retryDelaySeconds(options.runtimeConfig) })
      return { action: 'retry' as const, reason: 'delivery_claim_active', delivery: null }
    }
    message.ack()
    return { action: 'ack' as const, reason: 'delivery_not_sendable', delivery: null }
  }

  const [detail, eventRecord] = await Promise.all([
    getTalkProposalReviewDetail(options.database, proposal.eventId, proposal.id),
    options.database.query.events.findFirst({ where: eq(events.id, proposal.eventId) })
  ])
  if (!eventRecord || (proposal.status !== 'accepted' && proposal.status !== 'rejected') || !proposal.decidedAt) {
    await options.database.update(talkProposals).set({
      decisionEmailState: 'failed',
      decisionEmailDeliveryLeaseToken: null,
      decisionEmailDeliveryLeaseExpiresAt: null,
      decisionEmailLastFailureCode: 'proposal_decision_stale',
      decisionEmailFailedAt: attemptedAt,
      updatedAt: attemptedAt
    }).where(and(
      eq(talkProposals.id, proposal.id),
      eq(talkProposals.decisionEmailDeliveryLeaseToken, leaseToken)
    ))
    message.ack()
    return { action: 'ack' as const, reason: 'proposal_decision_stale', delivery: null }
  }

  const delivery = await (options.sendEmail ?? sendTalkProposalDecisionEmail)(
    { context: {} } as H3Event,
    {
      proposalId: proposal.id,
      decision: proposal.status,
      decidedAt: proposal.decidedAt,
      recipientEmail: detail.owner.email,
      recipientDisplayName: detail.owner.displayName,
      eventName: eventRecord.name,
      eventSlug: eventRecord.slug,
      decisionMessage: proposal.decisionMessage
    },
    { runtimeConfig: options.runtimeConfig, cloudflareEnv: options.cloudflareEnv }
  )
  const completedAt = new Date().toISOString()

  if (delivery.status === 'sent') {
    const [completed] = await options.database.update(talkProposals).set({
      decisionEmailState: 'sent',
      decisionEmailSentAt: completedAt,
      decisionEmailFailedAt: null,
      decisionEmailLastFailureCode: null,
      decisionEmailDeliveryLeaseToken: null,
      decisionEmailDeliveryLeaseExpiresAt: null,
      updatedAt: completedAt
    }).where(and(
      eq(talkProposals.id, proposal.id),
      eq(talkProposals.decisionEmailDeliveryLeaseToken, leaseToken)
    )).returning({ id: talkProposals.id })
    if (!completed) {
      message.retry({ delaySeconds: retryDelaySeconds(options.runtimeConfig) })
      return { action: 'retry' as const, reason: 'delivery_sent_state_not_recorded', delivery }
    }
    await recordDeliveryAudit(options.database, proposal, 'talk_proposal.decision_email_sent', {
      outcome: 'sent',
      messageId: delivery.messageId
    })
    message.ack()
    return { action: 'ack' as const, reason: 'delivery_sent', delivery }
  }

  const retryable = shouldRetry(delivery)
  const reason = delivery.reason
  await options.database.update(talkProposals).set({
    decisionEmailState: retryable ? 'retryable' : 'failed',
    decisionEmailFailedAt: completedAt,
    decisionEmailLastFailureCode: reason,
    decisionEmailDeliveryLeaseToken: null,
    decisionEmailDeliveryLeaseExpiresAt: null,
    updatedAt: completedAt
  }).where(and(
    eq(talkProposals.id, proposal.id),
    eq(talkProposals.decisionEmailDeliveryLeaseToken, leaseToken)
  ))
  await recordDeliveryAudit(options.database, proposal, 'talk_proposal.decision_email_attempted', {
    outcome: retryable ? 'retryable_failure' : delivery.status === 'skipped' ? 'skipped' : 'terminal_failure',
    reason
  })
  if (retryable) {
    message.retry({ delaySeconds: retryDelaySeconds(options.runtimeConfig) })
    return { action: 'retry' as const, reason: 'delivery_failed_retryable', delivery }
  }
  message.ack()
  return {
    action: 'ack' as const,
    reason: delivery.status === 'skipped' ? 'delivery_skipped' : 'delivery_failed_non_retryable',
    delivery
  }
}

export async function processTalkProposalDecisionEmailQueueBatch(
  batch: QueueBatchLike,
  options: ProcessingOptions
) {
  const expected = queueName(options.runtimeConfig)
  if (batch.queue !== expected) return { queue: batch.queue, skipped: true, outcomes: [] }
  const outcomes = []
  for (const message of batch.messages) {
    outcomes.push(await processTalkProposalDecisionEmailQueueMessage(message, options))
  }
  return { queue: batch.queue, skipped: false, outcomes }
}

async function resolveRecoveryDatabase(options: {
  database?: AppDatabase
  runtimeConfig?: unknown
  cloudflareEnv?: Record<string, unknown>
  d1Database?: D1DatabaseBinding
}) {
  if (options.database) return options.database
  const binding = configValue(options.runtimeConfig).database?.binding?.trim() || 'DB'
  return createDatabase(resolveD1Binding(binding, options.cloudflareEnv, options.d1Database))
}

export async function reconcilePendingTalkProposalDecisionEmails(options: {
  database?: AppDatabase
  runtimeConfig?: unknown
  cloudflareEnv?: Record<string, unknown>
  d1Database?: D1DatabaseBinding
  trigger: 'startup' | 'scheduled'
  now?: Date
}) {
  const database = await resolveRecoveryDatabase(options)
  const now = options.now ?? new Date()
  const timestamp = now.toISOString()
  const retryableBefore = new Date(
    now.getTime() - defaultTalkProposalDecisionEmailLeaseSeconds * 1000
  ).toISOString()
  const pending = await database.query.talkProposals.findMany({
    where: and(
      or(
        eq(talkProposals.decisionEmailState, 'pending'),
        and(
          eq(talkProposals.decisionEmailState, 'retryable'),
          lt(talkProposals.updatedAt, retryableBefore)
        )
      ),
      or(
        isNull(talkProposals.decisionEmailEnqueueLeaseExpiresAt),
        lt(talkProposals.decisionEmailEnqueueLeaseExpiresAt, timestamp)
      )
    ),
    orderBy: [asc(talkProposals.updatedAt)],
    limit: defaultTalkProposalDecisionEmailRecoveryBatchSize
  })
  const outcomes = []
  for (const proposal of pending) {
    outcomes.push(await enqueuePendingTalkProposalDecisionEmail({
      database,
      proposalId: proposal.id,
      runtimeConfig: options.runtimeConfig,
      cloudflareEnv: options.cloudflareEnv,
      trigger: options.trigger,
      now: options.now
    }))
  }
  return {
    status: outcomes.some(outcome => outcome.status === 'enqueued') ? 'recovered' as const : 'skipped' as const,
    pendingCount: pending.length,
    recoveredCount: outcomes.filter(outcome => outcome.status === 'enqueued').length,
    outcomes
  }
}

export function scheduleTalkProposalDecisionEmailStartupRecovery(options: {
  database?: AppDatabase
  runtimeConfig?: unknown
  cloudflareEnv?: Record<string, unknown>
  d1Database?: D1DatabaseBinding
}) {
  startupRecoveryPromise ??= reconcilePendingTalkProposalDecisionEmails({ ...options, trigger: 'startup' })
  return startupRecoveryPromise
}

export function resetTalkProposalDecisionEmailStartupRecoveryForTest() {
  startupRecoveryPromise = null
}
