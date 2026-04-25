import { eq } from 'drizzle-orm'

import { requirePlatformActor } from '#server/auth/actor'
import { defineApiHandler } from '#server/utils/api-handler'
import { apiData } from '#server/utils/api-response'
import { ApiError } from '#server/utils/api-error'
import {
  assertJoinRequestPending,
  getJoinRequestOrThrow,
  serializeTeamJoinRequest,
  teamJoinRequestParamsSchema
} from '#server/utils/team-formation'
import { getDatabase } from '#server/database/client'
import { teamJoinRequests } from '#server/database/schema'
import { parseValidatedParams } from '#server/utils/validation'

export default defineApiHandler(async (event) => {
  const actor = await requirePlatformActor(event)
  const { hackathonId, requestId } = parseValidatedParams(event, teamJoinRequestParamsSchema)
  const database = getDatabase(event)
  const request = await getJoinRequestOrThrow(database, hackathonId, requestId)

  if (request.userId !== actor.platformUser.id) {
    throw new ApiError({
      statusCode: 403,
      code: 'team_join_request_owner_required',
      message: 'This operation requires ownership of the team join request.',
      details: {
        hackathonId,
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
