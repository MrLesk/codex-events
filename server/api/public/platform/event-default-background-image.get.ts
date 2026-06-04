import { setHeader } from 'h3'

import { getDatabase } from '#server/database/client'
import { getPlatformDefaultEventBackgroundImageObject } from '#server/domains/events/images'
import { getPlatformSettings } from '#server/domains/platform/settings'
import { ApiError } from '#server/http/api-error'
import { defineApiHandler } from '#server/http/api-handler'

export default defineApiHandler(async (h3Event) => {
  const settings = await getPlatformSettings(getDatabase(h3Event))

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

  setHeader(h3Event, 'cache-control', 'public, no-store')

  return new Response(await image.arrayBuffer(), {
    headers: {
      'content-type': image.httpMetadata?.contentType ?? 'application/octet-stream',
      'x-content-type-options': 'nosniff'
    }
  })
})
