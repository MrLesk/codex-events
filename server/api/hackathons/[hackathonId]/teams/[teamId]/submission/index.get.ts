import { defineApiHandler } from '#server/utils/api-handler'
import { apiData } from '#server/utils/api-response'
import { parseValidatedParams } from '#server/utils/validation'
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
