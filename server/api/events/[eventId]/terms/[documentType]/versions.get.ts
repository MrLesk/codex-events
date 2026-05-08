import { and, desc, eq } from 'drizzle-orm'

import { getDatabase } from '#server/database/client'
import { eventTermsDocuments } from '#server/database/schema'
import { defineApiHandler } from '#server/http/api-handler'
import { apiList } from '#server/http/api-response'
import {
  assertCompetitionEvent,
  requireEventAdmin,
  serializeEventTermsDocument,
  termsDocumentParamsSchema
} from '#server/domains/events'
import { parseValidatedParams } from '#server/http/validation'

export default defineApiHandler(async (h3Event) => {
  const { eventId, documentType } = parseValidatedParams(h3Event, termsDocumentParamsSchema)
  const database = getDatabase(h3Event)

  const { event } = await requireEventAdmin(h3Event, eventId)
  if (documentType === 'winner_terms') {
    assertCompetitionEvent(event)
  }

  const documents = await database.query.eventTermsDocuments.findMany({
    where: and(
      eq(eventTermsDocuments.eventId, eventId),
      eq(eventTermsDocuments.documentType, documentType)
    ),
    orderBy: [desc(eventTermsDocuments.version)]
  })

  return apiList(
    documents.map(serializeEventTermsDocument),
    {
      total: documents.length
    }
  )
})
