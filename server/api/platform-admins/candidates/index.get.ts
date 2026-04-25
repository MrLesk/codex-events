import { requirePlatformActor } from '#server/auth/actor'
import { assertPlatformAdminAccess } from '#server/auth/authorization'
import { getDatabase } from '#server/database/client'
import { defineApiHandler } from '#server/utils/api-handler'
import { apiList } from '#server/utils/api-response'
import { serializeHackathonRoleUserSummary } from '#server/utils/hackathon-management'
import {
  listPlatformAdminCandidates,
  listPlatformAdminCandidatesQuerySchema
} from '#server/utils/platform-admins'
import { parseValidatedQuery } from '#server/utils/validation'

export default defineApiHandler(async (event) => {
  const actor = await requirePlatformActor(event)
  assertPlatformAdminAccess(actor)

  const query = parseValidatedQuery(event, listPlatformAdminCandidatesQuerySchema)
  const result = await listPlatformAdminCandidates(getDatabase(event), query)

  return apiList(
    result.items.map(user => serializeHackathonRoleUserSummary(user)),
    {
      page: result.page,
      pageSize: result.pageSize,
      total: result.total
    }
  )
})
