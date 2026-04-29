import { setHeader } from 'h3'

import { defineApiHandler } from '#server/http/api-handler'
import { ApiError } from '#server/http/api-error'
import {
  createHackathonPhotoPreviewResponse,
  getHackathonPhotoObject,
  getHackathonPhotoRecordOrThrow,
  hackathonPhotoImageQuerySchema,
  hackathonPhotoParamsSchema,
  requireHackathonPhotoReadAccess
} from '#server/domains/hackathons/photos'
import {
  parseValidatedParams,
  parseValidatedQuery
} from '#server/http/validation'

export default defineApiHandler(async (event) => {
  const { hackathonId, photoId } = parseValidatedParams(event, hackathonPhotoParamsSchema)
  const query = parseValidatedQuery(event, hackathonPhotoImageQuerySchema)
  const { database } = await requireHackathonPhotoReadAccess(event, hackathonId)
  await getHackathonPhotoRecordOrThrow(database, hackathonId, photoId)
  const photoObject = await getHackathonPhotoObject(event, hackathonId, photoId)

  if (!photoObject) {
    throw new ApiError({
      statusCode: 404,
      code: 'hackathon_photo_not_found',
      message: 'The requested hackathon photo was not found.',
      details: {
        hackathonId,
        photoId
      }
    })
  }

  if (query.variant === 'preview') {
    return await createHackathonPhotoPreviewResponse(event, photoObject)
  }

  setHeader(event, 'cache-control', 'private, max-age=31536000, immutable')
  setHeader(event, 'vary', 'Cookie')

  return new Response(await photoObject.arrayBuffer(), {
    headers: {
      'content-type': photoObject.httpMetadata?.contentType ?? 'application/octet-stream',
      'x-content-type-options': 'nosniff'
    }
  })
})
