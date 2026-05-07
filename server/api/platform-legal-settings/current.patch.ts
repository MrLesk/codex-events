import { requirePlatformActor } from '#server/auth/actor'
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

export default defineApiHandler(async (event) => {
  const actor = await requirePlatformActor(event)
  assertPlatformAdminAccess(actor)

  const body = await parseValidatedBody(event, platformLegalSettingsBodySchema)
  const settings = await upsertPlatformLegalSettings(
    getDatabase(event),
    body,
    actor.platformUser.id
  )

  return apiData(serializePlatformLegalSettings(settings))
})
