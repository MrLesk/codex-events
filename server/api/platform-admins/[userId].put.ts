import { requirePlatformActor } from '#server/auth/actor'
import { assertPlatformAdminAccess } from '#server/auth/authorization'
import { getDatabase } from '#server/database/client'
import { defineApiHandler } from '#server/utils/api-handler'
import { apiData } from '#server/utils/api-response'
import {
  grantPlatformAdminAccess,
  platformAdminUserParamsSchema
} from '#server/utils/platform-admins'
import { parseValidatedParams } from '#server/utils/validation'

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
