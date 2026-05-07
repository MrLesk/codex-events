import { z } from 'zod'

import { requirePlatformActor } from '#server/auth/actor'
import { assertPlatformAdminAccess } from '#server/auth/authorization'
import { getDatabase } from '#server/database/client'
import {
  createPlatformDocumentVersion,
  createPlatformDocumentVersionBodySchema,
  platformDocumentTypeSchema,
  serializePlatformDocument
} from '#server/domains/platform/documents'
import { defineApiHandler } from '#server/http/api-handler'
import { apiData } from '#server/http/api-response'
import { parseValidatedBody, parseValidatedParams } from '#server/http/validation'

const paramsSchema = z.object({
  documentType: platformDocumentTypeSchema
})

export default defineApiHandler(async (event) => {
  const actor = await requirePlatformActor(event)
  assertPlatformAdminAccess(actor)

  const { documentType } = parseValidatedParams(event, paramsSchema)
  const body = await parseValidatedBody(event, createPlatformDocumentVersionBodySchema)
  const document = await createPlatformDocumentVersion(getDatabase(event), {
    documentType,
    title: body.title,
    content: body.content,
    publishedAt: body.publishedAt,
    actorUserId: actor.platformUser.id
  })

  return apiData(serializePlatformDocument(document))
})
