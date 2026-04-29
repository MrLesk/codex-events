import type { H3Event } from 'h3'

import { and, asc, eq, getTableColumns } from 'drizzle-orm'
import { z } from 'zod'

import type { HackathonPhotoImageVariant, HackathonPhotoRecord } from '#shared/hackathon-photos'

import { requirePlatformActor } from '#server/auth/actor'
import { resolveHackathonAuthorization } from '#server/auth/authorization'
import { getDatabase, type AppDatabase } from '#server/database/client'
import { hackathonPhotos, userApplications, users } from '#server/database/schema'
import { ApiError } from '#server/http/api-error'
import { getHackathonImagesBucket } from './hackathon-images'
import {
  getHackathonOrThrow,
  routeIdParamsSchema
} from '#server/domains/hackathons'
import {
  detectSupportedImageContentType,
  supportedImageContentTypes,
  type SupportedImageContentType
} from './image-signatures'
import { assertGuard } from '#server/domains/hackathons/lifecycle-guard'

export const hackathonPhotoMaxBytes = 10 * 1024 * 1024
export const hackathonPhotoContentTypes = supportedImageContentTypes

export const hackathonPhotoParamsSchema = routeIdParamsSchema.extend({
  photoId: z.string().trim().min(1)
})

export const hackathonPhotoImageQuerySchema = z.object({
  variant: z.enum(['preview', 'original']).default('original'),
  v: z.string().trim().min(1).optional()
})

export const updateHackathonPhotoPublicVisibilityBodySchema = z.object({
  isPubliclyVisible: z.coerce.boolean()
})

const publicHackathonPhotoPreviewTransformOptions = 'width=720,height=720,fit=scale-down,format=webp,quality=82'

type RuntimeConfigShape = {
  hackathonImages?: {
    publicCdnBaseUrl?: string
  }
}

type HackathonPhotoContextShape = H3Event['context'] & {
  runtimeConfig?: RuntimeConfigShape
}

interface ImagesInfoResultLike {
  width: number
  height: number
}

interface ImagesBindingLike {
  info: (
    stream: ReadableStream<Uint8Array>,
    options?: { encoding?: 'base64' }
  ) => Promise<ImagesInfoResultLike>
  input: (
    stream: ReadableStream<Uint8Array>,
    options?: { encoding?: 'base64' }
  ) => {
    transform: (options: {
      width?: number
      height?: number
      fit?: 'scale-down' | 'contain' | 'pad' | 'squeeze' | 'cover' | 'crop'
    }) => {
      output: (options: {
        format: 'image/webp' | 'image/jpeg' | 'image/png'
        quality?: number
      }) => Promise<{
        response: () => Response
        contentType: () => string
      }>
    }
  }
}

function isImagesBindingLike(value: unknown): value is ImagesBindingLike {
  if (!value || typeof value !== 'object') {
    return false
  }

  const candidate = value as Partial<ImagesBindingLike>
  return typeof candidate.info === 'function' && typeof candidate.input === 'function'
}

function getImagesBinding(event: H3Event) {
  const candidate = event.context.cloudflare?.env?.IMAGES

  if (isImagesBindingLike(candidate)) {
    return candidate
  }

  throw new ApiError({
    statusCode: 500,
    code: 'images_binding_missing',
    message: 'The Cloudflare Images binding "IMAGES" is not available on this request.'
  })
}

function createImageStream(data: Uint8Array) {
  return new ReadableStream<Uint8Array>({
    start(controller) {
      controller.enqueue(data)
      controller.close()
    }
  })
}

export function hackathonPhotoObjectKey(hackathonId: string, photoId: string) {
  return `hackathons/${hackathonId}/photos/${photoId}`
}

function hackathonPhotoObjectPath(hackathonId: string, photoId: string) {
  return `/${hackathonPhotoObjectKey(
    encodeURIComponent(hackathonId),
    encodeURIComponent(photoId)
  )}`
}

