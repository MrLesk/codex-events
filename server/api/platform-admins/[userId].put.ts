import { requirePlatformActor } from '../../auth/actor'
import { assertPlatformAdminAccess } from '../../auth/authorization'
import { getDatabase } from '../../database/client'
import { defineApiHandler } from '../../utils/api-handler'
import { apiData } from '../../utils/api-response'
import {
  grantPlatformAdminAccess,
  platformAdminUserParamsSchema
} from '../../utils/platform-admins'
import { parseValidatedParams } from '../../utils/validation'

export default defineApiHandler(async (event) => {
  const actor = await requirePlatformActor(event)
  assertPlatformAdminAccess(actor)

  const { userId } = parseValidatedParams(event, platformAdminUserParamsSchema)
  const result = await grantPlatformAdminAccess(getDatabase(event), {
    actorUserId: actor.platformUser.id,
    userId
  })

  return apiData(result)
})
