import { eq } from 'drizzle-orm'

import { writeAuditLog } from '../../../../../../../database/audit-log'
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
  requireAdminAssignmentContext,
  skipJudgeAssignmentBodySchema
} from '../../../../../../../utils/judging'
import { parseValidatedBody, parseValidatedParams } from '../../../../../../../utils/validation'

export default defineApiHandler(async (event) => {
  const { hackathonId, assignmentId } = parseValidatedParams(event, judgingAssignmentParamsSchema)
  const body = await parseValidatedBody(event, skipJudgeAssignmentBodySchema)
  const { actor, database, hackathon, assignment } = await requireAdminAssignmentContext(event, hackathonId, assignmentId)

  assertJudgeReviewLifecycleState(hackathon, ['judge_review'])
  assertJudgeAssignmentStatus(
    assignment,
    ['judge_started'],
    'Only started judge assignments can be force-skipped.'
  )

  const skippedAt = new Date().toISOString()
  const replacementJudgeUserId = await pickReplacementJudgeUserId(database, hackathonId, {
    excludeJudgeUserIds: [assignment.judgeUserId]
  })
  const replacementAssignment = buildReplacementAssignment(assignment, replacementJudgeUserId, skippedAt)

  await database.batch([
    database
      .update(judgeAssignments)
      .set({
        status: 'skipped',
        skippedAt,
        skippedByUserId: actor.platformUser.id,
        skipReason: body.reason ?? 'force_skipped_by_admin'
      })
      .where(eq(judgeAssignments.id, assignment.id)),
    database.insert(judgeAssignments).values(replacementAssignment)
  ])

  await writeAuditLog(database, {
    actorUserId: actor.platformUser.id,
    entityType: 'judge_assignment',
    entityId: assignment.id,
    action: 'judge_assignment.force_skipped',
    metadata: {
      hackathonId,
      submissionId: assignment.submissionId,
      replacementAssignmentId: replacementAssignment.id,
      replacementJudgeUserId,
      reason: body.reason ?? null
    }
  })

  const persistedReplacementAssignment = await getJudgeAssignmentOrThrow(database, replacementAssignment.id)

  return apiData(await getBlindAssignmentDetail(database, persistedReplacementAssignment))
})
