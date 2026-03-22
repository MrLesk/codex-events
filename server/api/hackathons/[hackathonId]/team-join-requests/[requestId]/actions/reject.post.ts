import { eq } from 'drizzle-orm'

import { requirePlatformActor } from '../../../../../../auth/actor'
import { writeAuditLog } from '../../../../../../database/audit-log'
import { teamJoinRequests } from '../../../../../../database/schema'
import { defineApiHandler } from '../../../../../../utils/api-handler'
import { apiData } from '../../../../../../utils/api-response'
import {
  assertHackathonAllowsTeamFormation,
  assertJoinRequestPending,
  getJoinRequestOrThrow,
  requireTeamAdminContext,
  serializeTeamJoinRequest,
  teamJoinRequestParamsSchema
} from '../../../../../../utils/team-formation'
import { getDatabase } from '../../../../../../database/client'
import { parseValidatedParams } from '../../../../../../utils/validation'

export default defineApiHandler(async (event) => {
  const actor = await requirePlatformActor(event)
  const { hackathonId, requestId } = parseValidatedParams(event, teamJoinRequestParamsSchema)
  const database = getDatabase(event)
  const request = await getJoinRequestOrThrow(database, hackathonId, requestId)
  const { hackathon } = await requireTeamAdminContext(event, hackathonId, request.teamId)

  assertHackathonAllowsTeamFormation(hackathon)
  assertJoinRequestPending(request)

  const reviewedAt = new Date().toISOString()

  await database
    .update(teamJoinRequests)
    .set({
      status: 'rejected',
      reviewedAt,
      reviewedByUserId: actor.platformUser.id
    })
    .where(eq(teamJoinRequests.id, request.id))

  await writeAuditLog(database, {
    actorUserId: actor.platformUser.id,
    entityType: 'team_join_request',
    entityId: request.id,
    action: 'team_join_request.rejected',
    metadata: {
      hackathonId,
      teamId: request.teamId,
      userId: request.userId
    }
  })

  return apiData(serializeTeamJoinRequest({
    ...request,
    status: 'rejected',
    reviewedAt,
    reviewedByUserId: actor.platformUser.id
  }))
})
