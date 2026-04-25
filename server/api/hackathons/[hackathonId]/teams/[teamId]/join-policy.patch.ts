import { eq } from 'drizzle-orm'

import { teams } from '#server/database/schema'
import { requirePlatformActor } from '#server/auth/actor'
import { defineApiHandler } from '#server/utils/api-handler'
import { apiData } from '#server/utils/api-response'
import {
  assertHackathonAllowsTeamFormation,
  getTeamWithMembersOrThrow,
  requireTeamAdminContext,
  serializeTeam,
  teamParamsSchema,
  updateJoinPolicyBodySchema
} from '#server/utils/team-formation'
import { parseValidatedBody, parseValidatedParams } from '#server/utils/validation'

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
