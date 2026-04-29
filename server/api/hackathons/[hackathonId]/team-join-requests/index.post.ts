import { requirePlatformActor } from '#server/auth/actor'
import { teamJoinRequests } from '#server/database/schema'
import { defineApiHandler } from '#server/http/api-handler'
import { apiData } from '#server/http/api-response'
import {
  assertNoActiveTeamMembershipForHackathon,
  assertPendingJoinRequestAllowed,
  assertTeamActiveForFormation,
  assertTeamHasCapacity,
  assertTeamOpenToJoinRequests,
  createJoinRequestBodySchema,
  getPendingJoinRequestForUser,
  getTeamOrThrow,
  requireTeamFormationApprovedContext,
  serializeTeamJoinRequest
} from '#server/utils/team-formation'
import { parseValidatedBody, parseValidatedParams } from '#server/http/validation'
import { routeIdParamsSchema } from '#server/domains/hackathons'

export default defineApiHandler(async (event) => {
  const actor = await requirePlatformActor(event)
  const { hackathonId } = parseValidatedParams(event, routeIdParamsSchema)
  const body = await parseValidatedBody(event, createJoinRequestBodySchema)
  const { database, hackathon } = await requireTeamFormationApprovedContext(event, hackathonId)
  const team = await getTeamOrThrow(database, hackathonId, body.teamId)

  await assertNoActiveTeamMembershipForHackathon(database, hackathonId, actor.platformUser.id)
  await assertTeamActiveForFormation(database, team.id)
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
