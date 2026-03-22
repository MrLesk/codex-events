import { z } from 'zod'

import { requireAuthenticatedActor } from '../../../auth/actor'
import { getDatabase } from '../../../database/client'
import { defineApiHandler } from '../../../utils/api-handler'
import { apiList } from '../../../utils/api-response'
import { platformDocumentTypeSchema } from '../../../utils/hackathon-management'
import { listPlatformDocumentVersions, serializePlatformDocument } from '../../../utils/platform-documents'
import { parseValidatedParams } from '../../../utils/validation'

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
