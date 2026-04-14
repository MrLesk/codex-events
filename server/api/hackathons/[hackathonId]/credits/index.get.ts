import type {
  hackathonCreditCodes,
  hackathonCreditOffers
} from '../../../../database/schema'

import { apiList } from '../../../../utils/api-response'
import { defineApiHandler } from '../../../../utils/api-handler'
import {
  listHackathonCreditCodesByOfferId,
  listHackathonCreditOffers,
  requireHackathonCreditsViewAccess,
  serializeParticipantHackathonCreditOffer
} from '../../../../utils/hackathon-credits'
import { routeIdParamsSchema } from '../../../../utils/hackathon-management'
import { parseValidatedParams } from '../../../../utils/validation'

type HackathonCreditOfferRecord = typeof hackathonCreditOffers.$inferSelect
type HackathonCreditCodeRecord = typeof hackathonCreditCodes.$inferSelect

export default defineApiHandler(async (event) => {
  const { hackathonId } = parseValidatedParams(event, routeIdParamsSchema)
  const { actor, database, approvedApplication } = await requireHackathonCreditsViewAccess(event, hackathonId)
  const offers: HackathonCreditOfferRecord[] = await listHackathonCreditOffers(database, hackathonId)
  const codes: HackathonCreditCodeRecord[] = await listHackathonCreditCodesByOfferId(database, offers.map(offer => offer.id))
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
