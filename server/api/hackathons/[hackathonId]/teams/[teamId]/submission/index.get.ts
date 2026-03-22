import { defineApiHandler } from '../../../../../../utils/api-handler'
import { apiData } from '../../../../../../utils/api-response'
import { parseValidatedParams } from '../../../../../../utils/validation'
import { submissionParamsSchema, getSubmissionForTeam, requireSubmissionVisibilityContext, serializeSubmission } from '../../../../../../utils/submissions'

export default defineApiHandler(async (event) => {
  const { hackathonId, teamId } = parseValidatedParams(event, submissionParamsSchema)
  const { database } = await requireSubmissionVisibilityContext(event, hackathonId, teamId)
  const submission = await getSubmissionForTeam(database, teamId)

  return apiData(submission ? serializeSubmission(submission) : null)
})
