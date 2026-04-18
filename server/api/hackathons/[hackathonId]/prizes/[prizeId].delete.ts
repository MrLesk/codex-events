import { eq } from 'drizzle-orm'

import { requirePlatformActor } from '../../../../auth/actor'
import { writeAuditLog } from '../../../../database/audit-log'
import { getDatabase } from '../../../../database/client'
import { prizeRedemptions, prizes } from '../../../../database/schema'
import { defineApiHandler } from '../../../../utils/api-handler'
import { ApiError } from '../../../../utils/api-error'
import { apiData } from '../../../../utils/api-response'
import {
  assertPrizeConfigurationEditable,
  getPrizeOrThrow,
  prizeParamsSchema,
  requireHackathonAdmin,
  serializePrize
} from '../../../../utils/hackathon-management'
import { parseValidatedParams } from '../../../../utils/validation'

export default defineApiHandler(async (event) => {
  const actor = await requirePlatformActor(event)
  const { hackathonId, prizeId } = parseValidatedParams(event, prizeParamsSchema)
  const database = getDatabase(event)

  const { hackathon } = await requireHackathonAdmin(event, hackathonId)
  assertPrizeConfigurationEditable(hackathon)
  const prize = await getPrizeOrThrow(database, hackathonId, prizeId)

  const existingRedemption = await database.query.prizeRedemptions.findFirst({
    where: eq(prizeRedemptions.prizeId, prizeId)
  })

  if (existingRedemption) {
    throw new ApiError({
      statusCode: 409,
      code: 'prize_has_redemptions',
      message: 'This prize cannot be deleted because prize redemptions already reference it.',
      details: {
        hackathonId,
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
      hackathonId
    }
  })

  return apiData(serializePrize(prize))
})
