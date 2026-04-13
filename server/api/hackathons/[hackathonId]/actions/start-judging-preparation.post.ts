import { eq, inArray } from 'drizzle-orm'

import { requirePlatformActor } from '../../../../auth/actor'
import { writeAuditLog } from '../../../../database/audit-log'
import { getDatabase } from '../../../../database/client'
import {
  hackathons,
  judgeAssignments,
  prizeEligibilitySnapshots,
  submissions
} from '../../../../database/schema'
import { defineApiHandler } from '../../../../utils/api-handler'
import { apiData } from '../../../../utils/api-response'
import {
  assertStartJudgingPreparationAllowed,
  buildInitialJudgeAssignments,
  buildPrizeEligibilitySnapshots,
  listAutomaticJudgePoolForHackathon,
  listSubmittedSubmissionsForHackathon
} from '../../../../utils/judging'
import {
  requireHackathonAdmin,
  routeIdParamsSchema,
  serializeHackathon
} from '../../../../utils/hackathon-management'
import { parseValidatedParams } from '../../../../utils/validation'

export default defineApiHandler(async (event) => {
  const actor = await requirePlatformActor(event)
  const { hackathonId } = parseValidatedParams(event, routeIdParamsSchema)
  const database = getDatabase(event)
  const { hackathon } = await requireHackathonAdmin(event, hackathonId)
  const submittedSubmissions = await listSubmittedSubmissionsForHackathon(database, hackathonId)
  const judgePool = await listAutomaticJudgePoolForHackathon(database, hackathonId)

  assertStartJudgingPreparationAllowed(hackathon, {
    submittedSubmissionCount: submittedSubmissions.length,
    judgePoolCount: judgePool.length
  })

  const transitionedAt = new Date().toISOString()
  const assignmentRows = buildInitialJudgeAssignments(
    hackathonId,
    submittedSubmissions,
    judgePool,
    hackathon.blindReviewCount,
    transitionedAt
  )
  const snapshotRows = await buildPrizeEligibilitySnapshots(
    database,
    hackathonId,
    submittedSubmissions.map(submission => submission.teamId),
    transitionedAt
  )

  await database.batch([
    database
      .update(hackathons)
      .set({
        state: 'judging_preparation',
        updatedAt: transitionedAt
      })
      .where(eq(hackathons.id, hackathonId)),
    database
      .update(submissions)
      .set({
        status: 'locked',
        lockedAt: transitionedAt,
        updatedAt: transitionedAt
      })
      .where(inArray(submissions.id, submittedSubmissions.map(submission => submission.id))),
    ...(snapshotRows.length > 0
      ? [database.insert(prizeEligibilitySnapshots).values(snapshotRows)]
      : []),
    ...(assignmentRows.length > 0
      ? [database.insert(judgeAssignments).values(assignmentRows)]
      : [])
  ])

  await writeAuditLog(database, {
    actorUserId: actor.platformUser.id,
    entityType: 'hackathon',
    entityId: hackathonId,
    action: 'hackathon.start_judging_preparation',
    metadata: {
      previousState: hackathon.state,
      nextState: 'judging_preparation',
      lockedSubmissionCount: submittedSubmissions.length,
      createdAssignmentCount: assignmentRows.length,
      createdSnapshotCount: snapshotRows.length
    }
  })

  const updatedHackathon = await database.query.hackathons.findFirst({
    where: eq(hackathons.id, hackathonId)
  })

  return apiData(serializeHackathon(updatedHackathon!))
})
