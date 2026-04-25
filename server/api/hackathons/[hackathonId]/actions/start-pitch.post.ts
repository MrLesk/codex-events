import { and, asc, eq, inArray, isNull } from 'drizzle-orm'

import { requirePlatformActor } from '#server/auth/actor'
import { writeAuditLog } from '#server/database/audit-log'
import { getDatabase } from '#server/database/client'
import { hackathons, prizeEligibilitySnapshots, submissions, teamMembers, teams, users } from '#server/database/schema'
import { defineApiHandler } from '#server/utils/api-handler'
import { apiData } from '#server/utils/api-response'
import {
  buildHackathonOutcomeEmailQueueMessage,
  enqueueHackathonOutcomeEmailMessage
} from '#server/utils/hackathon-outcome-email-queue'
import { hasSavedShortlistSelection } from '#server/utils/shortlist'
import {
  assertStartPitchAllowed,
  buildPrizeEligibilitySnapshots,
  listSubmittedSubmissionsForHackathon,
  listLockedSubmissionsForHackathon,
  selectPitchReviewSubmissions
} from '#server/utils/judging'
import {
  requireHackathonAdmin,
  routeIdParamsSchema,
  serializeHackathon
} from '#server/utils/hackathon-management'
import { parseValidatedParams } from '#server/utils/validation'

type TeamRecord = typeof teams.$inferSelect
type TeamMemberRecord = typeof teamMembers.$inferSelect
type UserRecord = typeof users.$inferSelect

export default defineApiHandler(async (event) => {
  const actor = await requirePlatformActor(event)
  const { hackathonId } = parseValidatedParams(event, routeIdParamsSchema)
  const database = getDatabase(event)
  const { hackathon } = await requireHackathonAdmin(event, hackathonId)
  const lockedSubmissions = await listLockedSubmissionsForHackathon(database, hackathonId)
  const submittedSubmissions = hackathon.blindReviewCount === 0 && hackathon.state === 'judging_preparation'
    ? await listSubmittedSubmissionsForHackathon(database, hackathonId)
    : []
  const shortlistSelectionSaved = hackathon.blindReviewCount > 0 && hackathon.state === 'shortlist'
    ? hasSavedShortlistSelection(hackathon)
    : true
  const finalistSubmissions = hackathon.blindReviewCount === 0 && hackathon.state === 'judging_preparation'
    ? submittedSubmissions
    : shortlistSelectionSaved
      ? selectPitchReviewSubmissions(hackathon, lockedSubmissions)
      : []

  assertStartPitchAllowed(hackathon, {
    competitionSubmissionCount: hackathon.blindReviewCount === 0 ? submittedSubmissions.length : lockedSubmissions.length,
    finalistSubmissionCount: finalistSubmissions.length
  })

  const transitionedAt = new Date().toISOString()
  const pitchOnlySnapshotRows = hackathon.blindReviewCount === 0 && submittedSubmissions.length > 0
    ? await buildPrizeEligibilitySnapshots(
        database,
        hackathonId,
        submittedSubmissions.map(submission => submission.teamId),
        transitionedAt
      )
    : []

  await database.batch([
    database
      .update(hackathons)
      .set({
        pitchFinalistSubmissionIdsJson: JSON.stringify(finalistSubmissions.map(submission => submission.id)),
        activePitchPresentationSubmissionId: null,
        pitchPresentationsCompletedAt: null,
        state: 'pitch',
        updatedAt: transitionedAt
      })
      .where(eq(hackathons.id, hackathonId)),
    ...(hackathon.blindReviewCount === 0 && submittedSubmissions.length > 0
      ? [
          database
            .update(submissions)
            .set({
              status: 'locked',
              lockedAt: transitionedAt,
              updatedAt: transitionedAt
            })
            .where(inArray(submissions.id, submittedSubmissions.map(submission => submission.id)))
        ]
      : []),
    ...(pitchOnlySnapshotRows.length > 0
      ? [database.insert(prizeEligibilitySnapshots).values(pitchOnlySnapshotRows)]
      : [])
  ])

  await writeAuditLog(database, {
    actorUserId: actor.platformUser.id,
    entityType: 'hackathon',
    entityId: hackathonId,
    action: 'hackathon.start_pitch',
    metadata: {
      previousState: hackathon.state,
      nextState: 'pitch',
      lockedSubmissionCount: hackathon.blindReviewCount === 0 ? submittedSubmissions.length : lockedSubmissions.length,
      finalistSubmissionCount: finalistSubmissions.length,
      createdSnapshotCount: pitchOnlySnapshotRows.length
    }
  })

  if (hackathon.state === 'shortlist' && finalistSubmissions.length > 0) {
    const finalistTeamIds = [...new Set(finalistSubmissions.map(submission => submission.teamId))]
    const [finalistTeamsResult, finalistMembersResult] = await Promise.all([
      database.query.teams.findMany({
        where: inArray(teams.id, finalistTeamIds),
        orderBy: [asc(teams.createdAt), asc(teams.name)]
      }),
      database.query.teamMembers.findMany({
        where: and(
          inArray(teamMembers.teamId, finalistTeamIds),
          isNull(teamMembers.leftAt)
        ),
        orderBy: [asc(teamMembers.joinedAt), asc(teamMembers.createdAt)]
      })
    ])
    const finalistTeams = finalistTeamsResult as TeamRecord[]
    const finalistMembers = finalistMembersResult as TeamMemberRecord[]
    const finalistUserIds = [...new Set(finalistMembers.map((member: TeamMemberRecord) => member.userId))]
    const finalistUsersResult = finalistUserIds.length === 0
      ? []
      : await database.query.users.findMany({
          where: inArray(users.id, finalistUserIds)
        })
    const finalistUsers = finalistUsersResult as UserRecord[]
    const teamsById = new Map(finalistTeams.map((team: TeamRecord) => [team.id, team] as const))
    const usersById = new Map(finalistUsers.map((user: UserRecord) => [user.id, user] as const))

    for (const member of finalistMembers) {
      const team = teamsById.get(member.teamId)

      if (!team) {
        continue
      }

      const recipient = usersById.get(member.userId)
      const enqueueResult = await enqueueHackathonOutcomeEmailMessage(
        event,
        buildHackathonOutcomeEmailQueueMessage({
          notificationType: 'shortlist',
          hackathonId,
          hackathonName: hackathon.name,
          hackathonSlug: hackathon.slug,
          teamId: team.id,
          teamName: team.name,
          recipientUserId: member.userId,
          recipientEmail: recipient?.email ?? null,
          recipientDisplayName: recipient?.displayName ?? null,
          announcedAt: transitionedAt
        })
      )

      await writeAuditLog(database, {
        actorUserId: actor.platformUser.id,
        entityType: 'hackathon',
        entityId: hackathonId,
        action: 'hackathon.shortlist_email_enqueued',
        metadata: {
          trigger: 'start_pitch',
          teamId: team.id,
          userId: member.userId,
          enqueue: enqueueResult
        }
      })
    }
  }

  const updatedHackathon = await database.query.hackathons.findFirst({
    where: eq(hackathons.id, hackathonId)
  })

  return apiData(serializeHackathon(updatedHackathon!))
})
