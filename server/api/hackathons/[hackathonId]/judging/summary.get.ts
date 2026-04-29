import { getDatabase } from '#server/database/client'
import { defineApiHandler } from '#server/http/api-handler'
import { apiData } from '#server/http/api-response'
import { requireHackathonAdmin, routeIdParamsSchema } from '#server/domains/hackathons'
import { getJudgingAssignmentSummary } from '#server/utils/judging'
import { parseValidatedParams } from '#server/http/validation'

export default defineApiHandler(async (event) => {
  const { hackathonId } = parseValidatedParams(event, routeIdParamsSchema)
  const { hackathon } = await requireHackathonAdmin(event, hackathonId)

  return apiData(await getJudgingAssignmentSummary(getDatabase(event), hackathon))
})
