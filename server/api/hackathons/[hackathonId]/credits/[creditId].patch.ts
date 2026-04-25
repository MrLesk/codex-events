import { eq } from 'drizzle-orm'

import { requirePlatformActor } from '#server/auth/actor'
import { writeAuditLog } from '#server/database/audit-log'
import { getDatabase } from '#server/database/client'
import { hackathonCreditOffers } from '#server/database/schema'
import { defineApiHandler } from '#server/utils/api-handler'
import { apiData } from '#server/utils/api-response'
import {
  creditParamsSchema,
  getHackathonCreditOfferOrThrow,
  serializeHackathonCreditOffer,
  updateHackathonCreditOfferBodySchema
} from '#server/utils/hackathon-credits'
import { requireHackathonAdmin } from '#server/utils/hackathon-management'
import { parseValidatedBody, parseValidatedParams } from '#server/utils/validation'

export default defineApiHandler(async (event) => {
  const actor = await requirePlatformActor(event)
  const { hackathonId, creditId } = parseValidatedParams(event, creditParamsSchema)
  const body = await parseValidatedBody(event, updateHackathonCreditOfferBodySchema)
  const database = getDatabase(event)

  await requireHackathonAdmin(event, hackathonId)
  await getHackathonCreditOfferOrThrow(database, hackathonId, creditId)

  await database
    .update(hackathonCreditOffers)
    .set({
      ...body,
      updatedAt: new Date().toISOString()
    })
    .where(eq(hackathonCreditOffers.id, creditId))

  const updatedOffer = await getHackathonCreditOfferOrThrow(database, hackathonId, creditId)

  await writeAuditLog(database, {
    actorUserId: actor.platformUser.id,
    entityType: 'hackathon_credit_offer',
    entityId: creditId,
    action: 'hackathon_credit_offer.updated',
    metadata: {
      hackathonId,
      fields: Object.keys(body)
    }
  })

  return apiData(serializeHackathonCreditOffer(updatedOffer))
})
