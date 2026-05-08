import { setHeader } from 'h3'

import { defineApiHandler } from '#server/http/api-handler'
import { ApiError } from '#server/http/api-error'
import {
  createEventPhotoPreviewResponse,
  getEventPhotoObject,
  getEventPhotoRecordOrThrow,
  eventPhotoImageQuerySchema,
  eventPhotoParamsSchema,
  requireEventPhotoReadAccess
} from '#server/domains/events/photos'
import {
  parseValidatedParams,
  parseValidatedQuery
} from '#server/http/validation'

export default defineApiHandler(async (h3Event) => {
  const { eventId, photoId } = parseValidatedParams(h3Event, eventPhotoParamsSchema)
  const query = parseValidatedQuery(h3Event, eventPhotoImageQuerySchema)
  const { database } = await requireEventPhotoReadAccess(h3Event, eventId)
  await getEventPhotoRecordOrThrow(database, eventId, photoId)
  const photoObject = await getEventPhotoObject(h3Event, eventId, photoId)

  if (!photoObject) {
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

  if (query.variant === 'preview') {
    return await createEventPhotoPreviewResponse(h3Event, photoObject)
  }

  setHeader(h3Event, 'cache-control', 'private, max-age=31536000, immutable')
  setHeader(h3Event, 'vary', 'Cookie')

  return new Response(await photoObject.arrayBuffer(), {
    headers: {
      'content-type': photoObject.httpMetadata?.contentType ?? 'application/octet-stream',
      'x-content-type-options': 'nosniff'
    }
  })
})
