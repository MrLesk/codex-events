import { defineApiHandler } from '#server/utils/api-handler'
import { apiData } from '#server/utils/api-response'
import { getJudgeAssignmentDetail, judgingAssignmentParamsSchema, requireJudgeAssignmentContext } from '#server/utils/judging'
import { parseValidatedParams } from '#server/utils/validation'

export default defineApiHandler(async (event) => {
  const { hackathonId, assignmentId } = parseValidatedParams(event, judgingAssignmentParamsSchema)
  const { database, assignment } = await requireJudgeAssignmentContext(event, hackathonId, assignmentId)

  return apiData(await getJudgeAssignmentDetail(database, assignment))
})
