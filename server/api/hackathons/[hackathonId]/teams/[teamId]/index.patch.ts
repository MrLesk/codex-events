import { eq } from 'drizzle-orm'

import { teams } from '../../../../../database/schema'
import { requirePlatformActor } from '../../../../../auth/actor'
import { defineApiHandler } from '../../../../../utils/api-handler'
import { apiData } from '../../../../../utils/api-response'
import {
  assertHackathonAllowsTeamFormation,
  getTeamWithMembersOrThrow,
  requireTeamAdminContext,
  resolveAvailableTeamSlug,
  serializeTeam,
  teamParamsSchema,
  updateTeamBodySchema
} from '../../../../../utils/team-formation'
import { parseValidatedBody, parseValidatedParams } from '../../../../../utils/validation'

export default defineApiHandler(async (event) => {
  await requirePlatformActor(event)
  const { hackathonId, teamId } = parseValidatedParams(event, teamParamsSchema)
  const body = await parseValidatedBody(event, updateTeamBodySchema)
  const { database, hackathon, team } = await requireTeamAdminContext(event, hackathonId, teamId)

  assertHackathonAllowsTeamFormation(hackathon)
  const slug = body.name
    ? await resolveAvailableTeamSlug(database, hackathonId, body.name, {
        excludeTeamId: team.id
      })
    : team.slug

  const updatedAt = new Date().toISOString()

  await database
    .update(teams)
    .set({
      ...body,
      slug,
      updatedAt
    })
    .where(eq(teams.id, team.id))

  const updated = await getTeamWithMembersOrThrow(database, hackathonId, teamId)

  return apiData(serializeTeam({
    ...updated.team,
    updatedAt
  }, {
    activeMemberCount: updated.members.length,
    members: updated.members
  }))
})
