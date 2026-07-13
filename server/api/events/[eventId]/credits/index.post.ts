import { desc, eq } from 'drizzle-orm'

import { requirePlatformActor } from '#server/auth/actor'
import { writeAuditLog } from '#server/database/audit-log'
import { getD1Binding, getDatabase } from '#server/database/client'
import { eventCreditOffers } from '#server/database/schema'
import { defineApiHandler } from '#server/http/api-handler'
import { apiData } from '#server/http/api-response'
import { ApiError } from '#server/http/api-error'
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

  const { event } = await requireEventAdmin(h3Event, eventId)

  if (event.simplifiedClaimingEnabled) {
    throw new ApiError({
      statusCode: 409,
      code: 'simplified_claiming_credits_managed_in_settings',
      message: 'Upload attendee reward links from Settings.'
    })
  }

  const creditOfferId = crypto.randomUUID()
  const createdAt = new Date().toISOString()
  const latestOffer = await database.query.eventCreditOffers.findFirst({
    where: eq(eventCreditOffers.eventId, eventId),
    orderBy: [desc(eventCreditOffers.displayOrder), desc(eventCreditOffers.createdAt)]
  })
  const displayOrder = body.displayOrder ?? ((latestOffer?.displayOrder ?? 0) + 1)

  await getD1Binding(h3Event).prepare(`
    insert into event_credit_offers (
      id, event_id, name, description, display_order, created_at, updated_at
    )
    values (?, ?, ?, ?, ?, ?, ?)
  `).bind(
    creditOfferId,
    eventId,
    body.name,
    body.description,
    displayOrder,
    createdAt,
    createdAt
  ).run()

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
