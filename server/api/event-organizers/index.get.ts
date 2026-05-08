import { requirePlatformActor } from '#server/auth/actor'
import { assertPlatformAdminAccess } from '#server/auth/authorization'
import { getDatabase } from '#server/database/client'
import { defineApiHandler } from '#server/http/api-handler'
import { apiList } from '#server/http/api-response'
import { serializeEventRoleUserSummary } from '#server/domains/events'
import { listEventOrganizers } from '#server/domains/platform/event-organizers'

export default defineApiHandler(async (h3Event) => {
  const actor = await requirePlatformActor(h3Event)
  assertPlatformAdminAccess(actor)

  const result = await listEventOrganizers(getDatabase(h3Event))

  return apiList(
    result.items.map(user => serializeEventRoleUserSummary(user)),
    {
      total: result.total
    }
  )
})
