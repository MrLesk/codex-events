import { defineApiHandler } from '../../../../../../utils/api-handler'
import { apiData } from '../../../../../../utils/api-response'
import { getBlindAssignmentDetail, judgingAssignmentParamsSchema, requireJudgeAssignmentContext } from '../../../../../../utils/judging'
import { parseValidatedParams } from '../../../../../../utils/validation'

export default defineApiHandler(async (event) => {
  const { hackathonId, assignmentId } = parseValidatedParams(event, judgingAssignmentParamsSchema)
  const { database, assignment } = await requireJudgeAssignmentContext(event, hackathonId, assignmentId)

  return apiData(await getBlindAssignmentDetail(database, assignment))
})
