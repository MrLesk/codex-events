import { requirePlatformActor } from '#server/auth/actor'
import { assertPlatformAdminAccess } from '#server/auth/authorization'
import { getDatabase } from '#server/database/client'
import { defineApiHandler } from '#server/http/api-handler'
import { apiData } from '#server/http/api-response'
import {
  eventOrganizerUserParamsSchema,
  grantEventOrganizerAccess
} from '#server/domains/platform/event-organizers'
import { parseValidatedParams } from '#server/http/validation'

export default defineApiHandler(async (event) => {
  const actor = await requirePlatformActor(event)
  assertPlatformAdminAccess(actor)

  const { userId } = parseValidatedParams(event, eventOrganizerUserParamsSchema)
  const result = await grantEventOrganizerAccess(getDatabase(event), {
    actorUserId: actor.platformUser.id,
    userId
  })

  return apiData(result)
})
