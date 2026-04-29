import { eq } from 'drizzle-orm'

import { teams } from '#server/database/schema'
import { requirePlatformActor } from '#server/auth/actor'
import { defineApiHandler } from '#server/http/api-handler'
import { apiData } from '#server/http/api-response'
import {
  assertHackathonAllowsTeamFormation,
  getTeamWithMembersOrThrow,
  requireTeamAdminContext,
  resolveAvailableTeamSlug,
  serializeTeam,
  teamParamsSchema,
  updateTeamBodySchema
} from '#server/utils/team-formation'
import { parseValidatedBody, parseValidatedParams } from '#server/http/validation'

export default defineApiHandler(async (event) => {
  await requirePlatformActor(event)
  const { hackathonId, teamId } = parseValidatedParams(event, teamParamsSchema)
  const body = await parseValidatedBody(event, updateTeamBodySchema)
  const { database, hackathon, team } = await requireTeamAdminContext(event, hackathonId, teamId)

  assertHackathonAllowsTeamFormation(hackathon)
  const updatedAt = new Date().toISOString()
  const nextSlug = body.name !== undefined && body.name !== team.name
    ? await resolveAvailableTeamSlug(database, hackathonId, body.name)
    : undefined

  await database
    .update(teams)
    .set({
      ...(body.name !== undefined
        ? {
            name: body.name
          }
        : {}),
      ...(nextSlug !== undefined
        ? {
            slug: nextSlug
          }
        : {}),
      ...(body.bio !== undefined
        ? {
            bio: body.bio || null
          }
        : {}),
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
