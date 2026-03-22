import { eq } from 'drizzle-orm'

import { requirePlatformActor } from '../../../../../../../auth/actor'
import { writeAuditLog } from '../../../../../../../database/audit-log'
import { submissions } from '../../../../../../../database/schema'
import { defineApiHandler } from '../../../../../../../utils/api-handler'
import { apiData } from '../../../../../../../utils/api-response'
import { requireTeamAdminContext } from '../../../../../../../utils/team-formation'
import { parseValidatedParams } from '../../../../../../../utils/validation'
import {
  assertSubmissionWithdrawable,
  getSubmissionForTeamOrThrow,
  serializeSubmission,
  submissionParamsSchema
} from '../../../../../../../utils/submissions'

export default defineApiHandler(async (event) => {
  const actor = await requirePlatformActor(event)
  const { hackathonId, teamId } = parseValidatedParams(event, submissionParamsSchema)
  const { database, hackathon } = await requireTeamAdminContext(event, hackathonId, teamId)
  const submission = await getSubmissionForTeamOrThrow(database, teamId)

  assertSubmissionWithdrawable(hackathon, submission)

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
    action: 'submission.withdrawn',
    metadata: {
      hackathonId,
      teamId,
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
