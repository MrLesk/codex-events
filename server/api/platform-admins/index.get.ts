import { requirePlatformActor } from '#server/auth/actor'
import { assertPlatformAdminAccess } from '#server/auth/authorization'
import { getDatabase } from '#server/database/client'
import { defineApiHandler } from '#server/utils/api-handler'
import { apiList } from '#server/utils/api-response'
import { serializeHackathonRoleUserSummary } from '#server/utils/hackathon-management'
import { listPlatformAdmins } from '#server/utils/platform-admins'

export default defineApiHandler(async (event) => {
  const actor = await requirePlatformActor(event)
  assertPlatformAdminAccess(actor)

  const result = await listPlatformAdmins(getDatabase(event))

  return apiList(
    result.items.map(user => serializeHackathonRoleUserSummary(user)),
    {
      total: result.total
    }
  )
})
