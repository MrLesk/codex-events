import { setHeader } from 'h3'

import { getDatabase } from '../../../../../database/client'
import { defineApiHandler } from '../../../../../utils/api-handler'
import { ApiError } from '../../../../../utils/api-error'
import { getHackathonImageObject } from '../../../../../utils/hackathon-images'
import {
  getPublicHackathonBySlugOrThrow,
  routeSlugParamsSchema
} from '../../../../../utils/hackathon-management'
import { parseValidatedParams } from '../../../../../utils/validation'

export default defineApiHandler(async (event) => {
  const { slug } = parseValidatedParams(event, routeSlugParamsSchema)
  const hackathon = await getPublicHackathonBySlugOrThrow(getDatabase(event), slug)

  if (!hackathon.bannerImageUrl) {
    throw new ApiError({
      statusCode: 404,
      code: 'hackathon_banner_image_not_found',
      message: 'The requested hackathon does not have an uploaded banner image.'
    })
  }

  const image = await getHackathonImageObject(event, hackathon.id, 'banner')

  if (!image) {
    throw new ApiError({
      statusCode: 404,
      code: 'hackathon_banner_image_not_found',
      message: 'The requested hackathon does not have an uploaded banner image.'
    })
  }

  setHeader(event, 'cache-control', 'public, no-store')

  return new Response(await image.arrayBuffer(), {
    headers: {
      'content-type': image.httpMetadata?.contentType ?? 'application/octet-stream'
    }
  })
})
