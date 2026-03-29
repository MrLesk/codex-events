import { z } from 'zod'

import { requirePlatformAccountActor } from '../auth/actor'
import { getDatabase } from '../database/client'
import { defineApiHandler } from '../utils/api-handler'
import { apiData } from '../utils/api-response'
import { recordPlatformDocumentAcceptance, serializePlatformDocument } from '../utils/platform-documents'
import { parseValidatedBody } from '../utils/validation'

const bodySchema = z.object({
  platformDocumentId: z.string().trim().min(1)
})

export default defineApiHandler(async (event) => {
  const actor = await requirePlatformAccountActor(event)
  const body = await parseValidatedBody(event, bodySchema)

  const { acceptance, document } = await recordPlatformDocumentAcceptance(
    getDatabase(event),
    actor.platformUser.id,
    {
      platformDocumentId: body.platformDocumentId
    }
  )

  return apiData({
    acceptance: {
      id: acceptance.id,
      userId: acceptance.userId,
      platformDocumentId: acceptance.platformDocumentId,
      acceptedAt: acceptance.acceptedAt
    },
    document: serializePlatformDocument(document)
  })
})
