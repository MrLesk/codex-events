import { eq } from 'drizzle-orm'

import { writeAuditLog } from '#server/database/audit-log'
import { judgeAssignments } from '#server/database/schema'
import { defineApiHandler } from '#server/http/api-handler'
import { apiData } from '#server/http/api-response'
import {
  assertJudgeAssignmentStatus,
  assertJudgeReviewLifecycleState,
  buildReplacementAssignment,
  getBlindAssignmentDetail,
  getJudgeAssignmentOrThrow,
  judgingAssignmentParamsSchema,
  pickReplacementJudgeUserId,
  reassignJudgeAssignmentBodySchema,
  requireAdminAssignmentContext
} from '#server/domains/judging'
import { parseValidatedBody, parseValidatedParams } from '#server/http/validation'

export default defineApiHandler(async (h3Event) => {
  const { eventId, assignmentId } = parseValidatedParams(h3Event, judgingAssignmentParamsSchema)
  const body = await parseValidatedBody(h3Event, reassignJudgeAssignmentBodySchema)
  const { actor, database, event, assignment } = await requireAdminAssignmentContext(h3Event, eventId, assignmentId)

  assertJudgeReviewLifecycleState(event, ['blind_review'])
  assertJudgeAssignmentStatus(
    assignment,
    ['assigned'],
    'Only unstarted judge assignments can be reassigned.'
  )

  const reassignedAt = new Date().toISOString()
  const replacementJudgeUserId = await pickReplacementJudgeUserId(database, eventId, {
    excludeJudgeUserIds: [assignment.judgeUserId],
    preferredJudgeUserId: body.judgeUserId,
    reviewStage: 'blind_review',
    submissionId: assignment.submissionId,
    excludeAssignmentId: assignment.id
  })
  const replacementAssignment = buildReplacementAssignment(assignment, replacementJudgeUserId, reassignedAt)

  await database.batch([
    database
      .update(judgeAssignments)
      .set({
        status: 'skipped',
        skippedAt: reassignedAt,
        skippedByUserId: actor.platformUser.id,
        skipReason: body.reason ?? 'reassigned_by_admin'
      })
      .where(eq(judgeAssignments.id, assignment.id)),
    database.insert(judgeAssignments).values(replacementAssignment)
  ])

  await writeAuditLog(database, {
    actorUserId: actor.platformUser.id,
    entityType: 'judge_assignment',
    entityId: assignment.id,
    action: 'judge_assignment.reassigned',
    metadata: {
      eventId,
      submissionId: assignment.submissionId,
      previousJudgeUserId: assignment.judgeUserId,
      replacementAssignmentId: replacementAssignment.id,
      replacementJudgeUserId,
      reason: body.reason ?? null
    }
  })

  const persistedReplacementAssignment = await getJudgeAssignmentOrThrow(database, replacementAssignment.id)

  return apiData(await getBlindAssignmentDetail(database, persistedReplacementAssignment))
})
