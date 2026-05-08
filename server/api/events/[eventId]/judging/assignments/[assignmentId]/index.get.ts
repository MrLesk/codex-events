import { defineApiHandler } from '#server/http/api-handler'
import { apiData } from '#server/http/api-response'
import { getJudgeAssignmentDetail, judgingAssignmentParamsSchema, requireJudgeAssignmentContext } from '#server/domains/judging'
import { parseValidatedParams } from '#server/http/validation'

export default defineApiHandler(async (h3Event) => {
  const { eventId, assignmentId } = parseValidatedParams(h3Event, judgingAssignmentParamsSchema)
  const { database, assignment } = await requireJudgeAssignmentContext(h3Event, eventId, assignmentId)

  return apiData(await getJudgeAssignmentDetail(database, assignment))
})
