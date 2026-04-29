import { eq } from 'drizzle-orm'

import { requirePlatformActor } from '#server/auth/actor'
import { writeAuditLog } from '#server/database/audit-log'
import { submissions } from '#server/database/schema'
import { defineApiHandler } from '#server/http/api-handler'
import { apiData } from '#server/http/api-response'
import { parseValidatedBody, parseValidatedParams } from '#server/http/validation'
import {
  adminWithdrawSubmissionBodySchema,
  assertRequestedByActiveTeamAdmin,
  assertSubmissionWithdrawable,
  getSubmissionForTeamOrThrow,
  requireAdminSubmissionContext,
  serializeSubmission,
  submissionParamsSchema
} from '#server/utils/submissions'

export default defineApiHandler(async (event) => {
  const actor = await requirePlatformActor(event)
  const { hackathonId, teamId } = parseValidatedParams(event, submissionParamsSchema)
  const body = await parseValidatedBody(event, adminWithdrawSubmissionBodySchema)
  const { database, hackathon } = await requireAdminSubmissionContext(event, hackathonId, teamId)
  const submission = await getSubmissionForTeamOrThrow(database, teamId)

  assertSubmissionWithdrawable(hackathon, submission)
  await assertRequestedByActiveTeamAdmin(database, teamId, body.requestedByUserId)

  const withdrawnAt = new Date().toISOString()

  await database
    .update(submissions)
    .set({
      status: 'withdrawn',
      withdrawnAt,
      updatedAt: withdrawnAt
    })
    .where(eq(submissions.id, submission.id))

  await writeAuditLog(database, {
    actorUserId: actor.platformUser.id,
    entityType: 'submission',
    entityId: submission.id,
    action: 'submission.admin_withdrawn',
    metadata: {
      hackathonId,
      teamId,
      requestedByUserId: body.requestedByUserId,
      reason: body.reason ?? null,
      previousStatus: submission.status,
      nextStatus: 'withdrawn'
    }
  })

  return apiData(serializeSubmission({
    ...submission,
    status: 'withdrawn',
    withdrawnAt,
    updatedAt: withdrawnAt
  }))
})
