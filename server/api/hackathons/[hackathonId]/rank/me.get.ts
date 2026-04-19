import { and, desc, eq } from 'drizzle-orm'

import { requirePlatformActor } from '../../../../auth/actor'
import { getDatabase } from '../../../../database/client'
import { teamMembers, teams } from '../../../../database/schema'
import { defineApiHandler } from '../../../../utils/api-handler'
import { apiData } from '../../../../utils/api-response'
import {
  getVisibleHackathonOrThrow,
  routeIdParamsSchema
} from '../../../../utils/hackathon-management'
import { getTeamCompetitionOutcome } from '../../../../utils/shortlist'
import { parseValidatedParams } from '../../../../utils/validation'

type MembershipRow = {
  teamId: string
  leftAt: string | null
  joinedAt: string
  createdAt: string
}

function toTimestamp(value: string | null | undefined) {
  if (!value) {
    return 0
  }

  const parsed = Date.parse(value)
  return Number.isNaN(parsed) ? 0 : parsed
}

function getMembershipActivityAt(membership: MembershipRow) {
  return membership.leftAt ?? membership.joinedAt ?? membership.createdAt
}

export default defineApiHandler(async (event) => {
  const { hackathonId } = parseValidatedParams(event, routeIdParamsSchema)
  const actor = await requirePlatformActor(event)
  const database = getDatabase(event)

  await getVisibleHackathonOrThrow(event, hackathonId)

  const memberships = await database
    .select({
      teamId: teamMembers.teamId,
      leftAt: teamMembers.leftAt,
      joinedAt: teamMembers.joinedAt,
      createdAt: teamMembers.createdAt
    })
    .from(teamMembers)
    .innerJoin(teams, eq(teams.id, teamMembers.teamId))
    .where(and(
      eq(teamMembers.userId, actor.platformUser.id),
      eq(teams.hackathonId, hackathonId)
    ))
    .orderBy(desc(teamMembers.createdAt))

  const relevantMemberships = (memberships as MembershipRow[]).sort((left: MembershipRow, right: MembershipRow) =>
    toTimestamp(getMembershipActivityAt(right)) - toTimestamp(getMembershipActivityAt(left))
  )
  const primaryMembership = relevantMemberships.find(membership => membership.leftAt === null)
    ?? relevantMemberships[0]

  if (!primaryMembership) {
    return apiData(null)
  }

  const outcome = await getTeamCompetitionOutcome(database, hackathonId, primaryMembership.teamId)

  return apiData(outcome?.rankSummary ?? null)
})
