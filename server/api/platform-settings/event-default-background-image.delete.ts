import { requirePlatformActor } from '#server/auth/actor'
import { assertPlatformAdminAccess } from '#server/auth/authorization'
import { getDatabase } from '#server/database/client'
import { deletePlatformDefaultEventBackgroundImageObject } from '#server/domains/events/images'
import {
  clearDefaultEventBackgroundImageUrl,
  serializePlatformSettings
} from '#server/domains/platform/settings'
import { defineApiHandler } from '#server/http/api-handler'
import { apiData } from '#server/http/api-response'

export default defineApiHandler(async (h3Event) => {
  const actor = await requirePlatformActor(h3Event)
  assertPlatformAdminAccess(actor)

  await deletePlatformDefaultEventBackgroundImageObject(h3Event)

  const settings = await clearDefaultEventBackgroundImageUrl(
    getDatabase(h3Event),
    actor.platformUser.id
  )

  return apiData(settings ? serializePlatformSettings(settings) : null)
})
