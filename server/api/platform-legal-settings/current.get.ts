import { getDatabase } from '#server/database/client'
import { defineApiHandler } from '#server/http/api-handler'
import { apiData } from '#server/http/api-response'
import {
  getPlatformLegalSettings,
  serializePlatformLegalSettings
} from '#server/domains/platform/legal-settings'

export default defineApiHandler(async (event) => {
  const settings = await getPlatformLegalSettings(getDatabase(event))

  return apiData(settings ? serializePlatformLegalSettings(settings) : null)
})
