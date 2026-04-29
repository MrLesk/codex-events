import { getDatabase } from '#server/database/client'
import { defineApiHandler } from '#server/http/api-handler'
import { apiList } from '#server/http/api-response'
import {
  listHackathonRoleCandidates,
  listHackathonRoleCandidatesQuerySchema,
  requireHackathonAdmin,
  routeIdParamsSchema,
  serializeHackathonRoleUserSummary
} from '#server/utils/hackathon-management'
import { parseValidatedParams, parseValidatedQuery } from '#server/http/validation'

export default defineApiHandler(async (event) => {
  const { hackathonId } = parseValidatedParams(event, routeIdParamsSchema)
  const query = parseValidatedQuery(event, listHackathonRoleCandidatesQuerySchema)
  const database = getDatabase(event)

  await requireHackathonAdmin(event, hackathonId)

  const result = await listHackathonRoleCandidates(database, hackathonId, query)

  return apiList(
    result.items.map(user => serializeHackathonRoleUserSummary(user)),
    {
      page: result.page,
      pageSize: result.pageSize,
      total: result.total
    }
  )
})
