import { and, eq } from 'drizzle-orm'

import { requirePlatformActor } from '../../../../auth/actor'
import { writeAuditLog } from '../../../../database/audit-log'
import { teamJoinRequests, teamMembers, teams } from '../../../../database/schema'
import { defineApiHandler } from '../../../../utils/api-handler'
import { apiData } from '../../../../utils/api-response'
import { assertGuard } from '../../../../utils/lifecycle-guard'
import {
  assertLeaveOrRemovalAllowed,
  getActiveTeamMemberOrThrow,
  getActiveTeamMembers,
  getOwnActiveTeamMembershipForHackathon,
  getTeamOrThrow,
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
  const { database, hackathon } = await requireTeamFormationApprovedContext(event, hackathonId)
  const now = new Date().toISOString()
  const existingMembership = await getOwnActiveTeamMembershipForHackathon(database, hackathonId, actor.platformUser.id)

  let replacedSoloTeamId: string | null = null
  let replacedSoloMembershipId: string | null = null

  if (!existingMembership) {
    if (body.replaceOwnSoloTeam) {
      assertGuard(false, {
        code: 'solo_team_required',
        message: 'Only an active solo team can be replaced with a new team.',
        details: {
          hackathonId,
          userId: actor.platformUser.id
        },
        statusCode: 409
      })
    }

    await assertNoActiveTeamMembershipForHackathon(database, hackathonId, actor.platformUser.id)
  } else {
    assertGuard(body.replaceOwnSoloTeam, {
      code: 'team_membership_exists',
      message: 'A user can belong to at most one active team per hackathon.',
      details: {
        hackathonId,
        userId: actor.platformUser.id
      },
      statusCode: 409
    })

    assertGuard(body.workspaceMode === 'team', {
      code: 'team_workspace_mode_invalid',
      message: 'Replacing a solo team must create a regular team workspace.',
      details: {
        hackathonId,
        userId: actor.platformUser.id
      },
      statusCode: 400
    })

    const existingTeam = await getTeamOrThrow(database, hackathonId, existingMembership.teamId)
    assertGuard(existingTeam.workspaceMode === 'solo', {
      code: 'solo_team_required',
      message: 'Only an active solo team can be replaced with a new team.',
      details: {
        hackathonId,
        teamId: existingTeam.id,
        userId: actor.platformUser.id
      },
      statusCode: 409
    })

    const existingTeamMembership = await getActiveTeamMemberOrThrow(database, existingTeam.id, actor.platformUser.id)
    assertGuard(existingTeamMembership.role === 'admin', {
      code: 'team_admin_required',
      message: 'Only a solo-team admin can replace the solo team with a new team.',
      details: {
        hackathonId,
        teamId: existingTeam.id,
        userId: actor.platformUser.id
      },
      statusCode: 403
    })

    const existingMembers = await getActiveTeamMembers(database, existingTeam.id)
    const leaveDecision = await assertLeaveOrRemovalAllowed(database, hackathon, existingMembers, existingTeamMembership)

    assertGuard(leaveDecision.teamDissolved, {
      code: 'solo_team_replace_invalid',
      message: 'The active solo team could not be replaced right now.',
      details: {
        hackathonId,
        teamId: existingTeam.id,
        userId: actor.platformUser.id
      },
      statusCode: 409
    })

    replacedSoloTeamId = existingTeam.id
    replacedSoloMembershipId = existingTeamMembership.id
  }

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
    }),
    ...(replacedSoloMembershipId && replacedSoloTeamId
      ? [
          database
            .update(teamMembers)
            .set({
              leftAt: now
            })
            .where(eq(teamMembers.id, replacedSoloMembershipId)),
          database
            .update(teams)
            .set({
              isOpenToJoinRequests: false,
              updatedAt: now
            })
            .where(eq(teams.id, replacedSoloTeamId)),
          database
            .update(teamJoinRequests)
            .set({
              status: 'rejected',
              reviewedAt: now,
              reviewedByUserId: actor.platformUser.id
            })
            .where(and(
              eq(teamJoinRequests.teamId, replacedSoloTeamId),
              eq(teamJoinRequests.status, 'pending')
            ))
        ]
      : [])
  ])

  if (replacedSoloMembershipId && replacedSoloTeamId) {
    await writeAuditLog(database, {
      actorUserId: actor.platformUser.id,
      entityType: 'team_member',
      entityId: replacedSoloMembershipId,
      action: 'team_member.left',
      metadata: {
        hackathonId,
        teamId: replacedSoloTeamId,
        userId: actor.platformUser.id,
        teamDissolved: true,
        replacedByTeamId: teamId
      }
    })
  }

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
