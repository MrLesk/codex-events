import { readBody } from 'h3'
import { eq } from 'drizzle-orm'

import { writeAuditLog } from '#server/database/audit-log'
import { judgeAssignments } from '#server/database/schema'
import { defineApiHandler } from '#server/utils/api-handler'
import { apiData } from '#server/utils/api-response'
import {
  assertAssignmentReviewStageIsActive,
  assertJudgeAssignmentStatus,
  completeJudgeAssignmentBodySchema,
  completePitchReviewBodySchema,
  getJudgeAssignmentDetail,
  judgingAssignmentParamsSchema,
  normalizeCompletionCriterionScores,
  normalizePitchReviewCompletion,
  requireJudgeAssignmentContext,
  saveJudgeCriterionScores
} from '#server/utils/judging'
import { parseValidatedParams, validateWithSchema } from '#server/utils/validation'

export default defineApiHandler(async (event) => {
  const { hackathonId, assignmentId } = parseValidatedParams(event, judgingAssignmentParamsSchema)
  const { actor, database, hackathon, assignment } = await requireJudgeAssignmentContext(event, hackathonId, assignmentId)
  const body = await readBody(event)

  assertAssignmentReviewStageIsActive(hackathon, assignment)
  assertJudgeAssignmentStatus(
    assignment,
    ['judge_started'],
    'Only started judge assignments can be completed.'
  )

  const completedAt = new Date().toISOString()
  let completionMetadata: Record<string, unknown>
  let updatedAssignmentPatch: Record<string, unknown> = {
    completedAt
  }

  if (assignment.reviewStage === 'pitch_review') {
    const normalizedPitchReview = normalizePitchReviewCompletion(
      validateWithSchema(completePitchReviewBodySchema, body, 'body')
    )

    await database
      .update(judgeAssignments)
      .set({
        status: 'judge_completed',
        pitchScore: normalizedPitchReview.pitchScore,
        pitchComment: normalizedPitchReview.pitchComment,
        completedAt
      })
      .where(eq(judgeAssignments.id, assignment.id))

    completionMetadata = {
      pitchScore: normalizedPitchReview.pitchScore
    }
    updatedAssignmentPatch = {
      ...updatedAssignmentPatch,
      pitchScore: normalizedPitchReview.pitchScore,
      pitchComment: normalizedPitchReview.pitchComment
    }
  } else {
    const normalizedScores = await normalizeCompletionCriterionScores(
      database,
      hackathonId,
      validateWithSchema(completeJudgeAssignmentBodySchema, body, 'body')
    )

    await database
      .update(judgeAssignments)
      .set({
        status: 'judge_completed',
        completedAt
      })
      .where(eq(judgeAssignments.id, assignment.id))

    await saveJudgeCriterionScores(database, assignment.id, normalizedScores, completedAt)

    completionMetadata = {
      criterionScoreCount: normalizedScores.length
    }
  }

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
      reviewStage: assignment.reviewStage,
      ...completionMetadata
    }
  })

  return apiData(await getJudgeAssignmentDetail(database, {
    ...assignment,
    status: 'judge_completed',
    ...updatedAssignmentPatch
  }))
})
