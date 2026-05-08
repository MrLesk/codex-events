import type { D1DatabaseBinding } from '#server/database/client'

import { ApiError } from '#server/http/api-error'
import {
  authenticatedUploadRateLimitBindingName,
  publicContactRateLimitBindingName,
  publicEventFeedbackRateLimitBindingName
} from '#server/utils/rate-limit'
import { createLocalPlatformProxy } from '#server/database/local-platform-proxy'
import { defaultOutboundEmailBinding } from '#server/utils/outbound-email'

const localPlatformProxyCache = new Map<'local', Promise<Awaited<ReturnType<typeof createLocalPlatformProxy>>>>()

interface R2BucketLike {
  get: (key: string) => Promise<unknown>
  put: (key: string, value: ArrayBuffer | ArrayBufferView, options?: unknown) => Promise<unknown>
  delete: (key: string) => Promise<void>
}

interface QueueProducerLike {
  send: (message: unknown, options?: unknown) => Promise<void>
}

interface OutboundEmailBindingLike {
  send: (message: unknown) => Promise<unknown>
}

interface RateLimitBindingLike {
  limit: (options: {
    key: string
  }) => Promise<{
    success: boolean
  }>
}

interface ImagesBindingLike {
  info: (stream: ReadableStream<Uint8Array>, options?: unknown) => Promise<unknown>
  input: (stream: ReadableStream<Uint8Array>, options?: unknown) => {
    transform: (options: unknown) => {
      output: (options: unknown) => Promise<unknown>
    }
  }
}

function isR2BucketLike(value: unknown): value is R2BucketLike {
  if (!value || typeof value !== 'object') {
    return false
  }

  const candidate = value as Partial<R2BucketLike>
  return typeof candidate.get === 'function'
    && typeof candidate.put === 'function'
    && typeof candidate.delete === 'function'
}

function isQueueProducerLike(value: unknown): value is QueueProducerLike {
  if (!value || typeof value !== 'object') {
    return false
  }

  const candidate = value as Partial<QueueProducerLike>
  return typeof candidate.send === 'function'
}

function isOutboundEmailBindingLike(value: unknown): value is OutboundEmailBindingLike {
  if (!value || typeof value !== 'object') {
    return false
  }

  const candidate = value as Partial<OutboundEmailBindingLike>
  return typeof candidate.send === 'function'
}

function isRateLimitBindingLike(value: unknown): value is RateLimitBindingLike {
  if (!value || typeof value !== 'object') {
    return false
  }

  const candidate = value as Partial<RateLimitBindingLike>
  return typeof candidate.limit === 'function'
}

function isImagesBindingLike(value: unknown): value is ImagesBindingLike {
  if (!value || typeof value !== 'object') {
    return false
  }

  const candidate = value as Partial<ImagesBindingLike>
  return typeof candidate.info === 'function' && typeof candidate.input === 'function'
}

function shouldUseLocalPlatformProxy() {
  return import.meta.dev
    || process.env.NODE_ENV === 'test'
    || Boolean(process.env.VITEST)
}

