import { getDatabase } from '#server/database/client'
import { defineApiHandler } from '#server/http/api-handler'
import { apiData } from '#server/http/api-response'
import { getCurrentPlatformDocuments, serializePlatformDocument } from '#server/utils/platform-documents'

export default defineApiHandler(async (event) => {
  const currentDocuments = await getCurrentPlatformDocuments(getDatabase(event))

  return apiData({
    privacy_policy: currentDocuments.privacy_policy ? serializePlatformDocument(currentDocuments.privacy_policy) : null,
    platform_terms: currentDocuments.platform_terms ? serializePlatformDocument(currentDocuments.platform_terms) : null
  })
})
