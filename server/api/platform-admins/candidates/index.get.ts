import { requirePlatformActor } from '#server/auth/actor'
import { assertPlatformAdminAccess } from '#server/auth/authorization'
import { getDatabase } from '#server/database/client'
import { defineApiHandler } from '#server/http/api-handler'
import { apiList } from '#server/http/api-response'
import { serializeEventRoleUserSummary } from '#server/domains/events'
import {
  listPlatformAdminCandidates,
  listPlatformAdminCandidatesQuerySchema
} from '#server/domains/platform/admins'
import { parseValidatedQuery } from '#server/http/validation'

export default defineApiHandler(async (h3Event) => {
  const actor = await requirePlatformActor(h3Event)
  assertPlatformAdminAccess(actor)

  const query = parseValidatedQuery(h3Event, listPlatformAdminCandidatesQuerySchema)
  const result = await listPlatformAdminCandidates(getDatabase(h3Event), query)

  return apiList(
    result.items.map(user => serializeEventRoleUserSummary(user)),
    {
      page: result.page,
      pageSize: result.pageSize,
      total: result.total
    }
  )
})
