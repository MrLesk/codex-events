import type { H3Event } from 'h3'

import { and, desc, eq, exists, getTableColumns, isNull, or } from 'drizzle-orm'
import { alias } from 'drizzle-orm/sqlite-core'

import { requirePlatformActor } from '#server/auth/actor'
import { getDatabase } from '#server/database/client'
import {
  hackathons,
  submissions,
  teamMembers,
  teams,
  userApplications
} from '#server/database/schema'
import { parseHackathonAgendaItems } from '#server/domains/hackathons'
import { getTeamCompetitionOutcome } from './shortlist'
import { serializeSubmission } from '#server/domains/submissions'

type HackathonRecord = typeof hackathons.$inferSelect
type ApplicationRecord = typeof userApplications.$inferSelect
type TeamRecord = typeof teams.$inferSelect
type TeamMemberRecord = typeof teamMembers.$inferSelect
type SubmissionRecord = typeof submissions.$inferSelect

const pastParticipationStates = new Set<HackathonRecord['state']>([
  'winners_announced',
  'completed'
])
const outcomeVisibleStates = new Set<HackathonRecord['state']>([
  'pitch',
  'pitch_review',
  'final_deliberation',
  'winners_announced',
  'completed'
])

function toTimestamp(value: string | null | undefined) {
  if (!value) {
    return 0
  }

  const parsed = Date.parse(value)
  return Number.isNaN(parsed) ? 0 : parsed
}

function getMembershipActivityAt(membership: TeamMemberRecord) {
  return membership.leftAt ?? membership.joinedAt ?? membership.createdAt
}

function sortByRecentTimestampDesc(left: string | null | undefined, right: string | null | undefined) {
  return toTimestamp(right) - toTimestamp(left)
}

function getHackathonStartsAt(hackathon: HackathonRecord) {
  const agendaItems = parseHackathonAgendaItems(hackathon.agendaItemsJson)
  let earliestStartAt = hackathon.submissionOpensAt
  let earliestStartAtTimestamp = Date.parse(earliestStartAt)

  for (const item of agendaItems) {
    const agendaItemStartsAtTimestamp = Date.parse(item.startsAt)

    if (Number.isNaN(agendaItemStartsAtTimestamp) || agendaItemStartsAtTimestamp >= earliestStartAtTimestamp) {
      continue
    }

    earliestStartAt = item.startsAt
    earliestStartAtTimestamp = agendaItemStartsAtTimestamp
  }

  return earliestStartAt
}

function serializeHackathonSummary(hackathon: HackathonRecord) {
  return {
    id: hackathon.id,
    name: hackathon.name,
    slug: hackathon.slug,
    city: hackathon.city,
    country: hackathon.country,
    state: hackathon.state,
    startsAt: getHackathonStartsAt(hackathon),
    registrationOpensAt: hackathon.registrationOpensAt,
    registrationClosesAt: hackathon.registrationClosesAt,
    submissionClosesAt: hackathon.submissionClosesAt
  }
}

function serializeApplicationSummary(application: ApplicationRecord) {
  return {
    id: application.id,
    status: application.status,
    submittedAt: application.submittedAt,
    withdrawnAt: application.withdrawnAt,
    reviewedAt: application.reviewedAt,
    updatedAt: application.updatedAt
  }
}

function serializeParticipationTeam(
  team: TeamRecord,
  membership: TeamMemberRecord,
  activeMemberCount: number
) {
  return {
    id: team.id,
    name: team.name,
    slug: team.slug,
    membershipRole: membership.role,
    joinedAt: membership.joinedAt,
    leftAt: membership.leftAt,
    isActiveMembership: membership.leftAt === null,
    activeMemberCount
  }
}

