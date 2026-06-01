import { and, eq, getTableColumns, isNotNull } from 'drizzle-orm'

import { getDatabase } from '#server/database/client'
import { eventCreditCodes, eventCreditOffers, users } from '#server/database/schema'
import { defineApiHandler } from '#server/http/api-handler'
import { apiList } from '#server/http/api-response'
import { requireEventAdmin, routeIdParamsSchema } from '#server/domains/events'
import {
  listEventCreditCodesForEvent,
  listEventCreditOffers,
  serializeAdminEventCreditOffer
} from '#server/domains/credits'
import { parseValidatedParams } from '#server/http/validation'

type EventCreditOfferRecord = typeof eventCreditOffers.$inferSelect
type EventCreditCodeRecord = typeof eventCreditCodes.$inferSelect
type UserRecord = typeof users.$inferSelect

export default defineApiHandler(async (h3Event) => {
  const { eventId } = parseValidatedParams(h3Event, routeIdParamsSchema)
  await requireEventAdmin(h3Event, eventId)

  const database = getDatabase(h3Event)
  const offers: EventCreditOfferRecord[] = await listEventCreditOffers(database, eventId)
  const codes: EventCreditCodeRecord[] = await listEventCreditCodesForEvent(database, eventId)
  const claimingUsers: UserRecord[] = await database
    .select(getTableColumns(users))
    .from(users)
    .innerJoin(eventCreditCodes, eq(eventCreditCodes.claimedByUserId, users.id))
    .innerJoin(eventCreditOffers, eq(eventCreditOffers.id, eventCreditCodes.creditOfferId))
    .where(and(
      eq(eventCreditOffers.eventId, eventId),
      isNotNull(eventCreditCodes.claimedByUserId)
    ))
  const usersById = new Map(claimingUsers.map(user => [user.id, user] as const))
  const codesByOfferId = new Map<string, typeof codes>()

  for (const code of codes) {
    const existing = codesByOfferId.get(code.creditOfferId) ?? []
    existing.push(code)
    codesByOfferId.set(code.creditOfferId, existing)
  }

  return apiList(
    offers.map(offer => serializeAdminEventCreditOffer(
      offer,
      codesByOfferId.get(offer.id) ?? [],
      usersById
    )),
    {
      total: offers.length
    }
  )
})
