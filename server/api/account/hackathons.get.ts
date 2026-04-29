import { and, desc, eq, exists, getTableColumns, isNull, or } from 'drizzle-orm'

import { requirePlatformActor } from '#server/auth/actor'
import { getDatabase } from '#server/database/client'
import {
  hackathonRoleAssignments,
  hackathons,
  submissions,
  teamMembers,
  teams,
  userApplications
} from '#server/database/schema'
import { defineApiHandler } from '#server/utils/api-handler'
import { apiData } from '#server/utils/api-response'

type UserApplicationRecord = typeof userApplications.$inferSelect
type TeamMembershipRecord = typeof teamMembers.$inferSelect
type TeamRecord = typeof teams.$inferSelect
type SubmissionRecord = typeof submissions.$inferSelect
type HackathonRoleAssignmentRecord = typeof hackathonRoleAssignments.$inferSelect
type HackathonRecord = typeof hackathons.$inferSelect

const pastParticipationStates = new Set<HackathonRecord['state']>([
  'winners_announced',
  'completed'
])

function dedupe<T>(values: T[]) {
  return [...new Set(values)]
}

function sortHackathonsByFreshness(items: HackathonRecord[]) {
  return [...items].sort((left, right) =>
    new Date(right.submissionClosesAt).getTime() - new Date(left.submissionClosesAt).getTime()
  )
}

function isActiveSubmission(record: SubmissionRecord) {
  return record.status === 'draft' || record.status === 'submitted' || record.status === 'locked'
}

function canViewRestrictedHackathonDetails(
  application: UserApplicationRecord | null,
  roles: HackathonRoleAssignmentRecord[],
  isPlatformAdmin: boolean
) {
  return isPlatformAdmin || roles.length > 0 || application?.status === 'approved'
}

function serializeHackathonParticipation(
  hackathon: HackathonRecord,
  application: UserApplicationRecord | null,
  team: TeamRecord | null,
  membership: TeamMembershipRecord | null,
  submission: SubmissionRecord | null,
  roles: HackathonRoleAssignmentRecord[],
  showRestrictedDetails: boolean
) {
  return {
    id: hackathon.id,
    slug: hackathon.slug,
    name: hackathon.name,
    description: hackathon.description,
    state: hackathon.state,
    city: hackathon.city,
    country: hackathon.country,
    address: showRestrictedDetails ? hackathon.address : '',
    bannerImageUrl: hackathon.bannerImageUrl,
    backgroundImageUrl: hackathon.backgroundImageUrl,
    registrationOpensAt: hackathon.registrationOpensAt,
    registrationClosesAt: hackathon.registrationClosesAt,
    submissionOpensAt: hackathon.submissionOpensAt,
    submissionClosesAt: hackathon.submissionClosesAt,
    applicationStatus: application?.status ?? null,
    team: team && membership
      ? {
          id: team.id,
          name: team.name,
          slug: team.slug,
          role: membership.role
        }
      : null,
    submissionStatus: submission?.status ?? null,
    roles: roles.map(record => record.role)
  }
}

