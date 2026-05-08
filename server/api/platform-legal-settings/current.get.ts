import { getDatabase } from '#server/database/client'
import { defineApiHandler } from '#server/http/api-handler'
import { apiData } from '#server/http/api-response'
import {
  getPlatformLegalSettings,
  serializePlatformLegalSettings
} from '#server/domains/platform/legal-settings'

export default defineApiHandler(async (h3Event) => {
  const settings = await getPlatformLegalSettings(getDatabase(h3Event))

  return apiData(settings ? serializePlatformLegalSettings(settings) : null)
})
