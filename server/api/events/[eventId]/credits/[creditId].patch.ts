import { eq } from 'drizzle-orm'

import { requirePlatformActor } from '#server/auth/actor'
import { writeAuditLog } from '#server/database/audit-log'
import { getDatabase } from '#server/database/client'
import { eventCreditOffers } from '#server/database/schema'
import { defineApiHandler } from '#server/http/api-handler'
import { apiData } from '#server/http/api-response'
import {
  creditParamsSchema,
  getEventCreditOfferOrThrow,
  serializeEventCreditOffer,
  updateEventCreditOfferBodySchema
} from '#server/domains/credits'
import { requireEventAdmin } from '#server/domains/events'
import { parseValidatedBody, parseValidatedParams } from '#server/http/validation'

export default defineApiHandler(async (h3Event) => {
  const actor = await requirePlatformActor(h3Event)
  const { eventId, creditId } = parseValidatedParams(h3Event, creditParamsSchema)
  const body = await parseValidatedBody(h3Event, updateEventCreditOfferBodySchema)
  const database = getDatabase(h3Event)

  await requireEventAdmin(h3Event, eventId)
  await getEventCreditOfferOrThrow(database, eventId, creditId)

  await database
    .update(eventCreditOffers)
    .set({
      ...body,
      updatedAt: new Date().toISOString()
    })
    .where(eq(eventCreditOffers.id, creditId))

  const updatedOffer = await getEventCreditOfferOrThrow(database, eventId, creditId)

  await writeAuditLog(database, {
    actorUserId: actor.platformUser.id,
    entityType: 'event_credit_offer',
    entityId: creditId,
    action: 'event_credit_offer.updated',
    metadata: {
      eventId,
      fields: Object.keys(body)
    }
  })

  return apiData(serializeEventCreditOffer(updatedOffer))
})
