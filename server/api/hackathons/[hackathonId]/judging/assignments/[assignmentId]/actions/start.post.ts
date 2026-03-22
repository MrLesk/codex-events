import { eq } from 'drizzle-orm'

import { writeAuditLog } from '../../../../../../../database/audit-log'
import { judgeAssignments } from '../../../../../../../database/schema'
import { defineApiHandler } from '../../../../../../../utils/api-handler'
import { apiData } from '../../../../../../../utils/api-response'
import {
  assertJudgeAssignmentStatus,
  assertJudgeReviewLifecycleState,
  getBlindAssignmentDetail,
  judgingAssignmentParamsSchema,
  requireJudgeAssignmentContext
} from '../../../../../../../utils/judging'
import { parseValidatedParams } from '../../../../../../../utils/validation'

export default defineApiHandler(async (event) => {
  const { hackathonId, assignmentId } = parseValidatedParams(event, judgingAssignmentParamsSchema)
  const { actor, database, hackathon, assignment } = await requireJudgeAssignmentContext(event, hackathonId, assignmentId)

  assertJudgeReviewLifecycleState(hackathon, ['judge_review'])
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
      hackathonId,
      submissionId: assignment.submissionId,
      previousStatus: assignment.status,
      nextStatus: 'judge_started'
    }
  })

  return apiData(await getBlindAssignmentDetail(database, {
    ...assignment,
    status: 'judge_started',
    startedAt
  }))
})
