import { setHeader } from 'h3'

import { requirePlatformActor } from '../../auth/actor'
import { defineApiHandler } from '../../utils/api-handler'
import { ApiError } from '../../utils/api-error'
import { getProfileIconObject } from '../../utils/profile-icons'

export default defineApiHandler(async (event) => {
  const actor = await requirePlatformActor(event)

  if (!actor.platformUser.profileIconUpdatedAt) {
    throw new ApiError({
      statusCode: 404,
      code: 'profile_icon_not_found',
      message: 'The platform user does not have an uploaded profile icon.'
    })
  }

  const icon = await getProfileIconObject(event, actor.platformUser.id)

  if (!icon) {
    throw new ApiError({
      statusCode: 404,
      code: 'profile_icon_not_found',
      message: 'The platform user does not have an uploaded profile icon.'
    })
  }

  setHeader(event, 'cache-control', 'private, max-age=31536000, immutable')
  setHeader(event, 'vary', 'Cookie')

  return new Response(await icon.arrayBuffer(), {
    headers: {
      'content-type': icon.httpMetadata?.contentType ?? 'application/octet-stream'
    }
  })
})
