import { eq } from 'drizzle-orm'

import { requirePlatformActor } from '#server/auth/actor'
import { submissions } from '#server/database/schema'
import { defineApiHandler } from '#server/http/api-handler'
import { apiData } from '#server/http/api-response'
import { requireTeamAdminContext } from '#server/domains/teams'
import { parseValidatedBody, parseValidatedParams } from '#server/http/validation'
import {
  assertHackathonAllowsSubmissionEditing,
  assertSubmissionBodyMatchesHackathonRequirements,
  assertSubmissionMutable,
  buildSubmissionWritePayload,
  getSubmissionForTeamOrThrow,
  resolveValidatedSubmissionTrackId,
  serializeSubmission,
  submissionParamsSchema,
  updateSubmissionBodySchema
} from '#server/utils/submissions'

export default defineApiHandler(async (event) => {
  await requirePlatformActor(event)
  const { hackathonId, teamId } = parseValidatedParams(event, submissionParamsSchema)
  const body = await parseValidatedBody(event, updateSubmissionBodySchema)
  const { database, hackathon } = await requireTeamAdminContext(event, hackathonId, teamId)
  const submission = await getSubmissionForTeamOrThrow(database, teamId)

  assertHackathonAllowsSubmissionEditing(hackathon)
  assertSubmissionMutable(submission)
  assertSubmissionBodyMatchesHackathonRequirements(hackathon, body)
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
