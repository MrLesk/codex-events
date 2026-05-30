import type { H3Event } from 'h3'

import { and, asc, eq, getTableColumns } from 'drizzle-orm'
import { z } from 'zod'

import type { EventPhotoImageVariant, EventPhotoRecord } from '#shared/domains/events/photos'

import { requirePlatformActor } from '#server/auth/actor'
import { resolveEventAuthorization } from '#server/auth/authorization'
import { getDatabase, type AppDatabase } from '#server/database/client'
import { eventPhotos, userApplications, users } from '#server/database/schema'
import { ApiError } from '#server/http/api-error'
import { getEventImagesBucket } from './images'
import {
  getEventOrThrow,
  routeIdParamsSchema
} from '#server/domains/events'
import {
  detectSupportedImageContentType,
  supportedImageContentTypes,
  type SupportedImageContentType
} from '#server/utils/image-signatures'
import { assertGuard } from '#server/domains/lifecycle-guard'

export const eventPhotoMaxBytes = 10 * 1024 * 1024
export const eventPhotoContentTypes = supportedImageContentTypes

export const eventPhotoParamsSchema = routeIdParamsSchema.extend({
  photoId: z.string().trim().min(1)
})

export const eventPhotoImageQuerySchema = z.object({
  variant: z.enum(['preview', 'original']).default('original'),
  v: z.string().trim().min(1).optional()
})

export const updateEventPhotoPublicVisibilityBodySchema = z.object({
  isPubliclyVisible: z.coerce.boolean()
})

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

export function eventPhotoObjectKey(eventId: string, photoId: string) {
  return `events/${eventId}/photos/${photoId}`
}

export function buildEventPhotoImageUrl(
  eventId: string,
  photoId: string,
  variant: EventPhotoImageVariant,
  version: string
) {
  const params = new URLSearchParams({
    variant,
    v: version
  })

  return `/api/events/${encodeURIComponent(eventId)}/photos/${encodeURIComponent(photoId)}/image?${params.toString()}`
}

export function buildPublicEventPhotoImageUrl(
  slug: string,
  photoId: string,
  variant: EventPhotoImageVariant,
  version: string
) {
  const params = new URLSearchParams({
    variant,
    v: version
  })

  return `/api/public/events/${encodeURIComponent(slug)}/photos/${encodeURIComponent(photoId)}/image?${params.toString()}`
}

