import { eq } from 'drizzle-orm'

import { writeAuditLog } from '#server/database/audit-log'
import { judgeAssignments } from '#server/database/schema'
import { defineApiHandler } from '#server/http/api-handler'
import { apiData } from '#server/http/api-response'
import {
  assertJudgeAssignmentStatus,
  assertJudgeReviewLifecycleState,
  getBlindAssignmentDetail,
  judgingAssignmentParamsSchema,
  markAssignmentIneligibleBodySchema,
  requireJudgeAssignmentContext
} from '#server/domains/judging'
import { parseValidatedBody, parseValidatedParams } from '#server/http/validation'

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
