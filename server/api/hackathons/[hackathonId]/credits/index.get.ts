import type {
  hackathonCreditCodes,
  hackathonCreditOffers
} from '#server/database/schema'

import { apiList } from '#server/http/api-response'
import { defineApiHandler } from '#server/http/api-handler'
import {
  listHackathonCreditCodesForHackathon,
  listHackathonCreditOffers,
  requireHackathonCreditsViewAccess,
  serializeParticipantHackathonCreditOffer
} from '#server/domains/credits'
import { routeIdParamsSchema } from '#server/domains/hackathons'
import { parseValidatedParams } from '#server/http/validation'

type HackathonCreditOfferRecord = typeof hackathonCreditOffers.$inferSelect
type HackathonCreditCodeRecord = typeof hackathonCreditCodes.$inferSelect

export default defineApiHandler(async (event) => {
  const { hackathonId } = parseValidatedParams(event, routeIdParamsSchema)
  const { actor, database, approvedApplication } = await requireHackathonCreditsViewAccess(event, hackathonId)
  const offers: HackathonCreditOfferRecord[] = await listHackathonCreditOffers(database, hackathonId)
  const codes: HackathonCreditCodeRecord[] = await listHackathonCreditCodesForHackathon(database, hackathonId)
  const codesByOfferId = new Map<string, HackathonCreditCodeRecord[]>()

  for (const code of codes) {
    const existing = codesByOfferId.get(code.creditOfferId) ?? []
    existing.push(code)
    codesByOfferId.set(code.creditOfferId, existing)
  }

  return apiList(
    offers.map(offer => serializeParticipantHackathonCreditOffer(
      offer,
      codesByOfferId.get(offer.id) ?? [],
      approvedApplication ? actor.platformUser.id : null
    )),
    {
      total: offers.length
    }
  )
})
