import type {
  hackathonCreditCodes,
  hackathonCreditOffers,
  users as usersTable
} from '#server/database/schema'

import { inArray } from 'drizzle-orm'

import { getDatabase } from '#server/database/client'
import { users } from '#server/database/schema'
import { defineApiHandler } from '#server/utils/api-handler'
import { apiList } from '#server/utils/api-response'
import { requireHackathonAdmin, routeIdParamsSchema } from '#server/utils/hackathon-management'
import {
  listHackathonCreditCodesByOfferId,
  listHackathonCreditOffers,
  serializeAdminHackathonCreditOffer
} from '#server/utils/hackathon-credits'
import { parseValidatedParams } from '#server/utils/validation'

type HackathonCreditOfferRecord = typeof hackathonCreditOffers.$inferSelect
type HackathonCreditCodeRecord = typeof hackathonCreditCodes.$inferSelect
type UserRecord = typeof usersTable.$inferSelect

export default defineApiHandler(async (event) => {
  const { hackathonId } = parseValidatedParams(event, routeIdParamsSchema)
  await requireHackathonAdmin(event, hackathonId)

  const database = getDatabase(event)
  const offers: HackathonCreditOfferRecord[] = await listHackathonCreditOffers(database, hackathonId)
  const codes: HackathonCreditCodeRecord[] = await listHackathonCreditCodesByOfferId(database, offers.map(offer => offer.id))
  const claimedUserIds: string[] = [...new Set(
    codes
      .map(code => code.claimedByUserId)
      .filter((userId): userId is string => Boolean(userId))
  )]
  const claimingUsers: UserRecord[] = claimedUserIds.length === 0
    ? []
    : await database.query.users.findMany({
        where: inArray(users.id, claimedUserIds)
      })
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
