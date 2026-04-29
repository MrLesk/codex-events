import { eq } from 'drizzle-orm'

import { requirePlatformActor } from '#server/auth/actor'
import { writeAuditLog } from '#server/database/audit-log'
import { teamJoinRequests, teamMembers, teams } from '#server/database/schema'
import { defineApiHandler } from '#server/http/api-handler'
import { apiData } from '#server/http/api-response'
import {
  assertHackathonAllowsTeamFormation,
  assertJoinRequestPending,
  assertNoActiveTeamMembershipForHackathon,
  assertRequestingUserApprovedForHackathon,
  assertTeamActiveForFormation,
  assertTeamHasCapacity,
  assertTeamOpenToJoinRequests,
  getJoinRequestOrThrow,
  getTeamOrThrow,
  requireTeamAdminContext,
  serializeTeamJoinRequest,
  teamJoinRequestParamsSchema
} from '#server/domains/teams'
import { getDatabase } from '#server/database/client'
import { parseValidatedParams } from '#server/http/validation'

export default defineApiHandler(async (event) => {
  const actor = await requirePlatformActor(event)
  const { hackathonId, requestId } = parseValidatedParams(event, teamJoinRequestParamsSchema)
  const database = getDatabase(event)
  const request = await getJoinRequestOrThrow(database, hackathonId, requestId)
  const { hackathon, team } = await requireTeamAdminContext(event, hackathonId, request.teamId)

  assertHackathonAllowsTeamFormation(hackathon)
  assertJoinRequestPending(request)

  const liveTeam = await getTeamOrThrow(database, hackathonId, team.id)
  await assertTeamActiveForFormation(database, liveTeam.id)
  assertTeamOpenToJoinRequests(liveTeam)
  await assertRequestingUserApprovedForHackathon(database, hackathonId, request.userId)
  await assertNoActiveTeamMembershipForHackathon(database, hackathonId, request.userId)
  await assertTeamHasCapacity(database, hackathon, liveTeam.id)

  const reviewedAt = new Date().toISOString()
  const teamMemberId = crypto.randomUUID()

  await database.batch([
    database
      .update(teamJoinRequests)
      .set({
        status: 'approved',
        reviewedAt,
        reviewedByUserId: actor.platformUser.id
      })
      .where(eq(teamJoinRequests.id, request.id)),
    database.insert(teamMembers).values({
      id: teamMemberId,
      teamId: liveTeam.id,
      userId: request.userId,
      role: 'member',
      joinedAt: reviewedAt,
      createdAt: reviewedAt
    }),
    ...(liveTeam.workspaceMode === 'solo'
      ? [
          database
            .update(teams)
            .set({
              workspaceMode: 'team',
              updatedAt: reviewedAt
            })
            .where(eq(teams.id, liveTeam.id))
        ]
      : [])
  ])

  await writeAuditLog(database, {
    actorUserId: actor.platformUser.id,
    entityType: 'team_join_request',
    entityId: request.id,
    action: 'team_join_request.approved',
    metadata: {
      hackathonId,
      teamId: liveTeam.id,
      userId: request.userId,
      teamMemberId
    }
  })

  return apiData(serializeTeamJoinRequest({
    ...request,
    status: 'approved',
    reviewedAt,
    reviewedByUserId: actor.platformUser.id
  }))
})
