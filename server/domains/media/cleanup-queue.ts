import { z } from 'zod'

export const defaultManagedMediaCleanupQueueBinding = 'MEDIA_CLEANUP_QUEUE'
export const defaultManagedMediaCleanupQueueName = 'codex-events-dev-media-cleanup'
export const defaultManagedMediaCleanupDeadLetterQueueName = 'codex-events-dev-media-cleanup-dlq'
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

export interface ManagedMediaCleanupQueueProducer {
  send: (message: unknown, options?: {
    contentType?: 'text' | 'json' | 'bytes' | 'v8'
    delaySeconds?: number
  }) => Promise<unknown>
}

export interface ManagedMediaCleanupQueueMessageLike {
  id: string
  body: unknown
  ack: () => void
  retry: (options?: { delaySeconds?: number }) => void
}

export interface ManagedMediaCleanupQueueBatchLike {
  queue: string
  messages: readonly ManagedMediaCleanupQueueMessageLike[]
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
  event_image: /^events\/[^/]+\/(?:background(?:\/[^/]+|-image)|banner(?:\/[^/]+|-image))$/,
  event_photo: /^events\/[^/]+\/photos\/[^/]+(?:\/[^/]+)?$/,
  platform_default_event_background: /^platform\/default-event-background(?:\/[^/]+|-image)$/,
  profile_icon: /^users\/[^/]+\/profile-icon(?:\/[^/]+)?$/
}

const defaultBucketBindingByKind: Record<ManagedMediaCleanupKind, 'EVENT_IMAGES' | 'PROFILE_ICONS'> = {
  event_image: 'EVENT_IMAGES',
  event_photo: 'EVENT_IMAGES',
  platform_default_event_background: 'EVENT_IMAGES',
  profile_icon: 'PROFILE_ICONS'
}

function resolveRuntimeConfigFromUnknown(candidate: unknown): RuntimeConfigShape {
  return isRuntimeConfigShape(candidate) ? candidate : {}
}

function isRuntimeConfigShape(value: unknown): value is RuntimeConfigShape {
  return Boolean(value && typeof value === 'object')
}

function isQueueProducerLike(value: unknown): value is ManagedMediaCleanupQueueProducer {
  if (!value || typeof value !== 'object') {
    return false
  }

  return typeof (value as Partial<ManagedMediaCleanupQueueProducer>).send === 'function'
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

export function getManagedMediaCleanupQueueProducer(
  runtimeConfig: unknown,
  cloudflareEnv: CloudflareEnvShape
) {
  const config = resolveRuntimeConfigFromUnknown(runtimeConfig)
  const bindingName = getQueueBindingName(config)
  const producerCandidate = cloudflareEnv?.[bindingName]

  return {
    producer: isQueueProducerLike(producerCandidate) ? producerCandidate : null,
    bindingName
  }
}

export async function sendManagedMediaCleanupMessage(
  producer: ManagedMediaCleanupQueueProducer,
  input: ManagedMediaCleanupQueueInput,
  enqueuedAt = new Date()
) {
  const message = buildManagedMediaCleanupQueueMessage(input, enqueuedAt)

  await producer.send(message, {
    contentType: 'json'
  })
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
  message: ManagedMediaCleanupQueueMessageLike,
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
  batch: ManagedMediaCleanupQueueBatchLike,
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
