import type { H3Event } from 'h3'

import { z } from 'zod'

export const defaultManagedMediaCleanupQueueBinding = 'MEDIA_CLEANUP_QUEUE'
export const defaultManagedMediaCleanupQueueName = 'codex-events-dev-media-cleanup'
export const managedMediaCleanupDelaySeconds = 30
export const defaultManagedMediaCleanupRetryDelaySeconds = 120

export const managedMediaCleanupKinds = [
  'event_image',
  'event_photo',
  'platform_default_event_background',
  'profile_icon'
] as const

export type ManagedMediaCleanupKind = typeof managedMediaCleanupKinds[number]

const managedMediaCleanupMessageSchema = z.object({
  kind: z.enum(managedMediaCleanupKinds),
  objectKey: z.string().trim().min(1),
  enqueuedAt: z.string().trim().min(1)
}).strict()

export type ManagedMediaCleanupQueueMessage = z.infer<typeof managedMediaCleanupMessageSchema>

export type ManagedMediaCleanupQueueInput = Pick<ManagedMediaCleanupQueueMessage, 'kind' | 'objectKey'>

interface QueueProducerLike {
  send: (message: unknown, options?: {
    contentType?: 'text' | 'json' | 'bytes' | 'v8'
    delaySeconds?: number
  }) => Promise<void>
}

interface QueueMessageLike {
  id: string
  body: unknown
  ack: () => void
  retry: (options?: { delaySeconds?: number }) => void
}

interface QueueBatchLike {
  queue: string
  messages: readonly QueueMessageLike[]
}

interface R2BucketLike {
  delete: (key: string) => Promise<void>
}

type RuntimeConfigShape = {
  mediaCleanup?: {
    queueBinding?: string
    queueName?: string
    retryDelaySeconds?: number
  }
  eventImages?: {
    binding?: string
  }
  profileIcons?: {
    binding?: string
  }
}

type CloudflareEnvShape = Record<string, unknown> | undefined

const objectKeyPatterns: Record<ManagedMediaCleanupKind, RegExp> = {
  event_image: /^events\/[^/]+\/(?:background|banner)\/[^/]+$/,
  event_photo: /^events\/[^/]+\/photos\/[^/]+\/[^/]+$/,
  platform_default_event_background: /^platform\/default-event-background\/[^/]+$/,
  profile_icon: /^users\/[^/]+\/profile-icon\/[^/]+$/
}

const defaultBucketBindingByKind: Record<ManagedMediaCleanupKind, 'EVENT_IMAGES' | 'PROFILE_ICONS'> = {
  event_image: 'EVENT_IMAGES',
  event_photo: 'EVENT_IMAGES',
  platform_default_event_background: 'EVENT_IMAGES',
  profile_icon: 'PROFILE_ICONS'
}

function resolveRuntimeConfig(event: H3Event): RuntimeConfigShape {
  const eventRuntimeConfig = (event.context as H3Event['context'] & { runtimeConfig?: unknown }).runtimeConfig
  const runtimeConfigGetter = (globalThis as { useRuntimeConfig?: (event: H3Event) => unknown }).useRuntimeConfig
  const candidate = eventRuntimeConfig ?? runtimeConfigGetter?.(event) ?? {}

  return isRuntimeConfigShape(candidate) ? candidate : {}
}

function resolveRuntimeConfigFromUnknown(candidate: unknown): RuntimeConfigShape {
  return isRuntimeConfigShape(candidate) ? candidate : {}
}

function isRuntimeConfigShape(value: unknown): value is RuntimeConfigShape {
  return Boolean(value && typeof value === 'object')
}

function isQueueProducerLike(value: unknown): value is QueueProducerLike {
  if (!value || typeof value !== 'object') {
    return false
  }

  return typeof (value as Partial<QueueProducerLike>).send === 'function'
}

function isR2BucketLike(value: unknown): value is R2BucketLike {
  if (!value || typeof value !== 'object') {
    return false
  }

  return typeof (value as Partial<R2BucketLike>).delete === 'function'
}

function getQueueBindingName(config: RuntimeConfigShape) {
  return config.mediaCleanup?.queueBinding?.trim() || defaultManagedMediaCleanupQueueBinding
}

function getQueueName(config: RuntimeConfigShape) {
  return config.mediaCleanup?.queueName?.trim() || defaultManagedMediaCleanupQueueName
}

function getRetryDelaySeconds(config: RuntimeConfigShape) {
  const configuredDelay = config.mediaCleanup?.retryDelaySeconds

  return typeof configuredDelay === 'number' && Number.isInteger(configuredDelay) && configuredDelay > 0
    ? configuredDelay
    : defaultManagedMediaCleanupRetryDelaySeconds
}

export function isManagedMediaCleanupObjectKey(kind: ManagedMediaCleanupKind, objectKey: string) {
  return objectKeyPatterns[kind].test(objectKey)
}

export function parseManagedMediaCleanupMessage(body: unknown) {
  const parsed = managedMediaCleanupMessageSchema.safeParse(body)

  if (!parsed.success || !isManagedMediaCleanupObjectKey(parsed.data.kind, parsed.data.objectKey)) {
    return null
  }

  return parsed.data
}

export function buildManagedMediaCleanupQueueMessage(
  input: ManagedMediaCleanupQueueInput,
  now = new Date()
): ManagedMediaCleanupQueueMessage {
  const message = {
    ...input,
    enqueuedAt: now.toISOString()
  }
  const parsed = parseManagedMediaCleanupMessage(message)

  if (!parsed) {
    throw new Error('Invalid managed media cleanup message.')
  }

  return parsed
}

