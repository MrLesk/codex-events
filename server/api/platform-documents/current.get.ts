import { getDatabase } from '../../database/client'
import { defineApiHandler } from '../../utils/api-handler'
import { apiData } from '../../utils/api-response'
import { getCurrentPlatformDocuments, serializePlatformDocument } from '../../utils/platform-documents'

export default defineApiHandler(async (event) => {
  const currentDocuments = await getCurrentPlatformDocuments(getDatabase(event))

  return apiData({
    privacy_policy: currentDocuments.privacy_policy ? serializePlatformDocument(currentDocuments.privacy_policy) : null,
    platform_terms: currentDocuments.platform_terms ? serializePlatformDocument(currentDocuments.platform_terms) : null
  })
})
