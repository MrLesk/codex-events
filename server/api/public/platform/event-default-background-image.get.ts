import { getRequestHeader, setHeader } from 'h3'

import { getPublicReplicaDatabase } from '#server/database/client'
import {
  createPublicEventImageResponse,
  getPlatformDefaultEventBackgroundImageObject,
  privateEventImageCacheControl,
  publicEventImageQuerySchema
} from '#server/domains/events/images'
import { getPlatformSettings } from '#server/domains/platform/settings'
import { ApiError } from '#server/http/api-error'
import { defineApiHandler } from '#server/http/api-handler'
import { parseValidatedQuery } from '#server/http/validation'

export default defineApiHandler(async (h3Event) => {
  setHeader(h3Event, 'cache-control', privateEventImageCacheControl)

  const query = parseValidatedQuery(h3Event, publicEventImageQuerySchema)
  const settings = await getPlatformSettings(getPublicReplicaDatabase(h3Event))

  if (!settings?.defaultEventBackgroundImageUrl) {
    throw new ApiError({
      statusCode: 404,
      code: 'platform_default_event_background_image_not_found',
      message: 'The platform default event background image is not configured.'
    })
  }

  const image = await getPlatformDefaultEventBackgroundImageObject(h3Event)

  if (!image) {
    throw new ApiError({
      statusCode: 404,
      code: 'platform_default_event_background_image_not_found',
      message: 'The platform default event background image is not configured.'
    })
  }

  return await createPublicEventImageResponse(h3Event, image, 'background', {
    versioned: query.variant === 'background' && query.v === settings.updatedAt,
    accept: getRequestHeader(h3Event, 'accept')
  })
})
