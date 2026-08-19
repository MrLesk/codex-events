import type { H3Event } from 'h3'

import { getRequestURL } from 'h3'
import { z } from 'zod'

import { ApiError } from '#server/http/api-error'
import {
  detectSupportedImageContentType,
  supportedImageContentTypes,
  type SupportedImageContentType
} from '#server/utils/image-signatures'
import {
  publicEventCacheControl,
  publicEventCdnCacheControl
} from '#server/domains/events/public-cache'

export const eventImageMaxBytes = 5 * 1024 * 1024

export const eventImageContentTypes = supportedImageContentTypes

export const eventImageSlots = [
  'background',
  'banner'
] as const

export type EventImageSlot = typeof eventImageSlots[number]
type EventImageContentType = SupportedImageContentType

export const privateEventImageCacheControl = 'private, no-store'

export const publicEventImageQuerySchema = z
  .object({
    variant: z.enum(eventImageSlots).optional(),
    v: z.string().trim().min(1).optional()
  })
  .strict()

export const publicEventImageVariants = {
  background: { width: 1600, height: 900, fit: 'cover', quality: 82 },
  banner: { width: 1600, height: 600, fit: 'cover', quality: 82 }
} as const

export type PublicEventImageVariant = keyof typeof publicEventImageVariants
export type PublicEventImageOutputFormat = 'image/avif' | 'image/webp' | 'image/jpeg'

interface R2HttpMetadataLike {
  contentType?: string
}

