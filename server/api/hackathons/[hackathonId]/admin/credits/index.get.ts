import { and, eq, getTableColumns, isNotNull } from 'drizzle-orm'

import { getDatabase } from '#server/database/client'
import { hackathonCreditCodes, hackathonCreditOffers, users } from '#server/database/schema'
import { defineApiHandler } from '#server/http/api-handler'
import { apiList } from '#server/http/api-response'
import { requireHackathonAdmin, routeIdParamsSchema } from '#server/utils/hackathon-management'
import {
  listHackathonCreditCodesForHackathon,
  listHackathonCreditOffers,
  serializeAdminHackathonCreditOffer
} from '#server/utils/hackathon-credits'
import { parseValidatedParams } from '#server/http/validation'

type HackathonCreditOfferRecord = typeof hackathonCreditOffers.$inferSelect
type HackathonCreditCodeRecord = typeof hackathonCreditCodes.$inferSelect
type UserRecord = typeof users.$inferSelect

export default defineApiHandler(async (event) => {
  const { hackathonId } = parseValidatedParams(event, routeIdParamsSchema)
  await requireHackathonAdmin(event, hackathonId)

  const database = getDatabase(event)
  const offers: HackathonCreditOfferRecord[] = await listHackathonCreditOffers(database, hackathonId)
  const codes: HackathonCreditCodeRecord[] = await listHackathonCreditCodesForHackathon(database, hackathonId)
  const claimingUsers: UserRecord[] = await database
    .select(getTableColumns(users))
    .from(users)
    .innerJoin(hackathonCreditCodes, eq(hackathonCreditCodes.claimedByUserId, users.id))
    .innerJoin(hackathonCreditOffers, eq(hackathonCreditOffers.id, hackathonCreditCodes.creditOfferId))
    .where(and(
      eq(hackathonCreditOffers.hackathonId, hackathonId),
      isNotNull(hackathonCreditCodes.claimedByUserId)
    ))
  const usersById = new Map(claimingUsers.map(user => [user.id, user] as const))
  const codesByOfferId = new Map<string, typeof codes>()

  for (const code of codes) {
    const existing = codesByOfferId.get(code.creditOfferId) ?? []
    existing.push(code)
    codesByOfferId.set(code.creditOfferId, existing)
  }

  return apiList(
    offers.map(offer => serializeAdminHackathonCreditOffer(
      offer,
      codesByOfferId.get(offer.id) ?? [],
      usersById
    )),
    {
      total: offers.length
    }
  )
})
