import { defineApiHandler } from '#server/http/api-handler'
import { apiData } from '#server/http/api-response'
import { parseValidatedParams } from '#server/http/validation'
import {
  submissionParamsSchema,
  getSubmissionDisqualificationReason,
  getSubmissionForTeam,
  requireSubmissionVisibilityContext,
  serializeSubmission
} from '#server/utils/submissions'

export default defineApiHandler(async (event) => {
  const { hackathonId, teamId } = parseValidatedParams(event, submissionParamsSchema)
  const { database, hackathonAuthorization } = await requireSubmissionVisibilityContext(event, hackathonId, teamId)
  const submission = await getSubmissionForTeam(database, teamId)
  const disqualificationReason = submission?.status === 'disqualified' && hackathonAuthorization.isHackathonAdmin
    ? await getSubmissionDisqualificationReason(database, submission.id)
    : null

  return apiData(submission ? serializeSubmission(submission, { disqualificationReason }) : null)
})
