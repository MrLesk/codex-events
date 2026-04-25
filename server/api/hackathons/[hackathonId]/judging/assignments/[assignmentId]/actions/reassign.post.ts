import { eq } from 'drizzle-orm'

import { writeAuditLog } from '#server/database/audit-log'
import { judgeAssignments } from '#server/database/schema'
import { defineApiHandler } from '#server/utils/api-handler'
import { apiData } from '#server/utils/api-response'
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
} from '#server/utils/judging'
import { parseValidatedBody, parseValidatedParams } from '#server/utils/validation'

export default defineApiHandler(async (event) => {
  const { hackathonId, assignmentId } = parseValidatedParams(event, judgingAssignmentParamsSchema)
  const body = await parseValidatedBody(event, reassignJudgeAssignmentBodySchema)
  const { actor, database, hackathon, assignment } = await requireAdminAssignmentContext(event, hackathonId, assignmentId)

  assertJudgeReviewLifecycleState(hackathon, ['blind_review'])
  assertJudgeAssignmentStatus(
    assignment,
    ['assigned'],
    'Only unstarted judge assignments can be reassigned.'
  )

  const reassignedAt = new Date().toISOString()
  const replacementJudgeUserId = await pickReplacementJudgeUserId(database, hackathonId, {
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
      hackathonId,
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
