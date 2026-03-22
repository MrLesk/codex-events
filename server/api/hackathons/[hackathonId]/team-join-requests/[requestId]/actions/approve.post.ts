import { eq } from 'drizzle-orm'

import { requirePlatformActor } from '../../../../../../auth/actor'
import { writeAuditLog } from '../../../../../../database/audit-log'
import type { AppDatabaseTransaction } from '../../../../../../database/client'
import { teamJoinRequests, teamMembers } from '../../../../../../database/schema'
import { defineApiHandler } from '../../../../../../utils/api-handler'
import { apiData } from '../../../../../../utils/api-response'
import {
  assertHackathonAllowsTeamFormation,
  assertJoinRequestPending,
  assertNoActiveTeamMembershipForHackathon,
  assertRequestingUserApprovedForHackathon,
  assertTeamHasCapacity,
  assertTeamOpenToJoinRequests,
  getJoinRequestOrThrow,
  getTeamOrThrow,
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
  const { hackathon, team } = await requireTeamAdminContext(event, hackathonId, request.teamId)

  assertHackathonAllowsTeamFormation(hackathon)
  assertJoinRequestPending(request)

  const liveTeam = await getTeamOrThrow(database, hackathonId, team.id)
  assertTeamOpenToJoinRequests(liveTeam)
  await assertRequestingUserApprovedForHackathon(database, hackathonId, request.userId)
  await assertNoActiveTeamMembershipForHackathon(database, hackathonId, request.userId)
  await assertTeamHasCapacity(database, hackathon, liveTeam.id)

  const reviewedAt = new Date().toISOString()
  const teamMemberId = crypto.randomUUID()

  await database.transaction(async (transaction: AppDatabaseTransaction) => {
    await transaction
      .update(teamJoinRequests)
      .set({
        status: 'approved',
        reviewedAt,
        reviewedByUserId: actor.platformUser.id
      })
      .where(eq(teamJoinRequests.id, request.id))

    await transaction.insert(teamMembers).values({
      id: teamMemberId,
      teamId: liveTeam.id,
      userId: request.userId,
      role: 'member',
      joinedAt: reviewedAt,
      createdAt: reviewedAt
    })
  })

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
