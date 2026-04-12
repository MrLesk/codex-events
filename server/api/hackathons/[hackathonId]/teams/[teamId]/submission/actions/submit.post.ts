import { eq } from 'drizzle-orm'

import { requirePlatformActor } from '../../../../../../../auth/actor'
import { submissions } from '../../../../../../../database/schema'
import { defineApiHandler } from '../../../../../../../utils/api-handler'
import { apiData } from '../../../../../../../utils/api-response'
import { requireTeamAdminContext } from '../../../../../../../utils/team-formation'
import { parseValidatedParams } from '../../../../../../../utils/validation'
import {
  assertHackathonAllowsSubmissionEditing,
  assertSubmissionSubmittable,
  getSubmissionForTeamOrThrow,
  serializeSubmission,
  submissionParamsSchema
} from '../../../../../../../utils/submissions'

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
