import { eq } from 'drizzle-orm'

import { requirePlatformActor } from '#server/auth/actor'
import { writeAuditLog } from '#server/database/audit-log'
import { getDatabase } from '#server/database/client'
import { prizeRedemptions, prizes } from '#server/database/schema'
import { defineApiHandler } from '#server/http/api-handler'
import { ApiError } from '#server/http/api-error'
import { apiData } from '#server/http/api-response'
import {
  assertPrizeConfigurationEditable,
  getPrizeOrThrow,
  prizeParamsSchema,
  requireEventAdmin,
  serializePrize
} from '#server/domains/events'
import { parseValidatedParams } from '#server/http/validation'

export default defineApiHandler(async (h3Event) => {
  const actor = await requirePlatformActor(h3Event)
  const { eventId, prizeId } = parseValidatedParams(h3Event, prizeParamsSchema)
  const database = getDatabase(h3Event)

  const { event } = await requireEventAdmin(h3Event, eventId)
  assertPrizeConfigurationEditable(event)
  const prize = await getPrizeOrThrow(database, eventId, prizeId)

  const existingRedemption = await database.query.prizeRedemptions.findFirst({
    where: eq(prizeRedemptions.prizeId, prizeId)
  })

  if (existingRedemption) {
    throw new ApiError({
      statusCode: 409,
      code: 'prize_has_redemptions',
      message: 'This prize cannot be deleted because prize redemptions already reference it.',
      details: {
        eventId,
        prizeId
      }
    })
  }

  await database
    .delete(prizes)
    .where(eq(prizes.id, prizeId))

  await writeAuditLog(database, {
    actorUserId: actor.platformUser.id,
    entityType: 'prize',
    entityId: prizeId,
    action: 'prize.deleted',
    metadata: {
      eventId
    }
  })

  return apiData(serializePrize(prize))
})