function resolveHackathonImagesPublicCdnBaseUrl(event: H3Event) {
  const eventRuntimeConfig = (event.context as HackathonPhotoContextShape).runtimeConfig
  const runtimeConfigGetter = (globalThis as { useRuntimeConfig?: (event: H3Event) => RuntimeConfigShape }).useRuntimeConfig
  const configuredBaseUrl = eventRuntimeConfig?.hackathonImages?.publicCdnBaseUrl
    ?? runtimeConfigGetter?.(event)?.hackathonImages?.publicCdnBaseUrl

  return configuredBaseUrl?.trim() ?? ''
}

export function buildHackathonPhotoImageUrl(
  hackathonId: string,
  photoId: string,
  variant: HackathonPhotoImageVariant,
  version: string
) {
  const params = new URLSearchParams({
    variant,
    v: version
  })

  return `/api/hackathons/${encodeURIComponent(hackathonId)}/photos/${encodeURIComponent(photoId)}/image?${params.toString()}`
}

export function buildPublicHackathonPhotoImageUrl(
  event: H3Event,
  hackathonId: string,
  slug: string,
  photoId: string,
  variant: HackathonPhotoImageVariant,
  version: string
) {
  const publicCdnBaseUrl = resolveHackathonImagesPublicCdnBaseUrl(event)

  if (publicCdnBaseUrl) {
    const objectPath = hackathonPhotoObjectPath(hackathonId, photoId)

    if (variant === 'preview') {
      return new URL(
        `/cdn-cgi/image/${publicHackathonPhotoPreviewTransformOptions}${objectPath}`,
        publicCdnBaseUrl
      ).toString()
    }

    return new URL(objectPath, publicCdnBaseUrl).toString()
  }

  const params = new URLSearchParams({
    variant,
    v: version
  })

  return `/api/public/hackathons/${encodeURIComponent(slug)}/photos/${encodeURIComponent(photoId)}/image?${params.toString()}`
}

export function assertValidHackathonPhotoPart(part: {
  type?: string
  data?: Uint8Array
  filename?: string
}) {
  if (!part.data || part.data.byteLength === 0) {
    throw new ApiError({
      statusCode: 400,
      code: 'hackathon_photo_file_required',
      message: 'At least one hackathon photo file is required.'
    })
  }

  const contentType = detectSupportedImageContentType(part.data)

  if (!contentType) {
    throw new ApiError({
      statusCode: 400,
      code: 'hackathon_photo_content_type_invalid',
      message: 'Hackathon photos must be JPEG or PNG files.',
      details: {
        allowedContentTypes: hackathonPhotoContentTypes
      }
    })
  }

  if (part.data.byteLength > hackathonPhotoMaxBytes) {
    throw new ApiError({
      statusCode: 400,
      code: 'hackathon_photo_file_too_large',
      message: 'Hackathon photos must be 10MB or smaller.',
      details: {
        maxBytes: hackathonPhotoMaxBytes,
        receivedBytes: part.data.byteLength
      }
    })
  }

  return {
    contentType,
    data: part.data,
    fileName: normalizeOptionalFileName(part.filename)
  }
}

function normalizeOptionalFileName(value: string | null | undefined) {
  const normalizedValue = value?.trim() ?? ''
  return normalizedValue.length > 0 ? normalizedValue : null
}

export async function getHackathonPhotoDimensions(event: H3Event, data: Uint8Array) {
  const metadata = await getImagesBinding(event).info(createImageStream(data))

  assertGuard(
    (Number.isInteger(metadata.width) && metadata.width > 0)
    && (Number.isInteger(metadata.height) && metadata.height > 0),
    {
      statusCode: 400,
      code: 'hackathon_photo_dimensions_invalid',
      message: 'The uploaded photo dimensions could not be determined.'
    }
  )

  return {
    width: metadata.width,
    height: metadata.height
  }
}

export async function putHackathonPhotoObject(
  event: H3Event,
  hackathonId: string,
  photoId: string,
  payload: {
    contentType: SupportedImageContentType
    data: Uint8Array
  }
) {
  const normalizedData = payload.data.constructor === Uint8Array
    ? payload.data
    : new Uint8Array(payload.data)

  await getHackathonImagesBucket(event).put(
    hackathonPhotoObjectKey(hackathonId, photoId),
    normalizedData,
    {
      httpMetadata: {
        contentType: payload.contentType
      }
    }
  )
}

