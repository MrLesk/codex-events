import { z } from 'zod'

import { getDatabase } from '#server/database/client'
import { defineApiHandler } from '#server/http/api-handler'
import { ApiError } from '#server/http/api-error'
import {
  createEventPhotoPreviewResponse,
  getEventPhotoObject,
  getPublicEventPhotoRecordOrThrow,
  eventPhotoImageQuerySchema
} from '#server/domains/events/photos'
import {
  getPublicEventBySlugOrThrow,
  routeSlugParamsSchema
} from '#server/domains/events'
import { parseValidatedParams, parseValidatedQuery } from '#server/http/validation'

export default defineApiHandler(async (h3Event) => {
  const { slug, photoId } = parseValidatedParams(h3Event, routeSlugParamsSchema.extend({
    photoId: z.string().trim().min(1)
  }))
  const query = parseValidatedQuery(h3Event, eventPhotoImageQuerySchema)
  const database = getDatabase(h3Event)
  const event = await getPublicEventBySlugOrThrow(database, slug)
  await getPublicEventPhotoRecordOrThrow(database, event.id, photoId)
  const photoObject = await getEventPhotoObject(h3Event, event.id, photoId)

  if (!photoObject) {
    throw new ApiError({
      statusCode: 404,
      code: 'event_photo_not_found',
      message: 'The requested event photo was not found.',
      details: {
        eventId: event.id,
        photoId
      }
    })
  }

  if (query.variant === 'preview') {
    return await createEventPhotoPreviewResponse(h3Event, photoObject, {
      cacheControl: 'public, max-age=31536000, immutable',
      includeCookieVary: false
    })
  }

  return new Response(await photoObject.arrayBuffer(), {
    headers: {
      'cache-control': 'public, max-age=31536000, immutable',
      'content-type': photoObject.httpMetadata?.contentType ?? 'application/octet-stream',
      'x-content-type-options': 'nosniff'
    }
  })
})
