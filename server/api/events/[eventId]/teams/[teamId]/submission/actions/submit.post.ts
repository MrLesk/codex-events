import { eq } from 'drizzle-orm'

import { requirePlatformActor } from '#server/auth/actor'
import { submissions } from '#server/database/schema'
import { defineApiHandler } from '#server/http/api-handler'
import { apiData } from '#server/http/api-response'
import { requireTeamAdminContext } from '#server/domains/teams'
import { parseValidatedParams } from '#server/http/validation'
import {
  assertEventAllowsSubmissionEditing,
  assertSubmissionSubmittable,
  getSubmissionForTeamOrThrow,
  serializeSubmission,
  submissionParamsSchema
} from '#server/domains/submissions'

export default defineApiHandler(async (h3Event) => {
  await requirePlatformActor(h3Event)
  const { eventId, teamId } = parseValidatedParams(h3Event, submissionParamsSchema)
  const { database, event } = await requireTeamAdminContext(h3Event, eventId, teamId)
  const submission = await getSubmissionForTeamOrThrow(database, teamId)

  assertEventAllowsSubmissionEditing(event)
  await assertSubmissionSubmittable(database, event, submission)

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
