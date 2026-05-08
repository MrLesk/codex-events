import { eq } from 'drizzle-orm'

import { requirePlatformActor } from '#server/auth/actor'
import { writeAuditLog } from '#server/database/audit-log'
import { getDatabase } from '#server/database/client'
import { events } from '#server/database/schema'
import { defineApiHandler } from '#server/http/api-handler'
import { ApiError } from '#server/http/api-error'
import { apiData } from '#server/http/api-response'
import {
  assertCompetitionEvent,
  getEventTermsDocumentOrThrow,
  requireEventAdmin,
  serializeEvent,
  setCurrentTermsBodySchema,
  termsDocumentParamsSchema
} from '#server/domains/events'
import { parseValidatedBody, parseValidatedParams } from '#server/http/validation'

export default defineApiHandler(async (h3Event) => {
  const actor = await requirePlatformActor(h3Event)
  const { eventId, documentType } = parseValidatedParams(h3Event, termsDocumentParamsSchema)
  const body = await parseValidatedBody(h3Event, setCurrentTermsBodySchema)
  const database = getDatabase(h3Event)

  const { event } = await requireEventAdmin(h3Event, eventId)
  if (documentType === 'winner_terms') {
    assertCompetitionEvent(event)
  }
  const document = await getEventTermsDocumentOrThrow(database, eventId, body.eventTermsDocumentId)

  if (document.documentType !== documentType) {
    throw new ApiError({
      statusCode: 409,
      code: 'event_terms_document_type_mismatch',
      message: 'The selected event terms document does not match the requested document type.',
      details: {
        eventId,
        documentType,
        actualDocumentType: document.documentType,
        eventTermsDocumentId: document.id
      }
    })
  }

  const updatedAt = new Date().toISOString()
  const patch = documentType === 'application_terms'
    ? {
        currentApplicationTermsDocumentId: document.id,
        updatedAt
      }
    : {
        currentWinnerTermsDocumentId: document.id,
        updatedAt
      }

  await database
    .update(events)
    .set(patch)
    .where(eq(events.id, eventId))

  const updatedEvent = await database.query.events.findFirst({
    where: eq(events.id, eventId)
  })

  await writeAuditLog(database, {
    actorUserId: actor.platformUser.id,
    entityType: 'event',
    entityId: eventId,
    action: 'event_terms_document.set_current',
    metadata: {
      documentType,
      eventTermsDocumentId: document.id
    }
  })

  return apiData(serializeEvent(updatedEvent!))
})
