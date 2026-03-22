import { eq } from 'drizzle-orm'

import { writeAuditLog } from '../../../../../../../database/audit-log'
import type { AppDatabaseTransaction } from '../../../../../../../database/client'
import { judgeAssignments, judgeCriterionScores } from '../../../../../../../database/schema'
import { defineApiHandler } from '../../../../../../../utils/api-handler'
import { apiData } from '../../../../../../../utils/api-response'
import {
  assertJudgeAssignmentStatus,
  assertJudgeReviewLifecycleState,
  completeJudgeAssignmentBodySchema,
  getBlindAssignmentDetail,
  judgingAssignmentParamsSchema,
  normalizeCompletionCriterionScores,
  requireJudgeAssignmentContext
} from '../../../../../../../utils/judging'
import { parseValidatedBody, parseValidatedParams } from '../../../../../../../utils/validation'

export default defineApiHandler(async (event) => {
  const { hackathonId, assignmentId } = parseValidatedParams(event, judgingAssignmentParamsSchema)
  const body = await parseValidatedBody(event, completeJudgeAssignmentBodySchema)
  const { actor, database, hackathon, assignment } = await requireJudgeAssignmentContext(event, hackathonId, assignmentId)

  assertJudgeReviewLifecycleState(hackathon, ['judge_review'])
  assertJudgeAssignmentStatus(
    assignment,
    ['judge_started'],
    'Only started judge assignments can be completed.'
  )

  const normalizedScores = await normalizeCompletionCriterionScores(database, hackathonId, body)
  const completedAt = new Date().toISOString()

  await database.transaction(async (transaction: AppDatabaseTransaction) => {
    await transaction
      .update(judgeAssignments)
      .set({
        status: 'judge_completed',
        completedAt
      })
      .where(eq(judgeAssignments.id, assignment.id))

    await transaction.insert(judgeCriterionScores).values(
      normalizedScores.map(score => ({
        id: crypto.randomUUID(),
        judgeAssignmentId: assignment.id,
        evaluationCriterionId: score.evaluationCriterionId,
        score: score.score,
        comment: score.comment ?? null,
        createdAt: completedAt,
        updatedAt: completedAt
      }))
    )
  })

  await writeAuditLog(database, {
    actorUserId: actor.platformUser.id,
    entityType: 'judge_assignment',
    entityId: assignment.id,
    action: 'judge_assignment.review_completed',
    metadata: {
      hackathonId,
      submissionId: assignment.submissionId,
      previousStatus: assignment.status,
      nextStatus: 'judge_completed',
      criterionScoreCount: normalizedScores.length
    }
  })

  return apiData(await getBlindAssignmentDetail(database, {
    ...assignment,
    status: 'judge_completed',
    completedAt
  }))
})
