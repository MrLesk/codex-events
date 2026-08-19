import { setHeader } from 'h3'
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
import {
  publicEventCacheControl,
  publicEventCdnCacheControl,
  setPrivatePublicEventCacheHeaders
} from '#server/domains/events/public-cache'
import { parseValidatedParams, parseValidatedQuery } from '#server/http/validation'

export default defineApiHandler(async (h3Event) => {
  setPrivatePublicEventCacheHeaders(h3Event)

  const { slug, photoId } = parseValidatedParams(h3Event, routeSlugParamsSchema.extend({
    photoId: z.string().trim().min(1)
  }))
  const query = parseValidatedQuery(h3Event, eventPhotoImageQuerySchema)
  const database = getDatabase(h3Event)
  const event = await getPublicEventBySlugOrThrow(database, slug)

  if (query.v !== String(event.mediaRevision)) {
    throw new ApiError({
      statusCode: 404,
      code: 'event_photo_not_found',
      message: 'The requested event photo version was not found.',
      details: {
        eventId: event.id,
        photoId
      }
    })
  }

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

  const response = await createEventPhotoPreviewResponse(h3Event, photoObject, {
    cacheControl: publicEventCacheControl,
    cdnCacheControl: publicEventCdnCacheControl,
    includeCookieVary: false
  })

  setHeader(h3Event, 'cache-control', publicEventCacheControl)
  setHeader(h3Event, 'cloudflare-cdn-cache-control', publicEventCdnCacheControl)

  return response
})
