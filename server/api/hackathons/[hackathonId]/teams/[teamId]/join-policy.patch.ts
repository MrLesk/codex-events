import { eq } from 'drizzle-orm'

import { teams } from '../../../../../database/schema'
import { requirePlatformActor } from '../../../../../auth/actor'
import { defineApiHandler } from '../../../../../utils/api-handler'
import { apiData } from '../../../../../utils/api-response'
import {
  assertHackathonAllowsTeamFormation,
  getTeamWithMembersOrThrow,
  requireTeamAdminContext,
  serializeTeam,
  teamParamsSchema,
  updateJoinPolicyBodySchema
} from '../../../../../utils/team-formation'
import { parseValidatedBody, parseValidatedParams } from '../../../../../utils/validation'

export default defineApiHandler(async (event) => {
  await requirePlatformActor(event)
  const { hackathonId, teamId } = parseValidatedParams(event, teamParamsSchema)
  const body = await parseValidatedBody(event, updateJoinPolicyBodySchema)
  const { database, hackathon, team } = await requireTeamAdminContext(event, hackathonId, teamId)

  assertHackathonAllowsTeamFormation(hackathon)

  const updatedAt = new Date().toISOString()

  await database
    .update(teams)
    .set({
      isOpenToJoinRequests: body.isOpenToJoinRequests,
      updatedAt
    })
    .where(eq(teams.id, team.id))

  const updated = await getTeamWithMembersOrThrow(database, hackathonId, teamId)

  return apiData(serializeTeam({
    ...updated.team,
    isOpenToJoinRequests: body.isOpenToJoinRequests,
    updatedAt
  }, {
    activeMemberCount: updated.members.length,
    members: updated.members
  }))
})
