import { and, eq, exists } from 'drizzle-orm'

import { requirePlatformActor } from '#server/auth/actor'
import { writeAuditLog } from '#server/database/audit-log'
import { getDatabase } from '#server/database/client'
import { hackathons, judgeAssignments, prizeEligibilitySnapshots, submissions, teams } from '#server/database/schema'
import { defineApiHandler } from '#server/http/api-handler'
import { apiData } from '#server/http/api-response'
import {
  assertStartJudgeReviewAllowed,
  buildInitialJudgeAssignments,
  buildPrizeEligibilitySnapshots,
  chunkRowsForD1,
  listAutomaticJudgePoolForHackathon,
  listSubmittedSubmissionsForHackathon
} from '#server/domains/judging'
import {
  requireHackathonAdmin,
  routeIdParamsSchema,
  serializeHackathon
} from '#server/domains/hackathons'
import { parseValidatedParams } from '#server/http/validation'

export default defineApiHandler(async (event) => {
  const actor = await requirePlatformActor(event)
  const { hackathonId } = parseValidatedParams(event, routeIdParamsSchema)
  const database = getDatabase(event)
  const { hackathon } = await requireHackathonAdmin(event, hackathonId)
  const submittedSubmissions = await listSubmittedSubmissionsForHackathon(database, hackathonId)
  const judgePool = await listAutomaticJudgePoolForHackathon(database, hackathonId)

  assertStartJudgeReviewAllowed(hackathon, {
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
  const snapshotRowChunks = chunkRowsForD1(snapshotRows, 6)
  const assignmentRowChunks = chunkRowsForD1(assignmentRows, 10)

  await database.batch([
    database
      .update(hackathons)
      .set({
        state: 'blind_review',
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
      .where(and(
        eq(submissions.status, 'submitted'),
        exists(
          database
            .select({ id: teams.id })
            .from(teams)
            .where(and(
              eq(teams.id, submissions.teamId),
              eq(teams.hackathonId, hackathonId)
            ))
        )
      )),
    ...snapshotRowChunks.map(rows =>
      database.insert(prizeEligibilitySnapshots).values(rows)
    ),
    ...assignmentRowChunks.map(rows =>
      database.insert(judgeAssignments).values(rows)
    )
  ])

  await writeAuditLog(database, {
    actorUserId: actor.platformUser.id,
    entityType: 'hackathon',
    entityId: hackathonId,
    action: 'hackathon.start_blind_review',
    metadata: {
      previousState: hackathon.state,
      nextState: 'blind_review',
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