export async function getHackathonPhotoObject(
  event: H3Event,
  hackathonId: string,
  photoId: string
) {
  return await getHackathonImagesBucket(event).get(hackathonPhotoObjectKey(hackathonId, photoId))
}

export async function deleteHackathonPhotoObject(
  event: H3Event,
  hackathonId: string,
  photoId: string
) {
  await getHackathonImagesBucket(event).delete(hackathonPhotoObjectKey(hackathonId, photoId))
}

export async function getHackathonPhotoRecordOrThrow(
  database: AppDatabase,
  hackathonId: string,
  photoId: string
) {
  const photo = await database.query.hackathonPhotos.findFirst({
    where: and(
      eq(hackathonPhotos.hackathonId, hackathonId),
      eq(hackathonPhotos.id, photoId)
    )
  })

  if (!photo) {
    throw new ApiError({
      statusCode: 404,
      code: 'hackathon_photo_not_found',
      message: 'The requested hackathon photo was not found.',
      details: {
        hackathonId,
        photoId
      }
    })
  }

  return photo
}

export async function getPublicHackathonPhotoRecordOrThrow(
  database: AppDatabase,
  hackathonId: string,
  photoId: string
) {
  const photo = await database.query.hackathonPhotos.findFirst({
    where: and(
      eq(hackathonPhotos.hackathonId, hackathonId),
      eq(hackathonPhotos.id, photoId),
      eq(hackathonPhotos.isPubliclyVisible, true)
    )
  })

  if (!photo) {
    throw new ApiError({
      statusCode: 404,
      code: 'hackathon_photo_not_found',
      message: 'The requested hackathon photo was not found.',
      details: {
        hackathonId,
        photoId
      }
    })
  }

  return photo
}

function serializeHackathonPhotoRecord(
  photo: typeof hackathonPhotos.$inferSelect,
  options: {
    imagePathBuilder: (photoId: string, variant: HackathonPhotoImageVariant, version: string) => string
    uploadedByUserId: string | null
    uploader: {
      id: string
      displayName: string
    } | null
  }
): HackathonPhotoRecord {
  return {
    id: photo.id,
    hackathonId: photo.hackathonId,
    fileName: photo.fileName,
    isPubliclyVisible: photo.isPubliclyVisible,
    contentType: photo.contentType,
    width: photo.width,
    height: photo.height,
    createdAt: photo.createdAt,
    uploadedByUserId: options.uploadedByUserId,
    uploadedBy: options.uploader,
    previewUrl: options.imagePathBuilder(photo.id, 'preview', photo.createdAt),
    originalUrl: options.imagePathBuilder(photo.id, 'original', photo.createdAt)
  }
}

export async function listHackathonPhotoRecords(database: AppDatabase, hackathonId: string) {
  const photos = await database.query.hackathonPhotos.findMany({
    where: eq(hackathonPhotos.hackathonId, hackathonId),
    orderBy: [asc(hackathonPhotos.createdAt)]
  })

  const uploaders = await database
    .select(getTableColumns(users))
    .from(users)
    .innerJoin(hackathonPhotos, eq(hackathonPhotos.uploadedByUserId, users.id))
    .where(eq(hackathonPhotos.hackathonId, hackathonId))
  const usersById = new Map(uploaders.map(user => [user.id, user] as const))

  return photos.map(photo => serializeHackathonPhotoRecord(photo, {
    imagePathBuilder: (photoId, variant, version) => buildHackathonPhotoImageUrl(hackathonId, photoId, variant, version),
    uploadedByUserId: photo.uploadedByUserId,
    uploader: usersById.get(photo.uploadedByUserId) ?? null
  }))
}

