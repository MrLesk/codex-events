import { getDatabase } from '../../../../../database/client'
import { defineApiHandler } from '../../../../../utils/api-handler'
import { apiList } from '../../../../../utils/api-response'
import {
  listHackathonRoleCandidates,
  listHackathonRoleCandidatesQuerySchema,
  requireHackathonAdmin,
  routeIdParamsSchema,
  serializeHackathonRoleUserSummary
} from '../../../../../utils/hackathon-management'
import { parseValidatedParams, parseValidatedQuery } from '../../../../../utils/validation'

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
