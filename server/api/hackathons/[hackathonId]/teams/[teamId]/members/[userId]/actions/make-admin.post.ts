import { and, eq, isNull } from 'drizzle-orm'

import { requirePlatformActor } from '../../../../../../../../auth/actor'
import { writeAuditLog } from '../../../../../../../../database/audit-log'
import { teamMembers } from '../../../../../../../../database/schema'
import { defineApiHandler } from '../../../../../../../../utils/api-handler'
import { ApiError } from '../../../../../../../../utils/api-error'
import { apiData } from '../../../../../../../../utils/api-response'
import {
  getActiveTeamMemberOrThrow,
  requireTeamAdminContext,
  teamMemberParamsSchema
} from '../../../../../../../../utils/team-formation'
import { parseValidatedParams } from '../../../../../../../../utils/validation'

export default defineApiHandler(async (event) => {
  const actor = await requirePlatformActor(event)
  const { hackathonId, teamId, userId } = parseValidatedParams(event, teamMemberParamsSchema)
  const { database } = await requireTeamAdminContext(event, hackathonId, teamId)

  if (userId === actor.platformUser.id) {
    throw new ApiError({
      statusCode: 403,
      code: 'team_member_self_promotion_forbidden',
      message: 'Team admins cannot use make-admin on their own membership.',
      details: {
        hackathonId,
        teamId,
        userId
      }
    })
  }

  const targetMember = await getActiveTeamMemberOrThrow(database, teamId, userId)

  if (targetMember.role === 'admin') {
    throw new ApiError({
      statusCode: 409,
      code: 'team_member_already_admin',
      message: 'The selected team member is already an admin.',
      details: {
        hackathonId,
        teamId,
        userId
      }
    })
  }

  await database
    .update(teamMembers)
    .set({
      role: 'admin'
    })
    .where(and(
      eq(teamMembers.id, targetMember.id),
      isNull(teamMembers.leftAt)
    ))

  const promotedMember = await getActiveTeamMemberOrThrow(database, teamId, userId)

  await writeAuditLog(database, {
    actorUserId: actor.platformUser.id,
    entityType: 'team_member',
    entityId: promotedMember.id,
    action: 'team_member.promoted_to_admin',
    metadata: {
      hackathonId,
      teamId,
      userId,
      promotedByUserId: actor.platformUser.id
    }
  })

  return apiData({
    id: promotedMember.id,
    teamId,
    userId,
    role: promotedMember.role
  })
})
