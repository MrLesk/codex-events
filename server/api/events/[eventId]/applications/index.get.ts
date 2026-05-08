import { defineApiHandler } from '#server/http/api-handler'
import { apiList } from '#server/http/api-response'
import {
  listApplicationsQuerySchema,
  listEventApplications,
  requireEventApplicationVisibilityContext
} from '#server/domains/applications'
import { parseValidatedParams, parseValidatedQuery } from '#server/http/validation'
import { routeIdParamsSchema } from '#server/domains/events'

export default defineApiHandler(async (h3Event) => {
  const { eventId } = parseValidatedParams(h3Event, routeIdParamsSchema)
  const query = parseValidatedQuery(h3Event, listApplicationsQuerySchema)
  const { database } = await requireEventApplicationVisibilityContext(h3Event, eventId)
  const result = await listEventApplications(database, eventId, query)

  return apiList(result.data, {
    page: query.page,
    pageSize: query.page_size,
    total: result.total,
    statusCounts: result.statusCounts
  })
})
