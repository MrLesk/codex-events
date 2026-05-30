import { requirePlatformAccountActor } from '#server/auth/actor'
import { assertPlatformAdminAccess } from '#server/auth/authorization'
import { getDatabase } from '#server/database/client'
import { defineApiHandler } from '#server/http/api-handler'
import { apiData } from '#server/http/api-response'
import {
  platformLegalSettingsBodySchema,
  serializePlatformLegalSettings,
  upsertPlatformLegalSettings
} from '#server/domains/platform/legal-settings'
import { parseValidatedBody } from '#server/http/validation'

export default defineApiHandler(async (h3Event) => {
  const actor = await requirePlatformAccountActor(h3Event)
  assertPlatformAdminAccess(actor)

  const body = await parseValidatedBody(h3Event, platformLegalSettingsBodySchema)
  const settings = await upsertPlatformLegalSettings(
    getDatabase(h3Event),
    body,
    actor.platformUser.id
  )

  return apiData(serializePlatformLegalSettings(settings))
})
