import { z } from 'zod'

import { requirePlatformAccountActor } from '#server/auth/actor'
import { getDatabase } from '#server/database/client'
import { defineApiHandler } from '#server/http/api-handler'
import { apiData } from '#server/http/api-response'
import { recordPlatformDocumentAcceptance, serializePlatformDocument } from '#server/domains/platform/documents'
import { parseValidatedBody } from '#server/http/validation'

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
