import type { H3Event } from 'h3'

import { getRequestURL } from 'h3'

import { ApiError } from '#server/http/api-error'
import {
  detectSupportedImageContentType,
  supportedImageContentTypes,
  type SupportedImageContentType
} from '#server/utils/image-signatures'

export const eventImageMaxBytes = 5 * 1024 * 1024

export const eventImageContentTypes = supportedImageContentTypes

export const eventImageSlots = [
  'background',
  'banner'
] as const

export type EventImageSlot = typeof eventImageSlots[number]
type EventImageContentType = SupportedImageContentType

interface R2HttpMetadataLike {
  contentType?: string
}

interface R2ObjectBodyLike {
  arrayBuffer: () => Promise<ArrayBuffer>
  httpMetadata?: R2HttpMetadataLike | null
}

interface R2PutOptionsLike {
  httpMetadata?: R2HttpMetadataLike
}

interface R2BucketLike {
  get: (key: string) => Promise<R2ObjectBodyLike | null>
  put: (key: string, value: ArrayBuffer | ArrayBufferView, options?: R2PutOptionsLike) => Promise<unknown>
  delete: (key: string) => Promise<void>
}

type RuntimeConfigShape = {
  eventImages?: {
    binding?: string
  }
}

type CloudflareEnvShape = Record<string, unknown> | undefined
type EventImageContextShape = H3Event['context'] & {
  runtimeConfig?: RuntimeConfigShape
  eventImagesBucket?: unknown
}

function resolveEventImagesBindingName(event: H3Event) {
  const eventRuntimeConfig = (event.context as EventImageContextShape).runtimeConfig
  const runtimeConfigGetter = (globalThis as { useRuntimeConfig?: (event: H3Event) => RuntimeConfigShape }).useRuntimeConfig

  return eventRuntimeConfig?.eventImages?.binding ?? runtimeConfigGetter?.(event)?.eventImages?.binding ?? 'EVENT_IMAGES'
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

function listAvailableR2BindingNames(cloudflareEnv: CloudflareEnvShape) {
  if (!cloudflareEnv) {
    return []
  }

  return Object.entries(cloudflareEnv)
    .filter(([, value]) => isR2BucketLike(value))
    .map(([key]) => key)
    .sort()
}

export function eventImageObjectKey(eventId: string, slot: EventImageSlot) {
  return `events/${eventId}/${slot}-image`
}

export function publicEventImagePath(slug: string, slot: EventImageSlot) {
  return `/api/public/events/${encodeURIComponent(slug)}/images/${slot}`
}

export function buildPublicEventImageUrl(event: H3Event, slug: string, slot: EventImageSlot) {
  const requestUrl = getRequestURL(event)
  return new URL(publicEventImagePath(slug, slot), requestUrl.origin).toString()
}

export function getEventImagesBucket(event: H3Event): R2BucketLike {
  const context = event.context as EventImageContextShape
  const bindingName = resolveEventImagesBindingName(event)
  const cloudflareEnv = event.context.cloudflare?.env as CloudflareEnvShape
  const fallbackBindingName = bindingName === 'EVENT_IMAGES' ? undefined : 'EVENT_IMAGES'
  const configuredBucketCandidate = cloudflareEnv?.[bindingName]
  const fallbackBucketCandidate = fallbackBindingName ? cloudflareEnv?.[fallbackBindingName] : undefined
  const injectedBucketCandidate = context.eventImagesBucket
  const bucketCandidate = configuredBucketCandidate ?? injectedBucketCandidate ?? fallbackBucketCandidate

  if (isR2BucketLike(bucketCandidate)) {
    return bucketCandidate
  }

  throw new ApiError({
    statusCode: 500,
    code: 'event_images_binding_missing',
    message: `The Cloudflare R2 binding "${bindingName}" is not available on this request.`,
    details: {
      binding: bindingName,
      ...(fallbackBindingName ? { fallbackBinding: fallbackBindingName } : {}),
      availableR2Bindings: listAvailableR2BindingNames(cloudflareEnv)
    }
  })
}

export function assertValidEventImagePart(part: {
  type?: string
  data?: Uint8Array
}) {
  if (!part.data || part.data.byteLength === 0) {
    throw new ApiError({
      statusCode: 400,
      code: 'event_image_file_required',
      message: 'An event image file is required.'
    })
  }

  const contentType = detectSupportedImageContentType(part.data)

  if (!contentType) {
    throw new ApiError({
      statusCode: 400,
      code: 'event_image_content_type_invalid',
      message: 'Event images must be JPEG or PNG files.',
      details: {
        allowedContentTypes: eventImageContentTypes
      }
    })
  }

  if (part.data.byteLength > eventImageMaxBytes) {
    throw new ApiError({
      statusCode: 400,
      code: 'event_image_file_too_large',
      message: 'Event images must be 5MB or smaller.',
      details: {
        maxBytes: eventImageMaxBytes,
        receivedBytes: part.data.byteLength
      }
    })
  }

  return {
    contentType: contentType as EventImageContentType,
    data: part.data
  }
}

export async function getEventImageObject(event: H3Event, eventId: string, slot: EventImageSlot) {
  return await getEventImagesBucket(event).get(eventImageObjectKey(eventId, slot))
}

export async function putEventImageObject(
  event: H3Event,
  eventId: string,
  slot: EventImageSlot,
  payload: {
    contentType: string
    data: Uint8Array
  }
) {
  // Wrangler's local R2 proxy can throw internal assertions when given a Node Buffer.
  // Normalize to a plain Uint8Array for consistent behavior across runtimes.
  const normalizedData = payload.data.constructor === Uint8Array
    ? payload.data
    : new Uint8Array(payload.data)

  await getEventImagesBucket(event).put(
    eventImageObjectKey(eventId, slot),
    normalizedData,
    {
      httpMetadata: {
        contentType: payload.contentType
      }
    }
  )
}

export async function deleteEventImageObject(event: H3Event, eventId: string, slot: EventImageSlot) {
  await getEventImagesBucket(event).delete(eventImageObjectKey(eventId, slot))
}