export function getManagedMediaCleanupQueueProducer(event: H3Event) {
  const config = resolveRuntimeConfig(event)
  const bindingName = getQueueBindingName(config)
  const cloudflareEnv = event.context.cloudflare?.env as CloudflareEnvShape
  const producerCandidate = cloudflareEnv?.[bindingName]

  return {
    producer: isQueueProducerLike(producerCandidate) ? producerCandidate : null,
    bindingName
  }
}

export type ManagedMediaCleanupEnqueueResult = {
  status: 'enqueued'
} | {
  status: 'skipped'
  reason: string
} | {
  status: 'failed'
  reason: string
  errorMessage: string
}

export async function enqueueManagedMediaCleanupMessage(
  event: H3Event,
  input: ManagedMediaCleanupQueueInput
): Promise<ManagedMediaCleanupEnqueueResult> {
  let message: ManagedMediaCleanupQueueMessage

  try {
    message = buildManagedMediaCleanupQueueMessage(input)
  } catch {
    return {
      status: 'skipped',
      reason: 'queue_message_invalid'
    }
  }

  const { producer, bindingName } = getManagedMediaCleanupQueueProducer(event)

  if (!producer) {
    return {
      status: 'skipped',
      reason: `queue_binding_missing:${bindingName}`
    }
  }

  try {
    await producer.send(message, {
      contentType: 'json',
      delaySeconds: managedMediaCleanupDelaySeconds
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

export function scheduleManagedMediaCleanup(
  event: H3Event,
  input: ManagedMediaCleanupQueueInput
) {
  const sendPromise = enqueueManagedMediaCleanupMessage(event, input)
    .then((result) => {
      if (result.status !== 'enqueued') {
        console.error('Managed media cleanup was not queued.', {
          kind: input.kind,
          objectKey: input.objectKey,
          reason: result.reason
        })
      }
    })
    .catch((error) => {
      console.error('Managed media cleanup queue scheduling failed.', {
        kind: input.kind,
        objectKey: input.objectKey,
        error
      })
    })
  const waitUntil = (event as H3Event & {
    waitUntil?: (promise: Promise<unknown>) => void
  }).waitUntil

  if (typeof waitUntil === 'function') {
    try {
      waitUntil(sendPromise)
      return
    } catch (error) {
      console.error('Managed media cleanup waitUntil registration failed.', {
        kind: input.kind,
        objectKey: input.objectKey,
        error
      })
    }
  }

  void sendPromise
}

function getBucketBindingName(kind: ManagedMediaCleanupKind, config: RuntimeConfigShape) {
  const defaultBindingName = defaultBucketBindingByKind[kind]

  return kind === 'profile_icon'
    ? config.profileIcons?.binding?.trim() || defaultBindingName
    : config.eventImages?.binding?.trim() || defaultBindingName
}

function getCleanupBucket(
  kind: ManagedMediaCleanupKind,
  runtimeConfig: unknown,
  cloudflareEnv: CloudflareEnvShape
) {
  const config = resolveRuntimeConfigFromUnknown(runtimeConfig)
  const bindingName = getBucketBindingName(kind, config)
  const bucketCandidate = cloudflareEnv?.[bindingName]

  return isR2BucketLike(bucketCandidate) ? bucketCandidate : null
}

export type ManagedMediaCleanupQueueMessageOutcome = {
  messageId: string
  action: 'ack' | 'retry'
  reason: string
}

export async function processManagedMediaCleanupQueueMessage(
  message: QueueMessageLike,
  options?: {
    runtimeConfig?: unknown
    cloudflareEnv?: CloudflareEnvShape
  }
): Promise<ManagedMediaCleanupQueueMessageOutcome> {
  const parsedMessage = parseManagedMediaCleanupMessage(message.body)

  if (!parsedMessage) {
    message.ack()

    return {
      messageId: message.id,
      action: 'ack',
      reason: 'queue_message_invalid'
    }
  }

  const bucket = getCleanupBucket(parsedMessage.kind, options?.runtimeConfig, options?.cloudflareEnv)

  if (!bucket) {
    message.retry({
      delaySeconds: getRetryDelaySeconds(resolveRuntimeConfigFromUnknown(options?.runtimeConfig ?? {}))
    })

    return {
      messageId: message.id,
      action: 'retry',
      reason: 'cleanup_bucket_missing'
    }
  }

  try {
    await bucket.delete(parsedMessage.objectKey)
    message.ack()

    return {
      messageId: message.id,
      action: 'ack',
      reason: 'object_deleted'
    }
  } catch (error) {
    message.retry({
      delaySeconds: getRetryDelaySeconds(resolveRuntimeConfigFromUnknown(options?.runtimeConfig ?? {}))
    })

    return {
      messageId: message.id,
      action: 'retry',
      reason: error instanceof Error ? 'object_delete_failed' : 'object_delete_failed_unknown'
    }
  }
}

export async function processManagedMediaCleanupQueueBatch(
  batch: QueueBatchLike,
  options?: {
    runtimeConfig?: unknown
    cloudflareEnv?: CloudflareEnvShape
  }
) {
  const outcomes: ManagedMediaCleanupQueueMessageOutcome[] = []

  for (const message of batch.messages) {
    outcomes.push(await processManagedMediaCleanupQueueMessage(message, options))
  }

  return outcomes
}

export function getManagedMediaCleanupQueueName(runtimeConfig: unknown) {
  return getQueueName(resolveRuntimeConfigFromUnknown(runtimeConfig))
}
