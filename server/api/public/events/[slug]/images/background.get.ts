import { getRequestHeader, setHeader } from 'h3'

import { getDatabase } from '#server/database/client'
import { defineApiHandler } from '#server/http/api-handler'
import { ApiError } from '#server/http/api-error'
import {
  createPublicEventImageResponse,
  getManagedPublicEventImagePath,
  getEventImageObject,
  privateEventImageCacheControl,
  publicEventImagePath,
  publicEventImageQuerySchema
} from '#server/domains/events/images'
import {
  getPublicEventBySlugOrThrow,
  routeSlugParamsSchema
} from '#server/domains/events'
import { parseValidatedParams, parseValidatedQuery } from '#server/http/validation'

export default defineApiHandler(async (h3Event) => {
  setHeader(h3Event, 'cache-control', privateEventImageCacheControl)

  const { slug } = parseValidatedParams(h3Event, routeSlugParamsSchema)
  const query = parseValidatedQuery(h3Event, publicEventImageQuerySchema)
  const event = await getPublicEventBySlugOrThrow(getDatabase(h3Event), slug)

  const imagePath = event.backgroundImageUrl
    ? getManagedPublicEventImagePath(event.backgroundImageUrl)
    : null

  if (
    !event.backgroundImageUrl
    || imagePath !== publicEventImagePath(event.slug, 'background')
    || query.variant !== 'background'
    || query.v !== String(event.mediaRevision)
  ) {
    throw new ApiError({
      statusCode: 404,
      code: 'event_background_image_not_found',
      message: 'The requested event does not have an uploaded background image.'
    })
  }

  const image = await getEventImageObject(h3Event, event.id, 'background')

  if (!image) {
    throw new ApiError({
      statusCode: 404,
      code: 'event_background_image_not_found',
      message: 'The requested event does not have an uploaded background image.'
    })
  }

  return await createPublicEventImageResponse(h3Event, image, 'background', {
    accept: getRequestHeader(h3Event, 'accept')
  })
})
