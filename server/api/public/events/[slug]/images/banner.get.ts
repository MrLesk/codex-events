import { setHeader } from 'h3'

import { defineApiHandler } from '#server/http/api-handler'
import { ApiError } from '#server/http/api-error'
import { getEventImageObject } from '#server/domains/events/images'
import {
  getVisibleEventBySlugOrThrow,
  routeSlugParamsSchema
} from '#server/domains/events'
import { parseValidatedParams } from '#server/http/validation'

export default defineApiHandler(async (h3Event) => {
  const { slug } = parseValidatedParams(h3Event, routeSlugParamsSchema)
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

  setHeader(h3Event, 'cache-control', 'public, no-store')

  return new Response(await image.arrayBuffer(), {
    headers: {
      'content-type': image.httpMetadata?.contentType ?? 'application/octet-stream',
      'x-content-type-options': 'nosniff'
    }
  })
})
