import { getDatabase } from '#server/database/client'
import { defineApiHandler } from '#server/http/api-handler'
import { apiList } from '#server/http/api-response'
import {
  listEventRoleCandidates,
  listEventRoleCandidatesQuerySchema,
  requireEventAdmin,
  routeIdParamsSchema,
  serializeEventRoleUserSummary
} from '#server/domains/events'
import { parseValidatedParams, parseValidatedQuery } from '#server/http/validation'

export default defineApiHandler(async (h3Event) => {
  const { eventId } = parseValidatedParams(h3Event, routeIdParamsSchema)
  const query = parseValidatedQuery(h3Event, listEventRoleCandidatesQuerySchema)
  const database = getDatabase(h3Event)

  await requireEventAdmin(h3Event, eventId)

  const result = await listEventRoleCandidates(database, eventId, query)

  return apiList(
    result.items.map(user => serializeEventRoleUserSummary(user)),
    {
      page: result.page,
      pageSize: result.pageSize,
      total: result.total
    }
  )
})