export default defineApiHandler(async (event) => {
  const actor = await requirePlatformActor(event)
  const database = getDatabase(event)

  const [
    applications,
    memberships,
    roleAssignments
  ]: [
    UserApplicationRecord[],
    TeamMembershipRecord[],
    HackathonRoleAssignmentRecord[]
  ] = await Promise.all([
    database.query.userApplications.findMany({
      where: eq(userApplications.userId, actor.platformUser.id),
      orderBy: [desc(userApplications.submittedAt)]
    }),
    database.query.teamMembers.findMany({
      where: and(
        eq(teamMembers.userId, actor.platformUser.id),
        isNull(teamMembers.leftAt)
      ),
      orderBy: [desc(teamMembers.joinedAt)]
    }),
    database.query.hackathonRoleAssignments.findMany({
      where: eq(hackathonRoleAssignments.userId, actor.platformUser.id),
      orderBy: [desc(hackathonRoleAssignments.createdAt)]
    })
  ])

  const teamIds: string[] = dedupe(memberships.map(record => record.teamId))
  const teamRecords: TeamRecord[] = teamIds.length > 0
    ? await database
        .select(getTableColumns(teams))
        .from(teams)
        .innerJoin(teamMembers, eq(teamMembers.teamId, teams.id))
        .where(and(
          eq(teamMembers.userId, actor.platformUser.id),
          isNull(teamMembers.leftAt)
        ))
    : []
  const submissionsByTeam: SubmissionRecord[] = teamIds.length > 0
    ? await database
        .select(getTableColumns(submissions))
        .from(submissions)
        .innerJoin(teamMembers, eq(teamMembers.teamId, submissions.teamId))
        .where(and(
          eq(teamMembers.userId, actor.platformUser.id),
          isNull(teamMembers.leftAt)
        ))
        .orderBy(desc(submissions.updatedAt))
    : []

  const hackathonIds: string[] = dedupe([
    ...applications.map(record => record.hackathonId),
    ...teamRecords.map(record => record.hackathonId),
    ...roleAssignments.map(record => record.hackathonId)
  ])

  if (hackathonIds.length === 0) {
    return apiData({
      current: [],
      past: []
    })
  }

  const hackathonRecords: HackathonRecord[] = await database.query.hackathons.findMany({
    where: or(
      exists(
        database
          .select({ id: userApplications.id })
          .from(userApplications)
          .where(and(
            eq(userApplications.hackathonId, hackathons.id),
            eq(userApplications.userId, actor.platformUser.id)
          ))
      ),
      exists(
        database
          .select({ id: teamMembers.id })
          .from(teamMembers)
          .innerJoin(teams, eq(teams.id, teamMembers.teamId))
          .where(and(
            eq(teams.hackathonId, hackathons.id),
            eq(teamMembers.userId, actor.platformUser.id),
            isNull(teamMembers.leftAt)
          ))
      ),
      exists(
        database
          .select({ id: hackathonRoleAssignments.id })
          .from(hackathonRoleAssignments)
          .where(and(
            eq(hackathonRoleAssignments.hackathonId, hackathons.id),
            eq(hackathonRoleAssignments.userId, actor.platformUser.id)
          ))
      )
    )
  })
  const orderedHackathons = sortHackathonsByFreshness(hackathonRecords)
  const applicationByHackathonId = new Map(applications.map(record => [record.hackathonId, record] as const))
  const teamByHackathonId = new Map(teamRecords.map(record => [record.hackathonId, record] as const))
  const membershipByTeamId = new Map(memberships.map(record => [record.teamId, record] as const))
  const submissionByTeamId = new Map<string, SubmissionRecord>()
  const rolesByHackathonId = new Map<string, HackathonRoleAssignmentRecord[]>()

  for (const submission of submissionsByTeam) {
    const current = submissionByTeamId.get(submission.teamId)

    if (!current || (!isActiveSubmission(current) && isActiveSubmission(submission))) {
      submissionByTeamId.set(submission.teamId, submission)
    }
  }

  for (const roleAssignment of roleAssignments) {
    const records = rolesByHackathonId.get(roleAssignment.hackathonId) ?? []
    records.push(roleAssignment)
    rolesByHackathonId.set(roleAssignment.hackathonId, records)
  }

  const payload = orderedHackathons.map((hackathon) => {
    const application = applicationByHackathonId.get(hackathon.id) ?? null
    const team = teamByHackathonId.get(hackathon.id) ?? null
    const membership = team ? membershipByTeamId.get(team.id) ?? null : null
    const submission = team ? submissionByTeamId.get(team.id) ?? null : null
    const relevantRoles = rolesByHackathonId.get(hackathon.id) ?? []
    const showRestrictedDetails = canViewRestrictedHackathonDetails(
      application,
      relevantRoles,
      actor.platformUser.isPlatformAdmin
    )

    return serializeHackathonParticipation(
      hackathon,
      application,
      team,
      membership,
      submission,
      relevantRoles,
      showRestrictedDetails
    )
  })

  return apiData({
    current: payload.filter(item => !pastParticipationStates.has(item.state)),
    past: payload.filter(item => pastParticipationStates.has(item.state))
  })
})
