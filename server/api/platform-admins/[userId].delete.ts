import { requirePlatformActor } from '#server/auth/actor'
import { assertPlatformAdminAccess } from '#server/auth/authorization'
import { getDatabase } from '#server/database/client'
import { defineApiHandler } from '#server/http/api-handler'
import { apiData } from '#server/http/api-response'
import {
  platformAdminUserParamsSchema,
  revokePlatformAdminAccess
} from '#server/domains/platform/admins'
import { parseValidatedParams } from '#server/http/validation'

export default defineApiHandler(async (h3Event) => {
  const actor = await requirePlatformActor(h3Event)
  assertPlatformAdminAccess(actor)

  const { userId } = parseValidatedParams(h3Event, platformAdminUserParamsSchema)
  const result = await revokePlatformAdminAccess(getDatabase(h3Event), {
    actorUserId: actor.platformUser.id,
    userId
  })

  return apiData(result)
})
