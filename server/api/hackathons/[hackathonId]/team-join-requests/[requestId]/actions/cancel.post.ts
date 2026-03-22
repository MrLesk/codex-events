import { eq } from 'drizzle-orm'

import { requirePlatformActor } from '../../../../../../auth/actor'
import { defineApiHandler } from '../../../../../../utils/api-handler'
import { apiData } from '../../../../../../utils/api-response'
import { ApiError } from '../../../../../../utils/api-error'
import {
  assertJoinRequestPending,
  getJoinRequestOrThrow,
  serializeTeamJoinRequest,
  teamJoinRequestParamsSchema
} from '../../../../../../utils/team-formation'
import { getDatabase } from '../../../../../../database/client'
import { teamJoinRequests } from '../../../../../../database/schema'
import { parseValidatedParams } from '../../../../../../utils/validation'

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
