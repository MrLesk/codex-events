import { requirePlatformActor } from '../../../../auth/actor'
import { teamJoinRequests } from '../../../../database/schema'
import { defineApiHandler } from '../../../../utils/api-handler'
import { apiData } from '../../../../utils/api-response'
import {
  assertNoActiveTeamMembershipForHackathon,
  assertPendingJoinRequestAllowed,
  assertTeamHasCapacity,
  assertTeamOpenToJoinRequests,
  createJoinRequestBodySchema,
  getPendingJoinRequestForUser,
  getTeamOrThrow,
  requireTeamFormationApprovedContext,
  serializeTeamJoinRequest
} from '../../../../utils/team-formation'
import { parseValidatedBody, parseValidatedParams } from '../../../../utils/validation'
import { routeIdParamsSchema } from '../../../../utils/hackathon-management'

export default defineApiHandler(async (event) => {
  const actor = await requirePlatformActor(event)
  const { hackathonId } = parseValidatedParams(event, routeIdParamsSchema)
  const body = await parseValidatedBody(event, createJoinRequestBodySchema)
  const { database, hackathon } = await requireTeamFormationApprovedContext(event, hackathonId)
  const team = await getTeamOrThrow(database, hackathonId, body.teamId)

  await assertNoActiveTeamMembershipForHackathon(database, hackathonId, actor.platformUser.id)
  assertTeamOpenToJoinRequests(team)
  await assertTeamHasCapacity(database, hackathon, team.id)

  const existingRequest = await getPendingJoinRequestForUser(database, team.id, actor.platformUser.id)
  assertPendingJoinRequestAllowed(existingRequest ?? null, team.id, actor.platformUser.id)

  const requestId = crypto.randomUUID()
  const requestedAt = new Date().toISOString()

  await database.insert(teamJoinRequests).values({
    id: requestId,
    teamId: team.id,
    userId: actor.platformUser.id,
    status: 'pending',
    requestedAt,
    createdAt: requestedAt
  })

  return apiData(serializeTeamJoinRequest({
    id: requestId,
    teamId: team.id,
    userId: actor.platformUser.id,
    status: 'pending',
    requestedAt,
    reviewedAt: null,
    reviewedByUserId: null,
    createdAt: requestedAt
  }, {
    user: actor.platformUser
  }))
})
