import { defineApiHandler } from '#server/utils/api-handler'
import { apiList } from '#server/utils/api-response'
import {
  listTeamsQuerySchema,
  listVisibleTeams,
  requireTeamVisibilityContext
} from '#server/utils/team-formation'
import { parseValidatedParams, parseValidatedQuery } from '#server/utils/validation'
import { routeIdParamsSchema } from '#server/utils/hackathon-management'

export default defineApiHandler(async (event) => {
  const { hackathonId } = parseValidatedParams(event, routeIdParamsSchema)
  const query = parseValidatedQuery(event, listTeamsQuerySchema)
  const { database, hackathon, hackathonAuthorization } = await requireTeamVisibilityContext(event, hackathonId)
  const result = await listVisibleTeams(database, hackathon, hackathonId, query, {
    includeInactiveTeams: hackathonAuthorization.canViewParticipantsAndTeams
  })

  return apiList(result.data, {
    page: query.page,
    pageSize: query.page_size,
    total: result.total,
    filterCounts: result.filterCounts
  })
})
