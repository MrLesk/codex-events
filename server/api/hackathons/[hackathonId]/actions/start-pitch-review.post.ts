import { eq } from 'drizzle-orm'

import { requirePlatformActor } from '#server/auth/actor'
import { writeAuditLog } from '#server/database/audit-log'
import { getDatabase } from '#server/database/client'
import { hackathons, judgeAssignments } from '#server/database/schema'
import { defineApiHandler } from '#server/utils/api-handler'
import { apiData } from '#server/utils/api-response'
import {
  assertStartPitchReviewAllowed,
  buildPitchReviewAssignments,
  chunkRowsForD1,
  listAutomaticJudgePoolForHackathon,
  listLockedSubmissionsForHackathon,
  selectPitchReviewSubmissions
} from '#server/utils/judging'
import {
  requireHackathonAdmin,
  routeIdParamsSchema,
  serializeHackathon
} from '#server/utils/hackathon-management'
import { parseValidatedParams } from '#server/utils/validation'

export default defineApiHandler(async (event) => {
  const actor = await requirePlatformActor(event)
  const { hackathonId } = parseValidatedParams(event, routeIdParamsSchema)
  const database = getDatabase(event)
  const { hackathon } = await requireHackathonAdmin(event, hackathonId)
  const [lockedSubmissions, judgePanel] = await Promise.all([
    listLockedSubmissionsForHackathon(database, hackathonId),
    listAutomaticJudgePoolForHackathon(database, hackathonId)
  ])
  const finalistSubmissions = selectPitchReviewSubmissions(hackathon, lockedSubmissions)

  assertStartPitchReviewAllowed(hackathon, {
    lockedSubmissionCount: lockedSubmissions.length,
    finalistSubmissionCount: finalistSubmissions.length,
    judgePanelCount: judgePanel.length
  })

  const transitionedAt = new Date().toISOString()
  const assignmentRows = buildPitchReviewAssignments(
    hackathonId,
    finalistSubmissions,
    judgePanel,
    transitionedAt
  )
  const assignmentRowChunks = chunkRowsForD1(assignmentRows, 12)

  await database.batch([
    database
      .update(hackathons)
      .set({
        state: 'pitch_review',
        updatedAt: transitionedAt
      })
      .where(eq(hackathons.id, hackathonId)),
    ...assignmentRowChunks.map(rows =>
      database.insert(judgeAssignments).values(rows)
    )
  ])

  await writeAuditLog(database, {
    actorUserId: actor.platformUser.id,
    entityType: 'hackathon',
    entityId: hackathonId,
    action: 'hackathon.start_pitch_review',
    metadata: {
      previousState: hackathon.state,
      nextState: 'pitch_review',
      finalistSubmissionCount: finalistSubmissions.length,
      judgePanelCount: judgePanel.length,
      createdAssignmentCount: assignmentRows.length
    }
  })

  const updatedHackathon = await database.query.hackathons.findFirst({
    where: eq(hackathons.id, hackathonId)
  })

  return apiData(serializeHackathon(updatedHackathon!))
})
