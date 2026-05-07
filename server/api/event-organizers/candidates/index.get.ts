import { requirePlatformActor } from '#server/auth/actor'
import { assertPlatformAdminAccess } from '#server/auth/authorization'
import { getDatabase } from '#server/database/client'
import { defineApiHandler } from '#server/http/api-handler'
import { apiList } from '#server/http/api-response'
import { serializeHackathonRoleUserSummary } from '#server/domains/hackathons'
import {
  listEventOrganizerCandidates,
  listEventOrganizerCandidatesQuerySchema
} from '#server/domains/platform/event-organizers'
import { parseValidatedQuery } from '#server/http/validation'

export default defineApiHandler(async (event) => {
  const actor = await requirePlatformActor(event)
  assertPlatformAdminAccess(actor)

  const query = parseValidatedQuery(event, listEventOrganizerCandidatesQuerySchema)
  const result = await listEventOrganizerCandidates(getDatabase(event), query)

  return apiList(
    result.items.map(user => serializeHackathonRoleUserSummary(user)),
    {
      page: result.page,
      pageSize: result.pageSize,
      total: result.total
    }
  )
})
