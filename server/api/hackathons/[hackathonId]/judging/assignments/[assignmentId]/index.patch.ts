import { parseValidatedBody, parseValidatedParams } from '#server/http/validation'

import { assertGuard } from '#server/domains/lifecycle-guard'
import { defineApiHandler } from '#server/http/api-handler'
import { apiData } from '#server/http/api-response'
import {
  assertAssignmentReviewStageIsActive,
  assertJudgeAssignmentStatus,
  getJudgeAssignmentDetail,
  judgingAssignmentParamsSchema,
  normalizeSavedCriterionScores,
  requireJudgeAssignmentContext,
  saveJudgeAssignmentBodySchema,
  saveJudgeCriterionScores
} from '#server/utils/judging'

export default defineApiHandler(async (event) => {
  const { hackathonId, assignmentId } = parseValidatedParams(event, judgingAssignmentParamsSchema)
  const body = await parseValidatedBody(event, saveJudgeAssignmentBodySchema)
  const { database, hackathon, assignment } = await requireJudgeAssignmentContext(event, hackathonId, assignmentId)

  assertAssignmentReviewStageIsActive(hackathon, assignment)
  assertGuard(assignment.reviewStage === 'blind_review', {
    code: 'blind_review_assignment_required',
    message: 'Only blind-review assignments can save criterion scores in progress.',
    details: {
      hackathonId,
      assignmentId
    }
  })
  assertJudgeAssignmentStatus(
    assignment,
    ['judge_started'],
    'Only in-progress blind reviews can save criterion scores.'
  )

  const savedAt = new Date().toISOString()
  const normalizedScores = await normalizeSavedCriterionScores(database, hackathonId, body)

  await saveJudgeCriterionScores(database, assignment.id, normalizedScores, savedAt)

  return apiData(await getJudgeAssignmentDetail(database, assignment))
})
