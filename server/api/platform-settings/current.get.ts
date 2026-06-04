import { getDatabase } from '#server/database/client'
import { defineApiHandler } from '#server/http/api-handler'
import { apiData } from '#server/http/api-response'
import {
  getPlatformSettings,
  serializePlatformSettings
} from '#server/domains/platform/settings'

export default defineApiHandler(async (h3Event) => {
  const settings = await getPlatformSettings(getDatabase(h3Event))

  return apiData(settings ? serializePlatformSettings(settings) : null)
})
