import { defineApiHandler } from '#server/http/api-handler'
import { apiData } from '#server/http/api-response'
import { parseValidatedParams } from '#server/http/validation'
import {
  submissionParamsSchema,
  getSubmissionDisqualificationReason,
  getSubmissionForTeam,
  requireSubmissionVisibilityContext,
  serializeSubmission
} from '#server/domains/submissions'

export default defineApiHandler(async (h3Event) => {
  const { eventId, teamId } = parseValidatedParams(h3Event, submissionParamsSchema)
  const { database, eventAuthorization } = await requireSubmissionVisibilityContext(h3Event, eventId, teamId)
  const submission = await getSubmissionForTeam(database, teamId)
  const disqualificationReason = submission?.status === 'disqualified' && eventAuthorization.isEventAdmin
    ? await getSubmissionDisqualificationReason(database, submission.id)
    : null

  return apiData(submission ? serializeSubmission(submission, { disqualificationReason }) : null)
})
