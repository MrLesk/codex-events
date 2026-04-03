import { requirePlatformActor } from '../../auth/actor'
import { assertPlatformAdminAccess } from '../../auth/authorization'
import { getDatabase } from '../../database/client'
import { defineApiHandler } from '../../utils/api-handler'
import { apiList } from '../../utils/api-response'
import { serializeHackathonRoleUserSummary } from '../../utils/hackathon-management'
import { listPlatformAdmins } from '../../utils/platform-admins'

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
