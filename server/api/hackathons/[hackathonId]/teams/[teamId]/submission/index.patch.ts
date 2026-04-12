import { eq } from 'drizzle-orm'

import { requirePlatformActor } from '../../../../../../auth/actor'
import { submissions } from '../../../../../../database/schema'
import { defineApiHandler } from '../../../../../../utils/api-handler'
import { apiData } from '../../../../../../utils/api-response'
import { requireTeamAdminContext } from '../../../../../../utils/team-formation'
import { parseValidatedBody, parseValidatedParams } from '../../../../../../utils/validation'
import {
  assertHackathonAllowsSubmissionEditing,
  assertSubmissionMutable,
  buildSubmissionWritePayload,
  getSubmissionForTeamOrThrow,
  resolveValidatedSubmissionTrackId,
  serializeSubmission,
  submissionParamsSchema,
  updateSubmissionBodySchema
} from '../../../../../../utils/submissions'

export default defineApiHandler(async (event) => {
  await requirePlatformActor(event)
  const { hackathonId, teamId } = parseValidatedParams(event, submissionParamsSchema)
  const body = await parseValidatedBody(event, updateSubmissionBodySchema)
  const { database, hackathon } = await requireTeamAdminContext(event, hackathonId, teamId)
  const submission = await getSubmissionForTeamOrThrow(database, teamId)

  assertHackathonAllowsSubmissionEditing(hackathon)
  assertSubmissionMutable(submission)
  const trackId = await resolveValidatedSubmissionTrackId(database, hackathonId, body.trackId)

  const updatedAt = new Date().toISOString()
  const patch = {
    ...buildSubmissionWritePayload(body, updatedAt),
    trackId
  }

  await database
    .update(submissions)
    .set(patch)
    .where(eq(submissions.id, submission.id))

  return apiData(serializeSubmission({
    ...submission,
    ...patch,
    updatedAt
  }))
})
