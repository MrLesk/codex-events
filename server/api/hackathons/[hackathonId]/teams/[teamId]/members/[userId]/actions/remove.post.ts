import { eq } from 'drizzle-orm'

import { requirePlatformActor } from '../../../../../../../../auth/actor'
import { writeAuditLog } from '../../../../../../../../database/audit-log'
import { teamMembers } from '../../../../../../../../database/schema'
import { defineApiHandler } from '../../../../../../../../utils/api-handler'
import { apiData } from '../../../../../../../../utils/api-response'
import {
  assertLeaveOrRemovalAllowed,
  getActiveTeamMemberOrThrow,
  getActiveTeamMembers,
  requireTeamAdminContext,
  teamMemberParamsSchema
} from '../../../../../../../../utils/team-formation'
import { parseValidatedParams } from '../../../../../../../../utils/validation'

export default defineApiHandler(async (event) => {
  const actor = await requirePlatformActor(event)
  const { hackathonId, teamId, userId } = parseValidatedParams(event, teamMemberParamsSchema)
  const { database, hackathon } = await requireTeamAdminContext(event, hackathonId, teamId)
  const targetMember = await getActiveTeamMemberOrThrow(database, teamId, userId)
  const members = await getActiveTeamMembers(database, teamId)

  assertLeaveOrRemovalAllowed(hackathon, members, targetMember)

  const leftAt = new Date().toISOString()

  await database
    .update(teamMembers)
    .set({
      leftAt
    })
    .where(eq(teamMembers.id, targetMember.id))

  await writeAuditLog(database, {
    actorUserId: actor.platformUser.id,
    entityType: 'team_member',
    entityId: targetMember.id,
    action: 'team_member.removed',
    metadata: {
      hackathonId,
      teamId,
      userId,
      removedByUserId: actor.platformUser.id
    }
  })

  return apiData({
    id: targetMember.id,
    teamId,
    userId,
    leftAt
  })
})
