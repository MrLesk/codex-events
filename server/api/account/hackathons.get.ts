import { and, desc, eq, inArray, isNull } from 'drizzle-orm'

import { requirePlatformActor } from '../../auth/actor'
import { getDatabase } from '../../database/client'
import {
  hackathonRoleAssignments,
  hackathons,
  submissions,
  teamMembers,
  teams,
  userApplications
} from '../../database/schema'
import { defineApiHandler } from '../../utils/api-handler'
import { apiData } from '../../utils/api-response'

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

function pickSubmissionForTeam(teamId: string, records: SubmissionRecord[]) {
  const activeSubmission = records.find(record =>
    record.teamId === teamId
    && (record.status === 'draft' || record.status === 'submitted' || record.status === 'locked')
  )

  if (activeSubmission) {
    return activeSubmission
  }

  return records.find(record => record.teamId === teamId) ?? null
}

function serializeHackathonParticipation(
  hackathon: HackathonRecord,
  application: UserApplicationRecord | null,
  team: TeamRecord | null,
  membership: TeamMembershipRecord | null,
  submission: SubmissionRecord | null,
  roles: HackathonRoleAssignmentRecord[]
) {
  return {
    id: hackathon.id,
    slug: hackathon.slug,
    name: hackathon.name,
    description: hackathon.description,
    state: hackathon.state,
    city: hackathon.city,
    address: hackathon.address,
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
    ? await database.query.teams.findMany({
        where: inArray(teams.id, teamIds)
      })
    : []
  const submissionsByTeam: SubmissionRecord[] = teamIds.length > 0
    ? await database.query.submissions.findMany({
        where: inArray(submissions.teamId, teamIds),
        orderBy: [desc(submissions.updatedAt)]
      })
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
    where: inArray(hackathons.id, hackathonIds)
  })
  const orderedHackathons = sortHackathonsByFreshness(hackathonRecords)

  const payload = orderedHackathons.map((hackathon) => {
    const application = applications.find(record => record.hackathonId === hackathon.id) ?? null
    const team = teamRecords.find(record => record.hackathonId === hackathon.id) ?? null
    const membership = team
      ? memberships.find(record => record.teamId === team.id) ?? null
      : null
    const submission = team
      ? pickSubmissionForTeam(team.id, submissionsByTeam)
      : null
    const relevantRoles = roleAssignments.filter(record => record.hackathonId === hackathon.id)

    return serializeHackathonParticipation(
      hackathon,
      application,
      team,
      membership,
      submission,
      relevantRoles
    )
  })

  return apiData({
    current: payload.filter(item => !pastParticipationStates.has(item.state)),
    past: payload.filter(item => pastParticipationStates.has(item.state))
  })
})