function serializeParticipationOutcome(outcome: Awaited<ReturnType<typeof getTeamCompetitionOutcome>>) {
  if (!outcome) {
    return null
  }

  return {
    isShortlisted: outcome.isShortlisted,
    isWinner: outcome.isWinner,
    finalRank: outcome.finalRank,
    rankedTeamCount: outcome.rankedTeamCount,
    prizes: outcome.prizes.map(prize => ({
      id: prize.id,
      name: prize.name
    }))
  }
}

export async function listOwnHackathonParticipation(event: H3Event) {
  const actor = await requirePlatformActor(event)
  const database = getDatabase(event)
  const userId = actor.platformUser.id

  const [applicationsResult, membershipsResult] = await Promise.all([
    database.query.userApplications.findMany({
      where: eq(userApplications.userId, userId),
      orderBy: [desc(userApplications.submittedAt)]
    }),
    database.query.teamMembers.findMany({
      where: eq(teamMembers.userId, userId),
      orderBy: [desc(teamMembers.createdAt)]
    })
  ])
  const applications = applicationsResult as ApplicationRecord[]
  const memberships = membershipsResult as TeamMemberRecord[]

  if (applications.length === 0 && memberships.length === 0) {
    return {
      current: [],
      past: []
    }
  }

  const teamIds = [...new Set(memberships.map((membership: TeamMemberRecord) => membership.teamId))]
  let relatedTeams: TeamRecord[] = []

  if (teamIds.length > 0) {
    relatedTeams = await database
      .select(getTableColumns(teams))
      .from(teams)
      .innerJoin(teamMembers, eq(teamMembers.teamId, teams.id))
      .where(eq(teamMembers.userId, userId)) as TeamRecord[]
  }

  const teamsById = new Map(relatedTeams.map((team: TeamRecord) => [team.id, team]))

  const hackathonIds = [...new Set([
    ...applications.map((application: ApplicationRecord) => application.hackathonId),
    ...relatedTeams.map((team: TeamRecord) => team.hackathonId)
  ])]

  if (hackathonIds.length === 0) {
    return {
      current: [],
      past: []
    }
  }

  const relatedHackathons = await database.query.hackathons.findMany({
    where: or(
      exists(
        database
          .select({ id: userApplications.id })
          .from(userApplications)
          .where(and(
            eq(userApplications.hackathonId, hackathons.id),
            eq(userApplications.userId, userId)
          ))
      ),
      exists(
        database
          .select({ id: teamMembers.id })
          .from(teamMembers)
          .innerJoin(teams, eq(teams.id, teamMembers.teamId))
          .where(and(
            eq(teams.hackathonId, hackathons.id),
            eq(teamMembers.userId, userId)
          ))
      )
    ),
    orderBy: [desc(hackathons.createdAt)]
  }) as HackathonRecord[]

  let activeTeamMembers: TeamMemberRecord[] = []
  let teamSubmissions: SubmissionRecord[] = []

  if (teamIds.length > 0) {
    const ownTeamMembers = alias(teamMembers, 'own_team_members')
    const [activeTeamMembersResult, teamSubmissionsResult] = await Promise.all([
      database
        .select(getTableColumns(teamMembers))
        .from(teamMembers)
        .innerJoin(ownTeamMembers, eq(ownTeamMembers.teamId, teamMembers.teamId))
        .where(and(
          eq(ownTeamMembers.userId, userId),
          isNull(teamMembers.leftAt)
        )),
      database
        .select(getTableColumns(submissions))
        .from(submissions)
        .innerJoin(ownTeamMembers, eq(ownTeamMembers.teamId, submissions.teamId))
        .where(eq(ownTeamMembers.userId, userId))
        .orderBy(desc(submissions.createdAt))
    ])

    activeTeamMembers = activeTeamMembersResult as TeamMemberRecord[]
    teamSubmissions = teamSubmissionsResult as SubmissionRecord[]
  }

  const activeMemberCountByTeamId = new Map<string, number>()

  for (const member of activeTeamMembers) {
    activeMemberCountByTeamId.set(
      member.teamId,
      (activeMemberCountByTeamId.get(member.teamId) ?? 0) + 1
    )
  }

  const latestSubmissionByTeamId = new Map<string, SubmissionRecord>()

  for (const submission of teamSubmissions) {
    if (!latestSubmissionByTeamId.has(submission.teamId)) {
      latestSubmissionByTeamId.set(submission.teamId, submission)
    }
  }

  const applicationByHackathonId = new Map(
    applications.map((application: ApplicationRecord) => [application.hackathonId, application] as const)
  )
  const membershipEntriesByHackathonId = new Map<string, Array<{
    membership: TeamMemberRecord
    team: TeamRecord
  }>>()

  for (const membership of memberships) {
    const relatedTeam = teamsById.get(membership.teamId)

    if (!relatedTeam) {
      continue
    }

    const entries = membershipEntriesByHackathonId.get(relatedTeam.hackathonId) ?? []

    entries.push({
      membership,
      team: relatedTeam
    })
    membershipEntriesByHackathonId.set(relatedTeam.hackathonId, entries)
  }

  const participationRecords = (await Promise.all(relatedHackathons
    .map(async (hackathon: HackathonRecord) => {
      const application = applicationByHackathonId.get(hackathon.id) ?? null
      const membershipEntries = (membershipEntriesByHackathonId.get(hackathon.id) ?? [])
        .sort((left, right) =>
          sortByRecentTimestampDesc(getMembershipActivityAt(left.membership), getMembershipActivityAt(right.membership))
        )
      const activeMembershipEntry = membershipEntries.find(entry => entry.membership.leftAt === null) ?? null
      const latestMembershipEntry = activeMembershipEntry ?? membershipEntries[0] ?? null
      const primaryTeamId = activeMembershipEntry?.team.id ?? latestMembershipEntry?.team.id ?? null
      const latestSubmission = primaryTeamId
        ? latestSubmissionByTeamId.get(primaryTeamId) ?? null
        : null
      const outcome = primaryTeamId && outcomeVisibleStates.has(hackathon.state)
        ? await getTeamCompetitionOutcome(database, hackathon.id, primaryTeamId)
        : null

      if (!application && !latestMembershipEntry) {
        return null
      }

      const activeTeam = activeMembershipEntry
        ? serializeParticipationTeam(
            activeMembershipEntry.team,
            activeMembershipEntry.membership,
            activeMemberCountByTeamId.get(activeMembershipEntry.team.id) ?? 0
          )
        : null
      const latestTeam = latestMembershipEntry
        ? serializeParticipationTeam(
            latestMembershipEntry.team,
            latestMembershipEntry.membership,
            activeMemberCountByTeamId.get(latestMembershipEntry.team.id) ?? 0
          )
        : null
      const activityTimestamps = [
        application?.updatedAt ?? null,
        latestSubmission?.updatedAt ?? null,
        activeMembershipEntry ? getMembershipActivityAt(activeMembershipEntry.membership) : null,
        latestMembershipEntry ? getMembershipActivityAt(latestMembershipEntry.membership) : null,
        hackathon.updatedAt
      ]
        .filter((value): value is string => Boolean(value))
        .sort((left, right) => sortByRecentTimestampDesc(left, right))

      return {
        hackathon: serializeHackathonSummary(hackathon),
        isPast: pastParticipationStates.has(hackathon.state),
        lastActivityAt: activityTimestamps[0] ?? hackathon.updatedAt,
        application: application ? serializeApplicationSummary(application) : null,
        activeTeam,
        latestTeam,
        latestSubmission: latestSubmission ? serializeSubmission(latestSubmission) : null,
        outcome: serializeParticipationOutcome(outcome)
      }
    })))
    .filter((record): record is NonNullable<typeof record> => Boolean(record))
    .sort((left, right) => sortByRecentTimestampDesc(left.lastActivityAt, right.lastActivityAt))

  return {
    current: participationRecords.filter(record => !record.isPast),
    past: participationRecords.filter(record => record.isPast)
  }
}