export async function listPublicHackathonPhotoRecords(
  event: H3Event,
  database: AppDatabase,
  hackathonId: string,
  slug: string
) {
  const photos = await database.query.hackathonPhotos.findMany({
    where: and(
      eq(hackathonPhotos.hackathonId, hackathonId),
      eq(hackathonPhotos.isPubliclyVisible, true)
    ),
    orderBy: [asc(hackathonPhotos.createdAt)]
  })

  return photos.map(photo => serializeHackathonPhotoRecord(photo, {
    imagePathBuilder: (photoId, variant, version) => buildPublicHackathonPhotoImageUrl(
      event,
      hackathonId,
      slug,
      photoId,
      variant,
      version
    ),
    uploadedByUserId: null,
    uploader: null
  }))
}

export async function hasHackathonPhotos(database: AppDatabase, hackathonId: string) {
  const photo = await database.query.hackathonPhotos.findFirst({
    columns: {
      id: true
    },
    where: eq(hackathonPhotos.hackathonId, hackathonId)
  })

  return Boolean(photo)
}

export async function hasPublicHackathonPhotos(database: AppDatabase, hackathonId: string) {
  const photo = await database.query.hackathonPhotos.findFirst({
    columns: {
      id: true
    },
    where: and(
      eq(hackathonPhotos.hackathonId, hackathonId),
      eq(hackathonPhotos.isPubliclyVisible, true)
    )
  })

  return Boolean(photo)
}

export async function requireHackathonPhotoReadAccess(event: H3Event, hackathonId: string) {
  const actor = await requirePlatformActor(event)
  const database = getDatabase(event)
  const hackathon = await getHackathonOrThrow(database, hackathonId)

  if (actor.platformUser.isPlatformAdmin) {
    return {
      actor,
      database,
      hackathon
    }
  }

  const authorization = await resolveHackathonAuthorization(event, hackathonId)

  if (authorization.explicitRole !== null) {
    return {
      actor,
      database,
      hackathon
    }
  }

  const approvedApplication = await database.query.userApplications.findFirst({
    columns: {
      id: true
    },
    where: and(
      eq(userApplications.hackathonId, hackathonId),
      eq(userApplications.userId, actor.platformUser.id),
      eq(userApplications.status, 'approved')
    )
  })

  assertGuard(Boolean(approvedApplication), {
    statusCode: 403,
    code: 'hackathon_photo_access_required',
    message: 'This operation requires approved participant access or an explicit hackathon role.',
    details: {
      hackathonId
    }
  })

  return {
    actor,
    database,
    hackathon
  }
}

export async function requireHackathonPhotoManageAccess(event: H3Event, hackathonId: string) {
  const actor = await requirePlatformActor(event)
  const database = getDatabase(event)
  const hackathon = await getHackathonOrThrow(database, hackathonId)

  if (actor.platformUser.isPlatformAdmin) {
    return {
      actor,
      database,
      hackathon
    }
  }

  const authorization = await resolveHackathonAuthorization(event, hackathonId)

  assertGuard(authorization.explicitRole !== null, {
    statusCode: 403,
    code: 'hackathon_photo_manage_required',
    message: 'This operation requires hackathon photo management access.',
    details: {
      hackathonId
    }
  })

  return {
    actor,
    database,
    hackathon
  }
}

export async function createHackathonPhotoPreviewResponse(
  event: H3Event,
  photoObject: NonNullable<Awaited<ReturnType<typeof getHackathonPhotoObject>>>,
  options?: {
    cacheControl?: string
    includeCookieVary?: boolean
  }
) {
  const bytes = new Uint8Array(await photoObject.arrayBuffer())
  const transformed = await getImagesBinding(event)
    .input(createImageStream(bytes))
    .transform({
      width: 720,
      height: 720,
      fit: 'scale-down'
    })
    .output({
      format: 'image/webp',
      quality: 82
    })

  const response = transformed.response()
  const headers: Record<string, string> = {
    'cache-control': options?.cacheControl ?? 'private, max-age=31536000, immutable',
    'content-type': transformed.contentType(),
    'x-content-type-options': 'nosniff'
  }

  if (options?.includeCookieVary ?? true) {
    headers.vary = 'Cookie'
  }

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers
  })
}
