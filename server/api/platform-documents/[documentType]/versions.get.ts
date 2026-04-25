import { z } from 'zod'

import { requireAuthenticatedActor } from '#server/auth/actor'
import { getDatabase } from '#server/database/client'
import { defineApiHandler } from '#server/utils/api-handler'
import { apiList } from '#server/utils/api-response'
import { platformDocumentTypeSchema } from '#server/utils/hackathon-management'
import { listPlatformDocumentVersions, serializePlatformDocument } from '#server/utils/platform-documents'
import { parseValidatedParams } from '#server/utils/validation'

const paramsSchema = z.object({
  documentType: platformDocumentTypeSchema
})

export default defineApiHandler(async (event) => {
  await requireAuthenticatedActor(event)

  const { documentType } = parseValidatedParams(event, paramsSchema)
  const documents = await listPlatformDocumentVersions(getDatabase(event), documentType)

  return apiList(
    documents.map(serializePlatformDocument),
    {
      total: documents.length
    }
  )
})
