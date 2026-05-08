import { defineApiHandler } from '#server/http/api-handler'
import { apiList } from '#server/http/api-response'
import {
  listTeamsQuerySchema,
  listVisibleTeams,
  requireTeamVisibilityContext
} from '#server/domains/teams'
import { parseValidatedParams, parseValidatedQuery } from '#server/http/validation'
import { routeIdParamsSchema } from '#server/domains/events'

export default defineApiHandler(async (h3Event) => {
  const { eventId } = parseValidatedParams(h3Event, routeIdParamsSchema)
  const query = parseValidatedQuery(h3Event, listTeamsQuerySchema)
  const { database, event, eventAuthorization } = await requireTeamVisibilityContext(h3Event, eventId)
  const result = await listVisibleTeams(database, event, eventId, query, {
    includeInactiveTeams: eventAuthorization.canViewParticipantsAndTeams
  })

  return apiList(result.data, {
    page: query.page,
    pageSize: query.page_size,
    total: result.total,
    filterCounts: result.filterCounts
  })
})
