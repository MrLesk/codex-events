import { eq } from 'drizzle-orm'

import { writeAuditLog } from '#server/database/audit-log'
import { judgeAssignments } from '#server/database/schema'
import { defineApiHandler } from '#server/http/api-handler'
import { apiData } from '#server/http/api-response'
import {
  assertAssignmentReviewStageIsActive,
  assertJudgeAssignmentStatus,
  buildReplacementAssignment,
  getJudgeAssignmentDetail,
  getJudgeAssignmentOrThrow,
  judgingAssignmentParamsSchema,
  pickReplacementJudgeUserId,
  requireAdminAssignmentContext,
  skipJudgeAssignmentBodySchema
} from '#server/utils/judging'
import { parseValidatedBody, parseValidatedParams } from '#server/http/validation'

export default defineApiHandler(async (event) => {
  const { hackathonId, assignmentId } = parseValidatedParams(event, judgingAssignmentParamsSchema)
  const body = await parseValidatedBody(event, skipJudgeAssignmentBodySchema)
  const { actor, database, hackathon, assignment } = await requireAdminAssignmentContext(event, hackathonId, assignmentId)

  assertAssignmentReviewStageIsActive(hackathon, assignment)
  assertJudgeAssignmentStatus(
    assignment,
    ['judge_started'],
    'Only started judge assignments can be force-skipped.'
  )

  const skippedAt = new Date().toISOString()
  let replacementAssignmentId: string | null = null
  let replacementJudgeUserId: string | null = null
  let responseAssignment: typeof assignment = {
    ...assignment,
    status: 'skipped',
    skippedAt,
    skippedByUserId: actor.platformUser.id,
    skipReason: body.reason ?? 'force_skipped_by_admin'
  }

  if (assignment.reviewStage === 'blind_review') {
    replacementJudgeUserId = await pickReplacementJudgeUserId(database, hackathonId, {
      excludeJudgeUserIds: [assignment.judgeUserId],
      reviewStage: 'blind_review',
      submissionId: assignment.submissionId,
      excludeAssignmentId: assignment.id
    })
    const replacementAssignment = buildReplacementAssignment(assignment, replacementJudgeUserId, skippedAt)
    replacementAssignmentId = replacementAssignment.id

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

    responseAssignment = await getJudgeAssignmentOrThrow(database, replacementAssignment.id)
  } else {
    await database
      .update(judgeAssignments)
      .set({
        status: 'skipped',
        skippedAt,
        skippedByUserId: actor.platformUser.id,
        skipReason: body.reason ?? 'force_skipped_by_admin'
      })
      .where(eq(judgeAssignments.id, assignment.id))
  }

  await writeAuditLog(database, {
    actorUserId: actor.platformUser.id,
    entityType: 'judge_assignment',
    entityId: assignment.id,
    action: 'judge_assignment.force_skipped',
    metadata: {
      hackathonId,
      submissionId: assignment.submissionId,
      reviewStage: assignment.reviewStage,
      replacementAssignmentId,
      replacementJudgeUserId,
      reason: body.reason ?? null
    }
  })

  return apiData(await getJudgeAssignmentDetail(database, responseAssignment))
})
