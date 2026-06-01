import { desc, eq } from 'drizzle-orm'

import { requirePlatformActor } from '#server/auth/actor'
import { writeAuditLog } from '#server/database/audit-log'
import { getDatabase } from '#server/database/client'
import { eventCreditOffers } from '#server/database/schema'
import { defineApiHandler } from '#server/http/api-handler'
import { apiData } from '#server/http/api-response'
import {
  createEventCreditOfferBodySchema,
  serializeEventCreditOffer
} from '#server/domains/credits'
import { requireEventAdmin, routeIdParamsSchema } from '#server/domains/events'
import { parseValidatedBody, parseValidatedParams } from '#server/http/validation'

export default defineApiHandler(async (h3Event) => {
  const actor = await requirePlatformActor(h3Event)
  const { eventId } = parseValidatedParams(h3Event, routeIdParamsSchema)
  const body = await parseValidatedBody(h3Event, createEventCreditOfferBodySchema)
  const database = getDatabase(h3Event)

  await requireEventAdmin(h3Event, eventId)

  const creditOfferId = crypto.randomUUID()
  const createdAt = new Date().toISOString()
  const latestOffer = await database.query.eventCreditOffers.findFirst({
    where: eq(eventCreditOffers.eventId, eventId),
    orderBy: [desc(eventCreditOffers.displayOrder), desc(eventCreditOffers.createdAt)]
  })
  const displayOrder = body.displayOrder ?? ((latestOffer?.displayOrder ?? 0) + 1)

  await database.insert(eventCreditOffers).values({
    id: creditOfferId,
    eventId,
    name: body.name,
    description: body.description,
    displayOrder,
    createdAt,
    updatedAt: createdAt
  })

  const offer = await database.query.eventCreditOffers.findFirst({
    where: eq(eventCreditOffers.id, creditOfferId)
  })

  await writeAuditLog(database, {
    actorUserId: actor.platformUser.id,
    entityType: 'event_credit_offer',
    entityId: creditOfferId,
    action: 'event_credit_offer.created',
    metadata: {
      eventId
    }
  })

  return apiData(serializeEventCreditOffer(offer!))
})
