import { desc, eq } from 'drizzle-orm'

import { requirePlatformActor } from '../../../../auth/actor'
import { writeAuditLog } from '../../../../database/audit-log'
import { getDatabase } from '../../../../database/client'
import { hackathonCreditOffers } from '../../../../database/schema'
import { defineApiHandler } from '../../../../utils/api-handler'
import { apiData } from '../../../../utils/api-response'
import {
  createHackathonCreditOfferBodySchema,
  serializeHackathonCreditOffer
} from '../../../../utils/hackathon-credits'
import { requireHackathonAdmin, routeIdParamsSchema } from '../../../../utils/hackathon-management'
import { parseValidatedBody, parseValidatedParams } from '../../../../utils/validation'

export default defineApiHandler(async (event) => {
  const actor = await requirePlatformActor(event)
  const { hackathonId } = parseValidatedParams(event, routeIdParamsSchema)
  const body = await parseValidatedBody(event, createHackathonCreditOfferBodySchema)
  const database = getDatabase(event)

  await requireHackathonAdmin(event, hackathonId)

  const creditOfferId = crypto.randomUUID()
  const createdAt = new Date().toISOString()
  const latestOffer = await database.query.hackathonCreditOffers.findFirst({
    where: eq(hackathonCreditOffers.hackathonId, hackathonId),
    orderBy: [desc(hackathonCreditOffers.displayOrder), desc(hackathonCreditOffers.createdAt)]
  })
  const displayOrder = body.displayOrder ?? ((latestOffer?.displayOrder ?? 0) + 1)

  await database.insert(hackathonCreditOffers).values({
    id: creditOfferId,
    hackathonId,
    name: body.name,
    description: body.description,
    displayOrder,
    createdAt,
    updatedAt: createdAt
  })

  const offer = await database.query.hackathonCreditOffers.findFirst({
    where: eq(hackathonCreditOffers.id, creditOfferId)
  })

  await writeAuditLog(database, {
    actorUserId: actor.platformUser.id,
    entityType: 'hackathon_credit_offer',
    entityId: creditOfferId,
    action: 'hackathon_credit_offer.created',
    metadata: {
      hackathonId
    }
  })

  return apiData(serializeHackathonCreditOffer(offer!))
})
