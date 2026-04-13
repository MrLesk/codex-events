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
  markAssignmentIneligibleBodySchema,
  requireJudgeAssignmentContext
} from '../../../../../../../utils/judging'
import { parseValidatedBody, parseValidatedParams } from '../../../../../../../utils/validation'

export default defineApiHandler(async (event) => {
  const { hackathonId, assignmentId } = parseValidatedParams(event, judgingAssignmentParamsSchema)
  const body = await parseValidatedBody(event, markAssignmentIneligibleBodySchema)
  const { actor, database, hackathon, assignment } = await requireJudgeAssignmentContext(event, hackathonId, assignmentId)

  assertJudgeReviewLifecycleState(hackathon, ['blind_review'])
  assertJudgeAssignmentStatus(
    assignment,
    ['judge_started', 'judge_completed'],
    'Only started or completed judge assignments can be marked ineligible.'
  )

  const markedAt = new Date().toISOString()

  await database
    .update(judgeAssignments)
    .set({
      ineligibilityStatus: 'ineligible',
      ineligibilityReason: body.reason,
      ineligibilityMarkedAt: markedAt,
      ineligibilityMarkedByUserId: actor.platformUser.id
    })
    .where(eq(judgeAssignments.id, assignment.id))

  await writeAuditLog(database, {
    actorUserId: actor.platformUser.id,
    entityType: 'judge_assignment',
    entityId: assignment.id,
    action: 'judge_assignment.ineligibility_marked',
    metadata: {
      hackathonId,
      submissionId: assignment.submissionId,
      reason: body.reason
    }
  })

  return apiData(await getBlindAssignmentDetail(database, {
    ...assignment,
    ineligibilityStatus: 'ineligible',
    ineligibilityReason: body.reason,
    ineligibilityMarkedAt: markedAt,
    ineligibilityMarkedByUserId: actor.platformUser.id
  }))
})
