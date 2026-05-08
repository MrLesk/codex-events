import { eq } from 'drizzle-orm'

import { writeAuditLog } from '#server/database/audit-log'
import { judgeAssignments } from '#server/database/schema'
import { defineApiHandler } from '#server/http/api-handler'
import { apiData } from '#server/http/api-response'
import {
  assertAssignmentReviewStageIsActive,
  assertJudgeAssignmentStatus,
  getJudgeAssignmentDetail,
  judgingAssignmentParamsSchema,
  requireJudgeAssignmentContext
} from '#server/domains/judging'
import { parseValidatedParams } from '#server/http/validation'

export default defineApiHandler(async (h3Event) => {
  const { eventId, assignmentId } = parseValidatedParams(h3Event, judgingAssignmentParamsSchema)
  const { actor, database, event, assignment } = await requireJudgeAssignmentContext(h3Event, eventId, assignmentId)

  assertAssignmentReviewStageIsActive(event, assignment)
  assertJudgeAssignmentStatus(
    assignment,
    ['assigned'],
    'Only assigned judge assignments can be started.'
  )

  const startedAt = new Date().toISOString()

  await database
    .update(judgeAssignments)
    .set({
      status: 'judge_started',
      startedAt
    })
    .where(eq(judgeAssignments.id, assignment.id))

  await writeAuditLog(database, {
    actorUserId: actor.platformUser.id,
    entityType: 'judge_assignment',
    entityId: assignment.id,
    action: 'judge_assignment.review_started',
    metadata: {
      eventId,
      submissionId: assignment.submissionId,
      previousStatus: assignment.status,
      nextStatus: 'judge_started',
      reviewStage: assignment.reviewStage
    }
  })

  return apiData(await getJudgeAssignmentDetail(database, {
    ...assignment,
    status: 'judge_started',
    startedAt
  }))
})
