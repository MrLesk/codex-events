import { eq } from 'drizzle-orm'

import { requirePlatformActor } from '#server/auth/actor'
import { writeAuditLog } from '#server/database/audit-log'
import { teamJoinRequests } from '#server/database/schema'
import { defineApiHandler } from '#server/http/api-handler'
import { apiData } from '#server/http/api-response'
import {
  assertEventAllowsTeamFormation,
  assertJoinRequestPending,
  getJoinRequestOrThrow,
  requireTeamAdminContext,
  serializeTeamJoinRequest,
  teamJoinRequestParamsSchema
} from '#server/domains/teams'
import { getDatabase } from '#server/database/client'
import { parseValidatedParams } from '#server/http/validation'

export default defineApiHandler(async (h3Event) => {
  const actor = await requirePlatformActor(h3Event)
  const { eventId, requestId } = parseValidatedParams(h3Event, teamJoinRequestParamsSchema)
  const database = getDatabase(h3Event)
  const request = await getJoinRequestOrThrow(database, eventId, requestId)
  const { event } = await requireTeamAdminContext(h3Event, eventId, request.teamId)

  assertEventAllowsTeamFormation(event)
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
      eventId,
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
