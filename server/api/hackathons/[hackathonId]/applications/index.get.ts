import { defineApiHandler } from '#server/utils/api-handler'
import { apiList } from '#server/utils/api-response'
import {
  listApplicationsQuerySchema,
  listHackathonApplications,
  requireHackathonApplicationVisibilityContext
} from '#server/utils/applications'
import { parseValidatedParams, parseValidatedQuery } from '#server/utils/validation'
import { routeIdParamsSchema } from '#server/utils/hackathon-management'

export default defineApiHandler(async (event) => {
  const { hackathonId } = parseValidatedParams(event, routeIdParamsSchema)
  const query = parseValidatedQuery(event, listApplicationsQuerySchema)
  const { database } = await requireHackathonApplicationVisibilityContext(event, hackathonId)
  const result = await listHackathonApplications(database, hackathonId, query)

  return apiList(result.data, {
    page: query.page,
    pageSize: query.page_size,
    total: result.total,
    statusCounts: result.statusCounts
  })
})
