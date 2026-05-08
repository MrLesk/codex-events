import { eq } from 'drizzle-orm'

import { writeAuditLog } from '#server/database/audit-log'
import { judgeAssignments } from '#server/database/schema'
import { defineApiHandler } from '#server/http/api-handler'
import { apiData } from '#server/http/api-response'
import {
  assertAssignmentReviewStageIsActive,
  assertJudgeAssignmentStatus,
  buildReplacementAssignment,
  getJudgeAssignmentDetail,
  getJudgeAssignmentOrThrow,
  judgingAssignmentParamsSchema,
  pickReplacementJudgeUserId,
  requireJudgeAssignmentContext,
  skipJudgeAssignmentBodySchema
} from '#server/domains/judging'
import { parseValidatedBody, parseValidatedParams } from '#server/http/validation'

export default defineApiHandler(async (h3Event) => {
  const { eventId, assignmentId } = parseValidatedParams(h3Event, judgingAssignmentParamsSchema)
  const body = await parseValidatedBody(h3Event, skipJudgeAssignmentBodySchema)
  const { actor, database, event, assignment } = await requireJudgeAssignmentContext(h3Event, eventId, assignmentId)

  assertAssignmentReviewStageIsActive(event, assignment)
  assertJudgeAssignmentStatus(
    assignment,
    ['assigned', 'judge_started'],
    'Only assigned or started judge assignments can be skipped.'
  )

  const skippedAt = new Date().toISOString()
  let replacementAssignmentId: string | null = null
  let replacementJudgeUserId: string | null = null
  let responseAssignment: typeof assignment = {
    ...assignment,
    status: 'skipped',
    skippedAt,
    skippedByUserId: actor.platformUser.id,
    skipReason: body.reason ?? null
  }

  if (assignment.reviewStage === 'blind_review') {
    replacementJudgeUserId = await pickReplacementJudgeUserId(database, eventId, {
      excludeJudgeUserIds: [assignment.judgeUserId],
      reviewStage: 'blind_review',
      submissionId: assignment.submissionId,
      excludeAssignmentId: assignment.id
    })
    const replacementAssignment = buildReplacementAssignment(assignment, replacementJudgeUserId, skippedAt)
    replacementAssignmentId = replacementAssignment.id

    await database.batch([
      database
        .update(judgeAssignments)
        .set({
          status: 'skipped',
          skippedAt,
          skippedByUserId: actor.platformUser.id,
          skipReason: body.reason ?? null
        })
        .where(eq(judgeAssignments.id, assignment.id)),
      database.insert(judgeAssignments).values(replacementAssignment)
    ])

    responseAssignment = await getJudgeAssignmentOrThrow(database, replacementAssignment.id)
  } else {
    await database
      .update(judgeAssignments)
      .set({
        status: 'skipped',
        skippedAt,
        skippedByUserId: actor.platformUser.id,
        skipReason: body.reason ?? null
      })
      .where(eq(judgeAssignments.id, assignment.id))
  }

  await writeAuditLog(database, {
    actorUserId: actor.platformUser.id,
    entityType: 'judge_assignment',
    entityId: assignment.id,
    action: 'judge_assignment.skipped',
    metadata: {
      eventId,
      submissionId: assignment.submissionId,
      previousStatus: assignment.status,
      nextStatus: 'skipped',
      reviewStage: assignment.reviewStage,
      replacementAssignmentId,
      replacementJudgeUserId
    }
  })

  return apiData(await getJudgeAssignmentDetail(database, responseAssignment))
})
