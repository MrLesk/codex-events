import { z } from 'zod'

import { getDatabase } from '#server/database/client'
import { defineApiHandler } from '#server/http/api-handler'
import { ApiError } from '#server/http/api-error'
import {
  createHackathonPhotoPreviewResponse,
  getHackathonPhotoObject,
  getPublicHackathonPhotoRecordOrThrow,
  hackathonPhotoImageQuerySchema
} from '#server/utils/hackathon-photos'
import {
  getPublicHackathonBySlugOrThrow,
  routeSlugParamsSchema
} from '#server/utils/hackathon-management'
import { parseValidatedParams, parseValidatedQuery } from '#server/http/validation'

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
