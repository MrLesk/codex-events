import { requirePlatformActor } from '#server/auth/actor'
import { assertPlatformAdminAccess } from '#server/auth/authorization'
import { getDatabase } from '#server/database/client'
import {
  clearDefaultEventBackgroundImageUrl,
  getPlatformSettings,
  serializePlatformSettings
} from '#server/domains/platform/settings'
import { defineApiHandler } from '#server/http/api-handler'
import { apiData } from '#server/http/api-response'

export default defineApiHandler(async (h3Event) => {
  const actor = await requirePlatformActor(h3Event)
  assertPlatformAdminAccess(actor)
  const database = getDatabase(h3Event)
  const existingSettings = await getPlatformSettings(database)

  const settings = await clearDefaultEventBackgroundImageUrl(
    database,
    actor.platformUser.id,
    {
      revision: existingSettings?.defaultEventBackgroundImageRevision ?? 0,
      objectKey: existingSettings?.defaultEventBackgroundImageObjectKey ?? null
    }
  )

  return apiData(settings ? serializePlatformSettings(settings) : null)
})
