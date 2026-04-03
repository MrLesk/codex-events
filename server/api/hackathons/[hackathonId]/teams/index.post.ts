import { requirePlatformActor } from '../../../../auth/actor'
import { teams, teamMembers } from '../../../../database/schema'
import { defineApiHandler } from '../../../../utils/api-handler'
import { apiData } from '../../../../utils/api-response'
import {
  assertNoActiveTeamMembershipForHackathon,
  createTeamBodySchema,
  requireTeamFormationApprovedContext,
  resolveAvailableTeamSlug,
  serializeTeam,
  serializeTeamMember
} from '../../../../utils/team-formation'
import { parseValidatedBody, parseValidatedParams } from '../../../../utils/validation'
import { routeIdParamsSchema } from '../../../../utils/hackathon-management'

export default defineApiHandler(async (event) => {
  const actor = await requirePlatformActor(event)
  const { hackathonId } = parseValidatedParams(event, routeIdParamsSchema)
  const body = await parseValidatedBody(event, createTeamBodySchema)
  const { database } = await requireTeamFormationApprovedContext(event, hackathonId)

  await assertNoActiveTeamMembershipForHackathon(database, hackathonId, actor.platformUser.id)
  const slug = await resolveAvailableTeamSlug(database, hackathonId, body.name)

  const now = new Date().toISOString()
  const teamId = crypto.randomUUID()
  const teamMemberId = crypto.randomUUID()

  await database.batch([
    database.insert(teams).values({
      id: teamId,
      hackathonId,
      name: body.name,
      slug,
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
    slug,
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
