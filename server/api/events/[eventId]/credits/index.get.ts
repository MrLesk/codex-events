import type {
  eventCreditCodes,
  eventCreditOffers
} from '#server/database/schema'

import { apiList } from '#server/http/api-response'
import { defineApiHandler } from '#server/http/api-handler'
import {
  listEventCreditCodesForEvent,
  listEventCreditOffers,
  requireEventCreditsViewAccess,
  serializeParticipantEventCreditOffer
} from '#server/domains/credits'
import { routeIdParamsSchema } from '#server/domains/events'
import { parseValidatedParams } from '#server/http/validation'

type EventCreditOfferRecord = typeof eventCreditOffers.$inferSelect
type EventCreditCodeRecord = typeof eventCreditCodes.$inferSelect

export default defineApiHandler(async (h3Event) => {
  const { eventId } = parseValidatedParams(h3Event, routeIdParamsSchema)
  const { actor, database, canClaimCredits } = await requireEventCreditsViewAccess(h3Event, eventId)
  const offers: EventCreditOfferRecord[] = await listEventCreditOffers(database, eventId)
  const codes: EventCreditCodeRecord[] = await listEventCreditCodesForEvent(database, eventId)
  const codesByOfferId = new Map<string, EventCreditCodeRecord[]>()

  for (const code of codes) {
    const existing = codesByOfferId.get(code.creditOfferId) ?? []
    existing.push(code)
    codesByOfferId.set(code.creditOfferId, existing)
  }

  return apiList(
    offers.map(offer => serializeParticipantEventCreditOffer(
      offer,
      codesByOfferId.get(offer.id) ?? [],
      canClaimCredits ? actor.platformUser.id : null
    )),
    {
      total: offers.length
    }
  )
})
