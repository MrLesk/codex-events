import type { H3Event } from 'h3'

import { getRequestURL } from 'h3'

import { ApiError } from './api-error'

export const hackathonImageMaxBytes = 5 * 1024 * 1024

export const hackathonImageContentTypes = [
  'image/jpeg',
  'image/png'
] as const

export const hackathonImageSlots = [
  'background',
  'banner'
] as const

export type HackathonImageSlot = typeof hackathonImageSlots[number]
type HackathonImageContentType = typeof hackathonImageContentTypes[number]

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
  hackathonImages?: {
    binding?: string
  }
}

type CloudflareEnvShape = Record<string, unknown> | undefined
type HackathonImageContextShape = H3Event['context'] & {
  runtimeConfig?: RuntimeConfigShape
  hackathonImagesBucket?: unknown
}

function resolveHackathonImagesBindingName(event: H3Event) {
  const eventRuntimeConfig = (event.context as HackathonImageContextShape).runtimeConfig
  const runtimeConfigGetter = (globalThis as { useRuntimeConfig?: (event: H3Event) => RuntimeConfigShape }).useRuntimeConfig

  return eventRuntimeConfig?.hackathonImages?.binding ?? runtimeConfigGetter?.(event)?.hackathonImages?.binding ?? 'HACKATHON_IMAGES'
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

export function hackathonImageObjectKey(hackathonId: string, slot: HackathonImageSlot) {
  return `hackathons/${hackathonId}/${slot}-image`
}

export function publicHackathonImagePath(slug: string, slot: HackathonImageSlot) {
  return `/api/public/hackathons/${encodeURIComponent(slug)}/images/${slot}`
}

export function buildPublicHackathonImageUrl(event: H3Event, slug: string, slot: HackathonImageSlot) {
  const requestUrl = getRequestURL(event)
  return new URL(publicHackathonImagePath(slug, slot), requestUrl.origin).toString()
}

export function getHackathonImagesBucket(event: H3Event): R2BucketLike {
  const context = event.context as HackathonImageContextShape
  const bindingName = resolveHackathonImagesBindingName(event)
  const cloudflareEnv = event.context.cloudflare?.env as CloudflareEnvShape
  const fallbackBindingName = bindingName === 'HACKATHON_IMAGES' ? undefined : 'HACKATHON_IMAGES'
  const configuredBucketCandidate = cloudflareEnv?.[bindingName]
  const fallbackBucketCandidate = fallbackBindingName ? cloudflareEnv?.[fallbackBindingName] : undefined
  const injectedBucketCandidate = context.hackathonImagesBucket
  const bucketCandidate = configuredBucketCandidate ?? injectedBucketCandidate ?? fallbackBucketCandidate

  if (isR2BucketLike(bucketCandidate)) {
    return bucketCandidate
  }

  throw new ApiError({
    statusCode: 500,
    code: 'hackathon_images_binding_missing',
    message: `The Cloudflare R2 binding "${bindingName}" is not available on this request.`,
    details: {
      binding: bindingName,
      ...(fallbackBindingName ? { fallbackBinding: fallbackBindingName } : {}),
      availableR2Bindings: listAvailableR2BindingNames(cloudflareEnv)
    }
  })
}

export function assertValidHackathonImagePart(part: {
  type?: string
  data?: Uint8Array
}) {
  if (!part.data || part.data.byteLength === 0) {
    throw new ApiError({
      statusCode: 400,
      code: 'hackathon_image_file_required',
      message: 'A hackathon image file is required.'
    })
  }

  const contentType = part.type?.trim().toLowerCase() as HackathonImageContentType | undefined

  if (!contentType || !hackathonImageContentTypes.includes(contentType)) {
    throw new ApiError({
      statusCode: 400,
      code: 'hackathon_image_content_type_invalid',
      message: 'Hackathon images must be JPEG or PNG files.',
      details: {
        allowedContentTypes: hackathonImageContentTypes
      }
    })
  }

  if (part.data.byteLength > hackathonImageMaxBytes) {
    throw new ApiError({
      statusCode: 400,
      code: 'hackathon_image_file_too_large',
      message: 'Hackathon images must be 5MB or smaller.',
      details: {
        maxBytes: hackathonImageMaxBytes,
        receivedBytes: part.data.byteLength
      }
    })
  }

  return {
    contentType,
    data: part.data
  }
}

export async function getHackathonImageObject(event: H3Event, hackathonId: string, slot: HackathonImageSlot) {
  return await getHackathonImagesBucket(event).get(hackathonImageObjectKey(hackathonId, slot))
}

export async function putHackathonImageObject(
  event: H3Event,
  hackathonId: string,
  slot: HackathonImageSlot,
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

  await getHackathonImagesBucket(event).put(
    hackathonImageObjectKey(hackathonId, slot),
    normalizedData,
    {
      httpMetadata: {
        contentType: payload.contentType
      }
    }
  )
}

export async function deleteHackathonImageObject(event: H3Event, hackathonId: string, slot: HackathonImageSlot) {
  await getHackathonImagesBucket(event).delete(hackathonImageObjectKey(hackathonId, slot))
}
