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

export default defineApiHandler(async (h3Event) => {
  const actor = await requirePlatformActor(h3Event)
  assertPlatformAdminAccess(actor)

  const { documentType } = parseValidatedParams(h3Event, paramsSchema)
  const body = await parseValidatedBody(h3Event, createPlatformDocumentVersionBodySchema)
  const document = await createPlatformDocumentVersion(getDatabase(h3Event), {
    documentType,
    title: body.title,
    content: body.content,
    publishedAt: body.publishedAt,
    actorUserId: actor.platformUser.id
  })

  return apiData(serializePlatformDocument(document))
})
