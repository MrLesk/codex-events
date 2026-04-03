import { requirePlatformActor } from '../../../auth/actor'
import { assertPlatformAdminAccess } from '../../../auth/authorization'
import { getDatabase } from '../../../database/client'
import { defineApiHandler } from '../../../utils/api-handler'
import { apiList } from '../../../utils/api-response'
import { serializeHackathonRoleUserSummary } from '../../../utils/hackathon-management'
import {
  listPlatformAdminCandidates,
  listPlatformAdminCandidatesQuerySchema
} from '../../../utils/platform-admins'
import { parseValidatedQuery } from '../../../utils/validation'

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
