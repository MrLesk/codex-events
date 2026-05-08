import { eq } from 'drizzle-orm'

import { requirePlatformActor } from '#server/auth/actor'
import { submissions } from '#server/database/schema'
import { defineApiHandler } from '#server/http/api-handler'
import { apiData } from '#server/http/api-response'
import { requireTeamAdminContext } from '#server/domains/teams'
import { parseValidatedBody, parseValidatedParams } from '#server/http/validation'
import {
  assertEventAllowsSubmissionEditing,
  assertSubmissionBodyMatchesEventRequirements,
  assertSubmissionMutable,
  buildSubmissionWritePayload,
  getSubmissionForTeamOrThrow,
  resolveValidatedSubmissionTrackId,
  serializeSubmission,
  submissionParamsSchema,
  updateSubmissionBodySchema
} from '#server/domains/submissions'

export default defineApiHandler(async (h3Event) => {
  await requirePlatformActor(h3Event)
  const { eventId, teamId } = parseValidatedParams(h3Event, submissionParamsSchema)
  const body = await parseValidatedBody(h3Event, updateSubmissionBodySchema)
  const { database, event } = await requireTeamAdminContext(h3Event, eventId, teamId)
  const submission = await getSubmissionForTeamOrThrow(database, teamId)

  assertEventAllowsSubmissionEditing(event)
  assertSubmissionMutable(submission)
  assertSubmissionBodyMatchesEventRequirements(event, body)
  const trackId = await resolveValidatedSubmissionTrackId(database, eventId, body.trackId)

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