export default defineEventHandler(async (event) => {
  const runtimeConfig = useRuntimeConfig(event)
  const databaseBindingName = runtimeConfig.database?.binding ?? 'DB'
  const profileIconsBindingName = runtimeConfig.profileIcons?.binding ?? 'PROFILE_ICONS'
  const eventImagesBindingName = runtimeConfig.eventImages?.binding ?? 'EVENT_IMAGES'
  const imagesBindingName = 'IMAGES'
  const outboundEmailBindingName = runtimeConfig.outboundEmail?.binding ?? defaultOutboundEmailBinding
  const applicationReviewEmailQueueBindingName = runtimeConfig.applicationReviewEmails?.queueBinding ?? 'APPLICATION_REVIEW_EMAIL_QUEUE'
  const eventOutcomeEmailQueueBindingName = runtimeConfig.eventOutcomeEmails?.queueBinding ?? 'EVENT_OUTCOME_EMAIL_QUEUE'
  const applicationLumaSyncQueueBindingName = runtimeConfig.luma?.queueBinding ?? 'APPLICATION_LUMA_SYNC_QUEUE'
  const cloudflareEnv = event.context.cloudflare?.env as Record<string, unknown> | undefined

  const hasDatabaseBinding = Boolean(event.context.d1Database || cloudflareEnv?.[databaseBindingName])
  // The local Wrangler platform proxy is only valid for Bun/Vitest execution in this
  // repository. Deployed Workers requests must never try to load the `wrangler` package.
  if (hasDatabaseBinding || !shouldUseLocalPlatformProxy()) {
    return
  }

  let proxyPromise = localPlatformProxyCache.get('local')

  if (!proxyPromise) {
    proxyPromise = createLocalPlatformProxy()
    localPlatformProxyCache.set('local', proxyPromise)
    proxyPromise.catch(() => localPlatformProxyCache.delete('local'))
  }

  const proxy = await proxyPromise
  const proxyEnv = proxy.env as Record<string, unknown>
  const d1Database = (cloudflareEnv?.[databaseBindingName] ?? proxyEnv[databaseBindingName]) as D1DatabaseBinding | undefined
  const existingProfileIconsBucket = cloudflareEnv?.[profileIconsBindingName]
  const proxyProfileIconsBucket = proxyEnv[profileIconsBindingName]
    ?? (profileIconsBindingName === 'PROFILE_ICONS' ? undefined : proxyEnv.PROFILE_ICONS)
  const profileIconsBucket = existingProfileIconsBucket ?? proxyProfileIconsBucket
  const existingEventImagesBucket = cloudflareEnv?.[eventImagesBindingName]
  const proxyEventImagesBucket = proxyEnv[eventImagesBindingName]
    ?? (eventImagesBindingName === 'EVENT_IMAGES' ? undefined : proxyEnv.EVENT_IMAGES)
  const eventImagesBucket = existingEventImagesBucket ?? proxyEventImagesBucket
  const existingImagesBinding = cloudflareEnv?.[imagesBindingName]
  const imagesBinding = existingImagesBinding ?? proxyEnv[imagesBindingName]
  const existingOutboundEmailBinding = cloudflareEnv?.[outboundEmailBindingName]
  const proxyOutboundEmailBinding = proxyEnv[outboundEmailBindingName]
    ?? (outboundEmailBindingName === defaultOutboundEmailBinding ? undefined : proxyEnv[defaultOutboundEmailBinding])
  const outboundEmailBinding = existingOutboundEmailBinding ?? proxyOutboundEmailBinding
  const existingApplicationReviewEmailQueue = cloudflareEnv?.[applicationReviewEmailQueueBindingName]
  const proxyApplicationReviewEmailQueue = proxyEnv[applicationReviewEmailQueueBindingName]
    ?? (applicationReviewEmailQueueBindingName === 'APPLICATION_REVIEW_EMAIL_QUEUE'
      ? undefined
      : proxyEnv.APPLICATION_REVIEW_EMAIL_QUEUE)
  const applicationReviewEmailQueue = existingApplicationReviewEmailQueue ?? proxyApplicationReviewEmailQueue
  const existingEventOutcomeEmailQueue = cloudflareEnv?.[eventOutcomeEmailQueueBindingName]
  const proxyEventOutcomeEmailQueue = proxyEnv[eventOutcomeEmailQueueBindingName]
    ?? (eventOutcomeEmailQueueBindingName === 'EVENT_OUTCOME_EMAIL_QUEUE'
      ? undefined
      : proxyEnv.EVENT_OUTCOME_EMAIL_QUEUE)
  const eventOutcomeEmailQueue = existingEventOutcomeEmailQueue ?? proxyEventOutcomeEmailQueue
  const existingApplicationLumaSyncQueue = cloudflareEnv?.[applicationLumaSyncQueueBindingName]
  const proxyApplicationLumaSyncQueue = proxyEnv[applicationLumaSyncQueueBindingName]
    ?? (applicationLumaSyncQueueBindingName === 'APPLICATION_LUMA_SYNC_QUEUE'
      ? undefined
      : proxyEnv.APPLICATION_LUMA_SYNC_QUEUE)
  const applicationLumaSyncQueue = existingApplicationLumaSyncQueue ?? proxyApplicationLumaSyncQueue
  const existingPublicContactRateLimiter = cloudflareEnv?.[publicContactRateLimitBindingName]
  const publicContactRateLimiter = existingPublicContactRateLimiter ?? proxyEnv[publicContactRateLimitBindingName]
  const existingPublicEventFeedbackRateLimiter = cloudflareEnv?.[publicEventFeedbackRateLimitBindingName]
  const publicEventFeedbackRateLimiter = existingPublicEventFeedbackRateLimiter
    ?? proxyEnv[publicEventFeedbackRateLimitBindingName]
  const existingAuthenticatedUploadRateLimiter = cloudflareEnv?.[authenticatedUploadRateLimitBindingName]
  const authenticatedUploadRateLimiter = existingAuthenticatedUploadRateLimiter ?? proxyEnv[authenticatedUploadRateLimitBindingName]

  if (!d1Database) {
    throw new ApiError({
      statusCode: 500,
      code: 'database_binding_missing',
      message: `The local Cloudflare D1 binding "${databaseBindingName}" could not be resolved from wrangler.jsonc.`,
      details: { binding: databaseBindingName }
    })
  }

  event.context.cloudflare ??= {} as never
  event.context.cloudflare.env ??= {} as never

  if (!event.context.cloudflare.env[databaseBindingName]) {
    event.context.cloudflare.env[databaseBindingName] = d1Database as never
  }

  if (!event.context.cloudflare.env[profileIconsBindingName] && isR2BucketLike(profileIconsBucket)) {
    event.context.cloudflare.env[profileIconsBindingName] = profileIconsBucket as never
  }

  if (!event.context.cloudflare.env[eventImagesBindingName] && isR2BucketLike(eventImagesBucket)) {
    event.context.cloudflare.env[eventImagesBindingName] = eventImagesBucket as never
  }

  if (!event.context.cloudflare.env[imagesBindingName] && isImagesBindingLike(imagesBinding)) {
    event.context.cloudflare.env[imagesBindingName] = imagesBinding as never
  }

  if (!event.context.cloudflare.env[outboundEmailBindingName] && isOutboundEmailBindingLike(outboundEmailBinding)) {
    event.context.cloudflare.env[outboundEmailBindingName] = outboundEmailBinding as never
  }

  if (!event.context.cloudflare.env[applicationReviewEmailQueueBindingName] && isQueueProducerLike(applicationReviewEmailQueue)) {
    event.context.cloudflare.env[applicationReviewEmailQueueBindingName] = applicationReviewEmailQueue as never
  }

  if (!event.context.cloudflare.env[eventOutcomeEmailQueueBindingName] && isQueueProducerLike(eventOutcomeEmailQueue)) {
    event.context.cloudflare.env[eventOutcomeEmailQueueBindingName] = eventOutcomeEmailQueue as never
  }

  if (!event.context.cloudflare.env[applicationLumaSyncQueueBindingName] && isQueueProducerLike(applicationLumaSyncQueue)) {
    event.context.cloudflare.env[applicationLumaSyncQueueBindingName] = applicationLumaSyncQueue as never
  }

  if (!event.context.cloudflare.env[publicContactRateLimitBindingName] && isRateLimitBindingLike(publicContactRateLimiter)) {
    event.context.cloudflare.env[publicContactRateLimitBindingName] = publicContactRateLimiter as never
  }

  if (
    !event.context.cloudflare.env[publicEventFeedbackRateLimitBindingName]
    && isRateLimitBindingLike(publicEventFeedbackRateLimiter)
  ) {
    event.context.cloudflare.env[publicEventFeedbackRateLimitBindingName] = publicEventFeedbackRateLimiter as never
  }

  if (
    !event.context.cloudflare.env[authenticatedUploadRateLimitBindingName]
    && isRateLimitBindingLike(authenticatedUploadRateLimiter)
  ) {
    event.context.cloudflare.env[authenticatedUploadRateLimitBindingName] = authenticatedUploadRateLimiter as never
  }

  const profileIconContext = event.context as typeof event.context & { profileIconsBucket?: R2BucketLike }
  profileIconContext.profileIconsBucket = isR2BucketLike(profileIconsBucket)
    ? profileIconsBucket
    : undefined
  const eventImageContext = event.context as typeof event.context & { eventImagesBucket?: R2BucketLike }
  eventImageContext.eventImagesBucket = isR2BucketLike(eventImagesBucket)
    ? eventImagesBucket
    : undefined
  event.context.d1Database = d1Database as D1DatabaseBinding as never
})
