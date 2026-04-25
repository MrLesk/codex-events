import { and, eq } from 'drizzle-orm'

import { requirePlatformActor } from '#server/auth/actor'
import { writeAuditLog } from '#server/database/audit-log'
import { teamJoinRequests, teamMembers, teams } from '#server/database/schema'
import { defineApiHandler } from '#server/utils/api-handler'
import { apiData } from '#server/utils/api-response'
import { ApiError } from '#server/utils/api-error'
import {
  assertLeaveOrRemovalAllowed,
  getActiveTeamMemberOrThrow,
  getActiveTeamMembers,
  getTeamOrThrow,
  requireTeamVisibilityContext,
  teamParamsSchema
} from '#server/utils/team-formation'
import { parseValidatedParams } from '#server/utils/validation'

export default defineApiHandler(async (event) => {
  const actor = await requirePlatformActor(event)
  const { hackathonId, teamId } = parseValidatedParams(event, teamParamsSchema)
  const { database, hackathon } = await requireTeamVisibilityContext(event, hackathonId)
  await getTeamOrThrow(database, hackathonId, teamId)
  const ownMembership = await getActiveTeamMemberOrThrow(database, teamId, actor.platformUser.id).catch(() => null)

  if (!ownMembership) {
    throw new ApiError({
      statusCode: 403,
      code: 'team_member_required',
      message: 'This operation requires active membership in the team.',
      details: {
        hackathonId,
        teamId,
        userId: actor.platformUser.id
      }
    })
  }

  const members = await getActiveTeamMembers(database, teamId)
  const leaveDecision = await assertLeaveOrRemovalAllowed(database, hackathon, members, ownMembership)

  const leftAt = new Date().toISOString()
  const reviewedAt = leftAt

  await database.batch([
    database
      .update(teamMembers)
      .set({
        leftAt
      })
      .where(eq(teamMembers.id, ownMembership.id)),
    ...(leaveDecision.teamDissolved
      ? [
          database
            .update(teams)
            .set({
              isOpenToJoinRequests: false,
              updatedAt: leftAt
            })
            .where(eq(teams.id, teamId)),
          database
            .update(teamJoinRequests)
            .set({
              status: 'rejected',
              reviewedAt,
              reviewedByUserId: actor.platformUser.id
            })
            .where(and(
              eq(teamJoinRequests.teamId, teamId),
              eq(teamJoinRequests.status, 'pending')
            ))
        ]
      : [])
  ])

  await writeAuditLog(database, {
    actorUserId: actor.platformUser.id,
    entityType: 'team_member',
    entityId: ownMembership.id,
    action: 'team_member.left',
    metadata: {
      hackathonId,
      teamId,
      userId: actor.platformUser.id,
      teamDissolved: leaveDecision.teamDissolved
    }
  })

  return apiData({
    id: ownMembership.id,
    teamId,
    userId: actor.platformUser.id,
    leftAt,
    teamDissolved: leaveDecision.teamDissolved
  })
})
