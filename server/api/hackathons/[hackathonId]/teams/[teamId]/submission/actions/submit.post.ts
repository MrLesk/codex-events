import { eq } from 'drizzle-orm'

import { requirePlatformActor } from '#server/auth/actor'
import { submissions } from '#server/database/schema'
import { defineApiHandler } from '#server/http/api-handler'
import { apiData } from '#server/http/api-response'
import { requireTeamAdminContext } from '#server/utils/team-formation'
import { parseValidatedParams } from '#server/http/validation'
import {
  assertHackathonAllowsSubmissionEditing,
  assertSubmissionSubmittable,
  getSubmissionForTeamOrThrow,
  serializeSubmission,
  submissionParamsSchema
} from '#server/utils/submissions'

export default defineApiHandler(async (event) => {
  await requirePlatformActor(event)
  const { hackathonId, teamId } = parseValidatedParams(event, submissionParamsSchema)
  const { database, hackathon } = await requireTeamAdminContext(event, hackathonId, teamId)
  const submission = await getSubmissionForTeamOrThrow(database, teamId)

  assertHackathonAllowsSubmissionEditing(hackathon)
  await assertSubmissionSubmittable(database, hackathon, submission)

  const submittedAt = new Date().toISOString()

  await database
    .update(submissions)
    .set({
      status: 'submitted',
      submittedAt,
      updatedAt: submittedAt
    })
    .where(eq(submissions.id, submission.id))

  return apiData(serializeSubmission({
    ...submission,
    status: 'submitted',
    submittedAt,
    updatedAt: submittedAt
  }))
})
