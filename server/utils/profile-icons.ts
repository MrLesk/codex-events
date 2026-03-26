import type { H3Event } from 'h3'

import { ApiError } from './api-error'

export const profileIconMaxBytes = 1024 * 1024

export const profileIconContentTypes = [
  'image/jpeg',
  'image/png',
  'image/webp'
] as const

type ProfileIconContentType = typeof profileIconContentTypes[number]

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

function resolveProfileIconsBindingName(event: H3Event) {
  const eventRuntimeConfig = (event.context as H3Event['context'] & { runtimeConfig?: RuntimeConfigShape }).runtimeConfig
  const runtimeConfigGetter = (globalThis as { useRuntimeConfig?: (event: H3Event) => RuntimeConfigShape }).useRuntimeConfig

  return eventRuntimeConfig?.profileIcons?.binding ?? runtimeConfigGetter?.(event)?.profileIcons?.binding ?? 'PROFILE_ICONS'
}

export function profileIconObjectKey(userId: string) {
  return `users/${userId}/profile-icon`
}

export function getProfileIconsBucket(event: H3Event): R2BucketLike {
  const bindingName = resolveProfileIconsBindingName(event)
  const bucket = event.context.cloudflare?.env?.[bindingName] as R2BucketLike | undefined

  if (!bucket) {
    throw new ApiError({
      statusCode: 500,
      code: 'profile_icons_binding_missing',
      message: `The Cloudflare R2 binding "${bindingName}" is not available on this request.`,
      details: {
        binding: bindingName
      }
    })
  }

  return bucket
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

  const contentType = part.type?.trim().toLowerCase() as ProfileIconContentType | undefined

  if (!contentType || !profileIconContentTypes.includes(contentType)) {
    throw new ApiError({
      statusCode: 400,
      code: 'profile_icon_content_type_invalid',
      message: 'Profile icons must be JPEG, PNG, or WebP images.',
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
    contentType,
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
  await getProfileIconsBucket(event).put(
    profileIconObjectKey(userId),
    payload.data,
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
