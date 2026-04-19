import { z } from 'zod'

import { getDatabase } from '../../../../../../database/client'
import { defineApiHandler } from '../../../../../../utils/api-handler'
import { ApiError } from '../../../../../../utils/api-error'
import {
  createHackathonPhotoPreviewResponse,
  getHackathonPhotoObject,
  getPublicHackathonPhotoRecordOrThrow,
  hackathonPhotoImageQuerySchema
} from '../../../../../../utils/hackathon-photos'
import {
  getPublicHackathonBySlugOrThrow,
  routeSlugParamsSchema
} from '../../../../../../utils/hackathon-management'
import { parseValidatedParams, parseValidatedQuery } from '../../../../../../utils/validation'

export default defineApiHandler(async (event) => {
  const { slug, photoId } = parseValidatedParams(event, routeSlugParamsSchema.extend({
    photoId: z.string().trim().min(1)
  }))
  const query = parseValidatedQuery(event, hackathonPhotoImageQuerySchema)
  const database = getDatabase(event)
  const hackathon = await getPublicHackathonBySlugOrThrow(database, slug)
  await getPublicHackathonPhotoRecordOrThrow(database, hackathon.id, photoId)
  const photoObject = await getHackathonPhotoObject(event, hackathon.id, photoId)

  if (!photoObject) {
    throw new ApiError({
      statusCode: 404,
      code: 'hackathon_photo_not_found',
      message: 'The requested hackathon photo was not found.',
      details: {
        hackathonId: hackathon.id,
        photoId
      }
    })
  }

  if (query.variant === 'preview') {
    return await createHackathonPhotoPreviewResponse(event, photoObject, {
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