interface R2ObjectBodyLike {
  arrayBuffer: () => Promise<ArrayBuffer>
  body: ReadableStream<Uint8Array>
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

interface ImagesTransformationLike {
  output: (options: {
    format: PublicEventImageOutputFormat
    quality: number
  }) => Promise<{
    response: () => Response
    contentType: () => string
  }>
}

interface ImagesBindingLike {
  input: (body: ReadableStream<Uint8Array>) => {
    transform: (options: {
      width: number
      height: number
      fit: 'cover'
    }) => ImagesTransformationLike
  }
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

export function platformDefaultEventBackgroundImageObjectKey() {
  return 'platform/default-event-background-image'
}

export function publicEventImagePath(slug: string, slot: EventImageSlot) {
  return `/api/public/events/${encodeURIComponent(slug)}/images/${slot}`
}

export function publicPlatformDefaultEventBackgroundImagePath() {
  return '/api/public/platform/event-default-background-image'
}

function appendPublicImageQuery(
  imageUrl: string,
  version: string,
  variant: PublicEventImageVariant
) {
  const hashIndex = imageUrl.indexOf('#')
  const hash = hashIndex === -1 ? '' : imageUrl.slice(hashIndex)
  const withoutHash = hashIndex === -1 ? imageUrl : imageUrl.slice(0, hashIndex)
  const queryIndex = withoutHash.indexOf('?')
  const base = queryIndex === -1 ? withoutHash : withoutHash.slice(0, queryIndex)
  const query = queryIndex === -1 ? '' : withoutHash.slice(queryIndex + 1)
  const params = new URLSearchParams(query)

  params.set('variant', variant)
  params.set('v', version)

  return `${base}?${params.toString()}${hash}`
}

function isManagedPublicEventImagePath(pathname: string) {
  return (
    /^\/api\/public\/events\/[^/]+\/images\/(background|banner)$/.test(pathname)
    || pathname === publicPlatformDefaultEventBackgroundImagePath()
  )
}

export function getManagedPublicEventImagePath(imageUrl: string) {
  try {
    const pathname = new URL(imageUrl, 'https://codex-events.invalid').pathname
    return isManagedPublicEventImagePath(pathname) ? pathname : null
  } catch {
    return null
  }
}

export function isManagedPublicEventImageUrl(imageUrl: string) {
  return getManagedPublicEventImagePath(imageUrl) !== null
}

export function buildVersionedPublicEventImageUrl(
  imageUrl: string | null | undefined,
  version: string | number | null | undefined,
  variant: PublicEventImageVariant
) {
  const normalizedImageUrl = imageUrl?.trim() ?? ''
  const normalizedVersion = version === null || version === undefined ? '' : String(version).trim()

  if (!normalizedImageUrl || !normalizedVersion || !isManagedPublicEventImageUrl(normalizedImageUrl)) {
    return null
  }

  return appendPublicImageQuery(normalizedImageUrl, normalizedVersion, variant)
}

export function negotiatePublicEventImageFormat(accept: string | null | undefined): PublicEventImageOutputFormat {
  if (!accept?.trim()) {
    return 'image/jpeg'
  }

  const qualityByType = new Map<string, number>()

  for (const item of accept.split(',')) {
    const [mediaType, ...parameters] = item.trim().toLowerCase().split(';')

    if (!mediaType) {
      continue
    }

    const qualityParameter = parameters.find(parameter => parameter.trim().startsWith('q='))
    const quality = qualityParameter ? Number.parseFloat(qualityParameter.trim().slice(2)) : 1

    qualityByType.set(mediaType, Number.isFinite(quality) ? Math.max(0, Math.min(1, quality)) : 0)
  }

  const candidates: PublicEventImageOutputFormat[] = ['image/avif', 'image/webp', 'image/jpeg']
  const selected = candidates
    .map((format, preference) => ({
      format,
      preference,
      quality: qualityByType.get(format) ?? qualityByType.get('image/*') ?? qualityByType.get('*/*') ?? 0
    }))
    .filter(candidate => candidate.quality > 0)
    .sort((left, right) => right.quality - left.quality || left.preference - right.preference)[0]

  return selected?.format ?? 'image/jpeg'
}

function getImagesBinding(event: H3Event): ImagesBindingLike {
  const binding = event.context.cloudflare?.env?.IMAGES

  if (!binding || typeof binding.input !== 'function') {
    throw new ApiError({
      statusCode: 503,
      code: 'images_binding_missing',
      message: 'The Cloudflare Images binding "IMAGES" is not available on this request.'
    })
  }

  return binding as ImagesBindingLike
}

export async function createPublicEventImageResponse(
  event: H3Event,
  image: R2ObjectBodyLike,
  slot: PublicEventImageVariant,
  options: {
    accept?: string | null
  }
) {
  const variant = publicEventImageVariants[slot]
  const transformed = await getImagesBinding(event)
    .input(image.body)
    .transform({
      width: variant.width,
      height: variant.height,
      fit: variant.fit
    })
    .output({
      format: negotiatePublicEventImageFormat(options.accept),
      quality: variant.quality
    })
  const transformedResponse = transformed.response()
  const headers = new Headers(transformedResponse.headers)

  headers.set('cache-control', publicEventCacheControl)
  headers.set('cloudflare-cdn-cache-control', publicEventCdnCacheControl)
  headers.set('content-type', transformed.contentType())
  headers.set('x-content-type-options', 'nosniff')
  headers.set('vary', 'Accept')

  return new Response(transformedResponse.body, {
    status: transformedResponse.status,
    statusText: transformedResponse.statusText,
    headers
  })
}

export function buildPublicEventImageUrl(event: H3Event, slug: string, slot: EventImageSlot) {
  const requestUrl = getRequestURL(event)
  return new URL(publicEventImagePath(slug, slot), requestUrl.origin).toString()
}

export function buildPublicPlatformDefaultEventBackgroundImageUrl(event: H3Event) {
  const requestUrl = getRequestURL(event)
  return new URL(publicPlatformDefaultEventBackgroundImagePath(), requestUrl.origin).toString()
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

export async function getPlatformDefaultEventBackgroundImageObject(event: H3Event) {
  return await getEventImagesBucket(event).get(platformDefaultEventBackgroundImageObjectKey())
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

export async function putPlatformDefaultEventBackgroundImageObject(
  event: H3Event,
  payload: {
    contentType: string
    data: Uint8Array
  }
) {
  const normalizedData = payload.data.constructor === Uint8Array
    ? payload.data
    : new Uint8Array(payload.data)

  await getEventImagesBucket(event).put(
    platformDefaultEventBackgroundImageObjectKey(),
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

export async function deletePlatformDefaultEventBackgroundImageObject(event: H3Event) {
  await getEventImagesBucket(event).delete(platformDefaultEventBackgroundImageObjectKey())
}
