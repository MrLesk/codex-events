import { eq } from 'drizzle-orm'

import { writeAuditLog } from '../../../../../../../database/audit-log'
import { judgeAssignments } from '../../../../../../../database/schema'
import { defineApiHandler } from '../../../../../../../utils/api-handler'
import { apiData } from '../../../../../../../utils/api-response'
import {
  assertJudgeReviewLifecycleState,
  getBlindAssignmentDetail,
  judgingAssignmentParamsSchema,
  requireAdminAssignmentContext
} from '../../../../../../../utils/judging'
import { assertGuard } from '../../../../../../../utils/lifecycle-guard'
import { parseValidatedParams } from '../../../../../../../utils/validation'

export default defineApiHandler(async (event) => {
  const { hackathonId, assignmentId } = parseValidatedParams(event, judgingAssignmentParamsSchema)
  const { actor, database, hackathon, assignment } = await requireAdminAssignmentContext(event, hackathonId, assignmentId)

  assertJudgeReviewLifecycleState(hackathon, [
    'blind_review',
    'shortlist',
    'pitch',
    'pitch_review',
    'final_deliberation',
    'winners_announced',
    'completed'
  ])
  assertGuard(assignment.ineligibilityStatus === 'ineligible', {
    code: 'judge_assignment_not_ineligible',
    message: 'Only ineligible judge assignments can have ineligibility reverted.',
    details: {
      assignmentId: assignment.id
    }
  })

  await database
    .update(judgeAssignments)
    .set({
      ineligibilityStatus: 'eligible',
      ineligibilityReason: null,
      ineligibilityMarkedAt: null,
      ineligibilityMarkedByUserId: null
    })
    .where(eq(judgeAssignments.id, assignment.id))

  await writeAuditLog(database, {
    actorUserId: actor.platformUser.id,
    entityType: 'judge_assignment',
    entityId: assignment.id,
    action: 'judge_assignment.ineligibility_reverted',
    metadata: {
      hackathonId,
      submissionId: assignment.submissionId
    }
  })

  return apiData(await getBlindAssignmentDetail(database, {
    ...assignment,
    ineligibilityStatus: 'eligible',
    ineligibilityReason: null,
    ineligibilityMarkedAt: null,
    ineligibilityMarkedByUserId: null
  }))
})
