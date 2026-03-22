import { eq } from 'drizzle-orm'

import { writeAuditLog } from '../../../../../../../database/audit-log'
import type { AppDatabaseTransaction } from '../../../../../../../database/client'
import { judgeAssignments } from '../../../../../../../database/schema'
import { defineApiHandler } from '../../../../../../../utils/api-handler'
import { apiData } from '../../../../../../../utils/api-response'
import {
  assertJudgeAssignmentStatus,
  assertJudgeReviewLifecycleState,
  buildReplacementAssignment,
  getBlindAssignmentDetail,
  getJudgeAssignmentOrThrow,
  judgingAssignmentParamsSchema,
  pickReplacementJudgeUserId,
  requireJudgeAssignmentContext,
  skipJudgeAssignmentBodySchema
} from '../../../../../../../utils/judging'
import { parseValidatedBody, parseValidatedParams } from '../../../../../../../utils/validation'

export default defineApiHandler(async (event) => {
  const { hackathonId, assignmentId } = parseValidatedParams(event, judgingAssignmentParamsSchema)
  const body = await parseValidatedBody(event, skipJudgeAssignmentBodySchema)
  const { actor, database, hackathon, assignment } = await requireJudgeAssignmentContext(event, hackathonId, assignmentId)

  assertJudgeReviewLifecycleState(hackathon, ['judge_review'])
  assertJudgeAssignmentStatus(
    assignment,
    ['assigned', 'judge_started'],
    'Only assigned or started judge assignments can be skipped.'
  )

  const skippedAt = new Date().toISOString()
  const replacementJudgeUserId = await pickReplacementJudgeUserId(database, hackathonId, {
    excludeJudgeUserIds: [assignment.judgeUserId]
  })
  const replacementAssignment = buildReplacementAssignment(assignment, replacementJudgeUserId, skippedAt)

  await database.transaction(async (transaction: AppDatabaseTransaction) => {
    await transaction
      .update(judgeAssignments)
      .set({
        status: 'skipped',
        skippedAt,
        skippedByUserId: actor.platformUser.id,
        skipReason: body.reason ?? null
      })
      .where(eq(judgeAssignments.id, assignment.id))

    await transaction.insert(judgeAssignments).values(replacementAssignment)
  })

  await writeAuditLog(database, {
    actorUserId: actor.platformUser.id,
    entityType: 'judge_assignment',
    entityId: assignment.id,
    action: 'judge_assignment.skipped',
    metadata: {
      hackathonId,
      submissionId: assignment.submissionId,
      previousStatus: assignment.status,
      nextStatus: 'skipped',
      replacementAssignmentId: replacementAssignment.id,
      replacementJudgeUserId
    }
  })

  const persistedReplacementAssignment = await getJudgeAssignmentOrThrow(database, replacementAssignment.id)

  return apiData(await getBlindAssignmentDetail(database, persistedReplacementAssignment))
})
