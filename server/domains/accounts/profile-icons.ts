import type { H3Event } from 'h3'

import { ApiError } from '#server/http/api-error'
import {
  detectSupportedImageContentType,
  supportedImageContentTypes,
  type SupportedImageContentType
} from '#server/utils/image-signatures'

export const profileIconMaxBytes = 1024 * 1024

export const profileIconContentTypes = supportedImageContentTypes

type ProfileIconContentType = SupportedImageContentType

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
  profileIcons?: {
    binding?: string
  }
}

type CloudflareEnvShape = Record<string, unknown> | undefined
type ProfileIconContextShape = H3Event['context'] & {
  runtimeConfig?: RuntimeConfigShape
  profileIconsBucket?: unknown
}

function resolveProfileIconsBindingName(event: H3Event) {
  const eventRuntimeConfig = (event.context as ProfileIconContextShape).runtimeConfig
  const runtimeConfigGetter = (globalThis as { useRuntimeConfig?: (event: H3Event) => RuntimeConfigShape }).useRuntimeConfig

  return eventRuntimeConfig?.profileIcons?.binding ?? runtimeConfigGetter?.(event)?.profileIcons?.binding ?? 'PROFILE_ICONS'
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

export function profileIconObjectKey(userId: string) {
  return `users/${userId}/profile-icon`
}

export function getProfileIconsBucket(event: H3Event): R2BucketLike {
  const context = event.context as ProfileIconContextShape
  const bindingName = resolveProfileIconsBindingName(event)
  const cloudflareEnv = event.context.cloudflare?.env as CloudflareEnvShape
  const fallbackBindingName = bindingName === 'PROFILE_ICONS' ? undefined : 'PROFILE_ICONS'
  const configuredBucketCandidate = cloudflareEnv?.[bindingName]
  const fallbackBucketCandidate = fallbackBindingName ? cloudflareEnv?.[fallbackBindingName] : undefined
  const injectedBucketCandidate = context.profileIconsBucket
  const bucketCandidate = configuredBucketCandidate ?? injectedBucketCandidate ?? fallbackBucketCandidate

  if (isR2BucketLike(bucketCandidate)) {
    return bucketCandidate
  }

  throw new ApiError({
    statusCode: 500,
    code: 'profile_icons_binding_missing',
    message: `The Cloudflare R2 binding "${bindingName}" is not available on this request.`,
    details: {
      binding: bindingName,
      ...(fallbackBindingName ? { fallbackBinding: fallbackBindingName } : {}),
      availableR2Bindings: listAvailableR2BindingNames(cloudflareEnv)
    }
  })
}

export function assertValidProfileIconPart(part: {
  type?: string
  data?: Uint8Array
}) {
  if (!part.data || part.data.byteLength === 0) {
    throw new ApiError({
      statusCode: 400,
      code: 'profile_icon_file_required',
      message: 'A profile icon file is required.'
    })
  }

  const contentType = detectSupportedImageContentType(part.data)

  if (!contentType) {
    throw new ApiError({
      statusCode: 400,
      code: 'profile_icon_content_type_invalid',
      message: 'Profile icons must be JPEG or PNG images.',
      details: {
        allowedContentTypes: profileIconContentTypes
      }
    })
  }

  if (part.data.byteLength > profileIconMaxBytes) {
    throw new ApiError({
      statusCode: 400,
      code: 'profile_icon_file_too_large',
      message: 'Profile icons must be 1MB or smaller.',
      details: {
        maxBytes: profileIconMaxBytes,
        receivedBytes: part.data.byteLength
      }
    })
  }

  return {
    contentType: contentType as ProfileIconContentType,
    data: part.data
  }
}

export async function getProfileIconObject(event: H3Event, userId: string) {
  return await getProfileIconsBucket(event).get(profileIconObjectKey(userId))
}

export async function putProfileIconObject(
  event: H3Event,
  userId: string,
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

  await getProfileIconsBucket(event).put(
    profileIconObjectKey(userId),
    normalizedData,
    {
      httpMetadata: {
        contentType: payload.contentType
      }
    }
  )
}

export async function deleteProfileIconObject(event: H3Event, userId: string) {
  await getProfileIconsBucket(event).delete(profileIconObjectKey(userId))
}
