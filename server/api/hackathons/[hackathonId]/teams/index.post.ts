import { requirePlatformActor } from '#server/auth/actor'
import { teamMembers, teams } from '#server/database/schema'
import { defineApiHandler } from '#server/http/api-handler'
import { apiData } from '#server/http/api-response'
import {
  assertNoActiveTeamMembershipForHackathon,
  createTeamBodySchema,
  requireTeamFormationApprovedContext,
  resolveAvailableTeamSlug,
  serializeTeam,
  serializeTeamMember
} from '#server/utils/team-formation'
import { parseValidatedBody, parseValidatedParams } from '#server/http/validation'
import { routeIdParamsSchema } from '#server/domains/hackathons'

export default defineApiHandler(async (event) => {
  const actor = await requirePlatformActor(event)
  const { hackathonId } = parseValidatedParams(event, routeIdParamsSchema)
  const body = await parseValidatedBody(event, createTeamBodySchema)
  const { database } = await requireTeamFormationApprovedContext(event, hackathonId)
  const now = new Date().toISOString()
  await assertNoActiveTeamMembershipForHackathon(database, hackathonId, actor.platformUser.id)

  const slug = await resolveAvailableTeamSlug(database, hackathonId, body.name)
  const teamId = crypto.randomUUID()
  const teamMemberId = crypto.randomUUID()

  await database.batch([
    database.insert(teams).values({
      id: teamId,
      hackathonId,
      name: body.name,
      bio: body.bio || null,
      slug,
      workspaceMode: body.workspaceMode,
      isOpenToJoinRequests: body.isOpenToJoinRequests,
      createdByUserId: actor.platformUser.id,
      createdAt: now,
      updatedAt: now
    }),
    database.insert(teamMembers).values({
      id: teamMemberId,
      teamId,
      userId: actor.platformUser.id,
      role: 'admin',
      joinedAt: now,
      createdAt: now
    })
  ])

  return apiData(serializeTeam({
    id: teamId,
    hackathonId,
    name: body.name,
    bio: body.bio || null,
    slug,
    workspaceMode: body.workspaceMode,
    isOpenToJoinRequests: body.isOpenToJoinRequests,
    createdByUserId: actor.platformUser.id,
    createdAt: now,
    updatedAt: now
  }, {
    activeMemberCount: 1,
    members: [
      serializeTeamMember({
        id: teamMemberId,
        teamId,
        userId: actor.platformUser.id,
        role: 'admin',
        joinedAt: now,
        leftAt: null,
        createdAt: now
      }, actor.platformUser)
    ]
  }))
})
