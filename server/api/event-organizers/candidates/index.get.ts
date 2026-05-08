import { requirePlatformActor } from '#server/auth/actor'
import { assertPlatformAdminAccess } from '#server/auth/authorization'
import { getDatabase } from '#server/database/client'
import { defineApiHandler } from '#server/http/api-handler'
import { apiList } from '#server/http/api-response'
import { serializeEventRoleUserSummary } from '#server/domains/events'
import {
  listEventOrganizerCandidates,
  listEventOrganizerCandidatesQuerySchema
} from '#server/domains/platform/event-organizers'
import { parseValidatedQuery } from '#server/http/validation'

export default defineApiHandler(async (h3Event) => {
  const actor = await requirePlatformActor(h3Event)
  assertPlatformAdminAccess(actor)

  const query = parseValidatedQuery(h3Event, listEventOrganizerCandidatesQuerySchema)
  const result = await listEventOrganizerCandidates(getDatabase(h3Event), query)

  return apiList(
    result.items.map(user => serializeEventRoleUserSummary(user)),
    {
      page: result.page,
      pageSize: result.pageSize,
      total: result.total
    }
  )
})
