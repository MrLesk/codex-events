import type { H3Event } from 'h3'

import { getRequestHeader, getRequestIP, setHeader } from 'h3'

import { ApiError } from '#server/http/api-error'

export const publicContactRateLimitBindingName = 'PUBLIC_CONTACT_RATE_LIMITER'
export const authenticatedUploadRateLimitBindingName = 'AUTHENTICATED_UPLOAD_RATE_LIMITER'
export const publicHackathonFeedbackRateLimitBindingName = 'PUBLIC_HACKATHON_FEEDBACK_RATE_LIMITER'
export const publicContactRateLimitPeriodSeconds = 60
export const authenticatedUploadRateLimitPeriodSeconds = 60
export const publicHackathonFeedbackRateLimitPeriodSeconds = 60

interface RateLimitBindingLike {
  limit: (options: {
    key: string
  }) => Promise<{
    success: boolean
  }>
}

type CloudflareEnvShape = Record<string, unknown> | undefined

function isRateLimitBindingLike(value: unknown): value is RateLimitBindingLike {
  if (!value || typeof value !== 'object') {
    return false
  }

  const candidate = value as Partial<RateLimitBindingLike>
  return typeof candidate.limit === 'function'
}

function listAvailableRateLimitBindingNames(cloudflareEnv: CloudflareEnvShape) {
  if (!cloudflareEnv) {
    return []
  }

  return Object.entries(cloudflareEnv)
    .filter(([, value]) => isRateLimitBindingLike(value))
    .map(([key]) => key)
    .sort()
}

function getRateLimitBinding(event: H3Event, bindingName: string) {
  const cloudflareEnv = event.context.cloudflare?.env as CloudflareEnvShape
  const binding = cloudflareEnv?.[bindingName]

  if (isRateLimitBindingLike(binding)) {
    return binding
  }

  throw new ApiError({
    statusCode: 500,
    code: 'rate_limit_binding_missing',
    message: `The Cloudflare rate limit binding "${bindingName}" is not available on this request.`,
    details: {
      binding: bindingName,
      availableRateLimitBindings: listAvailableRateLimitBindingNames(cloudflareEnv)
    }
  })
}

function getRequestRateLimitIpKey(event: H3Event) {
  const cloudflareIp = getRequestHeader(event, 'cf-connecting-ip')?.trim()

  if (cloudflareIp) {
    return cloudflareIp
  }

  return getRequestIP(event, {
    xForwardedFor: true
  }) || 'unknown'
}

async function assertRateLimitAllowed(event: H3Event, options: {
  bindingName: string
  key: string
  retryAfterSeconds: number
  errorCode: string
  message: string
}) {
  const outcome = await getRateLimitBinding(event, options.bindingName).limit({
    key: options.key
  })

  if (outcome.success) {
    return
  }

  setHeader(event, 'retry-after', options.retryAfterSeconds)

  throw new ApiError({
    statusCode: 429,
    code: options.errorCode,
    message: options.message
  })
}

export async function assertPublicContactRateLimit(event: H3Event) {
  await assertRateLimitAllowed(event, {
    bindingName: publicContactRateLimitBindingName,
    key: `public-contact:${getRequestRateLimitIpKey(event)}`,
    retryAfterSeconds: publicContactRateLimitPeriodSeconds,
    errorCode: 'support_contact_rate_limited',
    message: 'Too many contact requests were submitted. Please try again shortly.'
  })
}

export async function assertAuthenticatedUploadRateLimit(event: H3Event, key: string) {
  await assertRateLimitAllowed(event, {
    bindingName: authenticatedUploadRateLimitBindingName,
    key,
    retryAfterSeconds: authenticatedUploadRateLimitPeriodSeconds,
    errorCode: 'upload_rate_limited',
    message: 'Too many uploads were submitted. Please wait before trying again.'
  })
}

export async function assertPublicHackathonFeedbackRateLimit(event: H3Event, key: string) {
  await assertRateLimitAllowed(event, {
    bindingName: publicHackathonFeedbackRateLimitBindingName,
    key,
    retryAfterSeconds: publicHackathonFeedbackRateLimitPeriodSeconds,
    errorCode: 'hackathon_feedback_rate_limited',
    message: 'Too many feedback submissions were sent. Please wait before trying again.'
  })
}
