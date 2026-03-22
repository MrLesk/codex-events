import { eq } from 'drizzle-orm'

import { requirePlatformActor } from '../../../../../../../auth/actor'
import { writeAuditLog } from '../../../../../../../database/audit-log'
import { submissions } from '../../../../../../../database/schema'
import { defineApiHandler } from '../../../../../../../utils/api-handler'
import { apiData } from '../../../../../../../utils/api-response'
import { parseValidatedBody, parseValidatedParams } from '../../../../../../../utils/validation'
import {
  assertSubmissionDisqualifiable,
  disqualifySubmissionBodySchema,
  getSubmissionForTeamOrThrow,
  requireAdminSubmissionContext,
  serializeSubmission,
  submissionParamsSchema
} from '../../../../../../../utils/submissions'

export default defineApiHandler(async (event) => {
  const actor = await requirePlatformActor(event)
  const { hackathonId, teamId } = parseValidatedParams(event, submissionParamsSchema)
  const body = await parseValidatedBody(event, disqualifySubmissionBodySchema)
  const { database, hackathon } = await requireAdminSubmissionContext(event, hackathonId, teamId)
  const submission = await getSubmissionForTeamOrThrow(database, teamId)

  assertSubmissionDisqualifiable(hackathon, submission)

  const disqualifiedAt = new Date().toISOString()

  await database
    .update(submissions)
    .set({
      status: 'disqualified',
      disqualifiedAt,
      updatedAt: disqualifiedAt
    })
    .where(eq(submissions.id, submission.id))

  await writeAuditLog(database, {
    actorUserId: actor.platformUser.id,
    entityType: 'submission',
    entityId: submission.id,
    action: 'submission.disqualified',
    metadata: {
      hackathonId,
      teamId,
      reason: body.reason ?? null,
      previousStatus: submission.status,
      nextStatus: 'disqualified'
    }
  })

  return apiData(serializeSubmission({
    ...submission,
    status: 'disqualified',
    disqualifiedAt,
    updatedAt: disqualifiedAt
  }))
})
