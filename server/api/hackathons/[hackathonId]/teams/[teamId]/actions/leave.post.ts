import { eq } from 'drizzle-orm'

import { requirePlatformActor } from '../../../../../../auth/actor'
import { writeAuditLog } from '../../../../../../database/audit-log'
import { teamMembers } from '../../../../../../database/schema'
import { defineApiHandler } from '../../../../../../utils/api-handler'
import { apiData } from '../../../../../../utils/api-response'
import { ApiError } from '../../../../../../utils/api-error'
import {
  assertLeaveOrRemovalAllowed,
  getActiveTeamMemberOrThrow,
  getActiveTeamMembers,
  getTeamOrThrow,
  requireTeamVisibilityContext,
  teamParamsSchema
} from '../../../../../../utils/team-formation'
import { parseValidatedParams } from '../../../../../../utils/validation'

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
  assertLeaveOrRemovalAllowed(hackathon, members, ownMembership)

  const leftAt = new Date().toISOString()

  await database
    .update(teamMembers)
    .set({
      leftAt
    })
    .where(eq(teamMembers.id, ownMembership.id))

  await writeAuditLog(database, {
    actorUserId: actor.platformUser.id,
    entityType: 'team_member',
    entityId: ownMembership.id,
    action: 'team_member.left',
    metadata: {
      hackathonId,
      teamId,
      userId: actor.platformUser.id
    }
  })

  return apiData({
    id: ownMembership.id,
    teamId,
    userId: actor.platformUser.id,
    leftAt
  })
})
