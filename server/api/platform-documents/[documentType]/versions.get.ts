import { z } from 'zod'

import { requireAuthenticatedActor } from '#server/auth/actor'
import { getDatabase } from '#server/database/client'
import { defineApiHandler } from '#server/http/api-handler'
import { apiList } from '#server/http/api-response'
import {
  listPlatformDocumentVersions,
  platformDocumentTypeSchema,
  serializePlatformDocument
} from '#server/domains/platform/documents'
import { parseValidatedParams } from '#server/http/validation'

const paramsSchema = z.object({
  documentType: platformDocumentTypeSchema
})

export default defineApiHandler(async (h3Event) => {
  await requireAuthenticatedActor(h3Event)

  const { documentType } = parseValidatedParams(h3Event, paramsSchema)
  const documents = await listPlatformDocumentVersions(getDatabase(h3Event), documentType)

  return apiList(
    documents.map(serializePlatformDocument),
    {
      total: documents.length
    }
  )
})
