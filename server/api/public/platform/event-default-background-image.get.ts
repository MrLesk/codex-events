import { getRequestHeader, setHeader } from 'h3'

import { getDatabase } from '#server/database/client'
import {
  createPublicEventImageResponse,
  getManagedPublicEventImagePath,
  getPlatformDefaultEventBackgroundImageObject,
  privateEventImageCacheControl,
  publicPlatformDefaultEventBackgroundImagePath,
  publicEventImageQuerySchema
} from '#server/domains/events/images'
import { getPlatformSettings } from '#server/domains/platform/settings'
import { ApiError } from '#server/http/api-error'
import { defineApiHandler } from '#server/http/api-handler'
import { parseValidatedQuery } from '#server/http/validation'

export default defineApiHandler(async (h3Event) => {
  setHeader(h3Event, 'cache-control', privateEventImageCacheControl)

  const query = parseValidatedQuery(h3Event, publicEventImageQuerySchema)
  const settings = await getPlatformSettings(getDatabase(h3Event))
  const imagePath = settings?.defaultEventBackgroundImageUrl
    ? getManagedPublicEventImagePath(settings.defaultEventBackgroundImageUrl)
    : null

  if (
    !settings?.defaultEventBackgroundImageUrl
    || imagePath !== publicPlatformDefaultEventBackgroundImagePath()
    || query.variant !== 'background'
    || !settings.defaultEventBackgroundImageObjectKey
    || query.v !== String(settings.defaultEventBackgroundImageRevision)
  ) {
    throw new ApiError({
      statusCode: 404,
      code: 'platform_default_event_background_image_not_found',
      message: 'The platform default event background image is not configured.'
    })
  }

  const image = await getPlatformDefaultEventBackgroundImageObject(
    h3Event,
    settings.defaultEventBackgroundImageObjectKey
  )

  if (!image) {
    throw new ApiError({
      statusCode: 404,
      code: 'platform_default_event_background_image_not_found',
      message: 'The platform default event background image is not configured.'
    })
  }

  return await createPublicEventImageResponse(h3Event, image, 'background', {
    accept: getRequestHeader(h3Event, 'accept')
  })
})
