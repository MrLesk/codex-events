import { getRequestHeader, setHeader } from 'h3'

import { defineApiHandler } from '#server/http/api-handler'
import { ApiError } from '#server/http/api-error'
import {
  createPublicEventImageResponse,
  getEventImageObject,
  privateEventImageCacheControl,
  publicEventImageQuerySchema
} from '#server/domains/events/images'
import {
  getVisibleEventBySlugOrThrow,
  isPublicEventVisible,
  routeSlugParamsSchema
} from '#server/domains/events'
import { parseValidatedParams, parseValidatedQuery } from '#server/http/validation'

export default defineApiHandler(async (h3Event) => {
  setHeader(h3Event, 'cache-control', privateEventImageCacheControl)

  const { slug } = parseValidatedParams(h3Event, routeSlugParamsSchema)
  const query = parseValidatedQuery(h3Event, publicEventImageQuerySchema)
  const event = await getVisibleEventBySlugOrThrow(h3Event, slug)

  if (!event.bannerImageUrl) {
    throw new ApiError({
      statusCode: 404,
      code: 'event_banner_image_not_found',
      message: 'The requested event does not have an uploaded banner image.'
    })
  }

  const image = await getEventImageObject(h3Event, event.id, 'banner')

  if (!image) {
    throw new ApiError({
      statusCode: 404,
      code: 'event_banner_image_not_found',
      message: 'The requested event does not have an uploaded banner image.'
    })
  }

  return await createPublicEventImageResponse(h3Event, image, 'banner', {
    versioned: isPublicEventVisible(event) && query.variant === 'banner' && query.v === event.updatedAt,
    accept: getRequestHeader(h3Event, 'accept')
  })
})
