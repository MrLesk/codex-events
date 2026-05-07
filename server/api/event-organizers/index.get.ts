import { requirePlatformActor } from '#server/auth/actor'
import { assertPlatformAdminAccess } from '#server/auth/authorization'
import { getDatabase } from '#server/database/client'
import { defineApiHandler } from '#server/http/api-handler'
import { apiList } from '#server/http/api-response'
import { serializeHackathonRoleUserSummary } from '#server/domains/hackathons'
import { listEventOrganizers } from '#server/domains/platform/event-organizers'

export default defineApiHandler(async (event) => {
  const actor = await requirePlatformActor(event)
  assertPlatformAdminAccess(actor)

  const result = await listEventOrganizers(getDatabase(event))

  return apiList(
    result.items.map(user => serializeHackathonRoleUserSummary(user)),
    {
      total: result.total
    }
  )
})