export function assertValidEventPhotoPart(part: {
  type?: string
  data?: Uint8Array
  filename?: string
}) {
  if (!part.data || part.data.byteLength === 0) {
    throw new ApiError({
      statusCode: 400,
      code: 'event_photo_file_required',
      message: 'At least one event photo file is required.'
    })
  }

  const contentType = detectSupportedImageContentType(part.data)

  if (!contentType) {
    throw new ApiError({
      statusCode: 400,
      code: 'event_photo_content_type_invalid',
      message: 'Event photos must be JPEG or PNG files.',
      details: {
        allowedContentTypes: eventPhotoContentTypes
      }
    })
  }

  if (part.data.byteLength > eventPhotoMaxBytes) {
    throw new ApiError({
      statusCode: 400,
      code: 'event_photo_file_too_large',
      message: 'Event photos must be 10MB or smaller.',
      details: {
        maxBytes: eventPhotoMaxBytes,
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

export async function getEventPhotoDimensions(event: H3Event, data: Uint8Array) {
  const metadata = await getImagesBinding(event).info(createImageStream(data))

  assertGuard(
    (Number.isInteger(metadata.width) && metadata.width > 0)
    && (Number.isInteger(metadata.height) && metadata.height > 0),
    {
      statusCode: 400,
      code: 'event_photo_dimensions_invalid',
      message: 'The uploaded photo dimensions could not be determined.'
    }
  )

  return {
    width: metadata.width,
    height: metadata.height
  }
}

export async function putEventPhotoObject(
  event: H3Event,
  eventId: string,
  photoId: string,
  payload: {
    contentType: SupportedImageContentType
    data: Uint8Array
  }
) {
  const normalizedData = payload.data.constructor === Uint8Array
    ? payload.data
    : new Uint8Array(payload.data)

  await getEventImagesBucket(event).put(
    eventPhotoObjectKey(eventId, photoId),
    normalizedData,
    {
      httpMetadata: {
        contentType: payload.contentType
      }
    }
  )
}

export async function getEventPhotoObject(
  event: H3Event,
  eventId: string,
  photoId: string
) {
  return await getEventImagesBucket(event).get(eventPhotoObjectKey(eventId, photoId))
}

export async function deleteEventPhotoObject(
  event: H3Event,
  eventId: string,
  photoId: string
) {
  await getEventImagesBucket(event).delete(eventPhotoObjectKey(eventId, photoId))
}

export async function getEventPhotoRecordOrThrow(
  database: AppDatabase,
  eventId: string,
  photoId: string
) {
  const photo = await database.query.eventPhotos.findFirst({
    where: and(
      eq(eventPhotos.eventId, eventId),
      eq(eventPhotos.id, photoId)
    )
  })

  if (!photo) {
    throw new ApiError({
      statusCode: 404,
      code: 'event_photo_not_found',
      message: 'The requested event photo was not found.',
      details: {
        eventId,
        photoId
      }
    })
  }

  return photo
}

export async function getPublicEventPhotoRecordOrThrow(
  database: AppDatabase,
  eventId: string,
  photoId: string
) {
  const photo = await database.query.eventPhotos.findFirst({
    where: and(
      eq(eventPhotos.eventId, eventId),
      eq(eventPhotos.id, photoId),
      eq(eventPhotos.isPubliclyVisible, true)
    )
  })

  if (!photo) {
    throw new ApiError({
      statusCode: 404,
      code: 'event_photo_not_found',
      message: 'The requested event photo was not found.',
      details: {
        eventId,
        photoId
      }
    })
  }

  return photo
}

function serializeEventPhotoRecord(
  photo: typeof eventPhotos.$inferSelect,
  options: {
    imagePathBuilder: (photoId: string, variant: EventPhotoImageVariant, version: string) => string
    uploadedByUserId: string | null
    uploader: {
      id: string
      displayName: string
    } | null
  }
): EventPhotoRecord {
  return {
    id: photo.id,
    eventId: photo.eventId,
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

export async function listEventPhotoRecords(database: AppDatabase, eventId: string) {
  const photos = await database.query.eventPhotos.findMany({
    where: eq(eventPhotos.eventId, eventId),
    orderBy: [asc(eventPhotos.createdAt)]
  })

  const uploaders = await database
    .select(getTableColumns(users))
    .from(users)
    .innerJoin(eventPhotos, eq(eventPhotos.uploadedByUserId, users.id))
    .where(eq(eventPhotos.eventId, eventId))
  const usersById = new Map(uploaders.map(user => [user.id, user] as const))

  return photos.map(photo => serializeEventPhotoRecord(photo, {
    imagePathBuilder: (photoId, variant, version) => buildEventPhotoImageUrl(eventId, photoId, variant, version),
    uploadedByUserId: photo.uploadedByUserId,
    uploader: usersById.get(photo.uploadedByUserId) ?? null
  }))
}

export async function listPublicEventPhotoRecords(
  database: AppDatabase,
  eventId: string,
  slug: string
) {
  const photos = await database.query.eventPhotos.findMany({
    where: and(
      eq(eventPhotos.eventId, eventId),
      eq(eventPhotos.isPubliclyVisible, true)
    ),
    orderBy: [asc(eventPhotos.createdAt)]
  })

  return photos.map(photo => serializeEventPhotoRecord(photo, {
    imagePathBuilder: (photoId, variant, version) => buildPublicEventPhotoImageUrl(
      slug,
      photoId,
      variant,
      version
    ),
    uploadedByUserId: null,
    uploader: null
  }))
}

export async function hasEventPhotos(database: AppDatabase, eventId: string) {
  const photo = await database.query.eventPhotos.findFirst({
    columns: {
      id: true
    },
    where: eq(eventPhotos.eventId, eventId)
  })

  return Boolean(photo)
}

export async function hasPublicEventPhotos(database: AppDatabase, eventId: string) {
  const photo = await database.query.eventPhotos.findFirst({
    columns: {
      id: true
    },
    where: and(
      eq(eventPhotos.eventId, eventId),
      eq(eventPhotos.isPubliclyVisible, true)
    )
  })

  return Boolean(photo)
}

export async function requireEventPhotoReadAccess(h3Event: H3Event, eventId: string) {
  const actor = await requirePlatformActor(h3Event)
  const database = getDatabase(h3Event)
  const event = await getEventOrThrow(database, eventId)

  if (actor.platformUser.isPlatformAdmin) {
    return {
      actor,
      database,
      event
    }
  }

  const authorization = await resolveEventAuthorization(h3Event, eventId)

  if (authorization.explicitRole !== null) {
    return {
      actor,
      database,
      event
    }
  }

  const approvedApplication = await database.query.userApplications.findFirst({
    columns: {
      id: true
    },
    where: and(
      eq(userApplications.eventId, eventId),
      eq(userApplications.userId, actor.platformUser.id),
      eq(userApplications.status, 'approved')
    )
  })

  assertGuard(Boolean(approvedApplication), {
    statusCode: 403,
    code: 'event_photo_access_required',
    message: 'This operation requires approved participant access or an explicit event role.',
    details: {
      eventId
    }
  })

  return {
    actor,
    database,
    event
  }
}

export async function requireEventPhotoManageAccess(h3Event: H3Event, eventId: string) {
  const actor = await requirePlatformActor(h3Event)
  const database = getDatabase(h3Event)
  const event = await getEventOrThrow(database, eventId)

  if (actor.platformUser.isPlatformAdmin) {
    return {
      actor,
      database,
      event
    }
  }

  const authorization = await resolveEventAuthorization(h3Event, eventId)

  assertGuard(authorization.explicitRole !== null, {
    statusCode: 403,
    code: 'event_photo_manage_required',
    message: 'This operation requires event photo management access.',
    details: {
      eventId
    }
  })

  return {
    actor,
    database,
    event
  }
}

export async function createEventPhotoPreviewResponse(
  event: H3Event,
  photoObject: NonNullable<Awaited<ReturnType<typeof getEventPhotoObject>>>,
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
