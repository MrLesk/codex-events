import { eq } from 'drizzle-orm'

import { requirePlatformActor } from '#server/auth/actor'
import { defineApiHandler } from '#server/http/api-handler'
import { apiData } from '#server/http/api-response'
import { ApiError } from '#server/http/api-error'
import {
  assertJoinRequestPending,
  getJoinRequestOrThrow,
  serializeTeamJoinRequest,
  teamJoinRequestParamsSchema
} from '#server/domains/teams'
import { getDatabase } from '#server/database/client'
import { teamJoinRequests } from '#server/database/schema'
import { parseValidatedParams } from '#server/http/validation'

export default defineApiHandler(async (h3Event) => {
  const actor = await requirePlatformActor(h3Event)
  const { eventId, requestId } = parseValidatedParams(h3Event, teamJoinRequestParamsSchema)
  const database = getDatabase(h3Event)
  const request = await getJoinRequestOrThrow(database, eventId, requestId)

  if (request.userId !== actor.platformUser.id) {
    throw new ApiError({
      statusCode: 403,
      code: 'team_join_request_owner_required',
      message: 'This operation requires ownership of the team join request.',
      details: {
        eventId,
        requestId,
        userId: actor.platformUser.id
      }
    })
  }

  assertJoinRequestPending(request)

  await database
    .update(teamJoinRequests)
    .set({
      status: 'canceled'
    })
    .where(eq(teamJoinRequests.id, request.id))

  return apiData(serializeTeamJoinRequest({
    ...request,
    status: 'canceled'
  }, {
    user: actor.platformUser
  }))
})
