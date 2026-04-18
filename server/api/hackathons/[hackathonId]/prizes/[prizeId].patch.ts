import { eq } from 'drizzle-orm'

import { requirePlatformActor } from '../../../../auth/actor'
import { writeAuditLog } from '../../../../database/audit-log'
import { getDatabase } from '../../../../database/client'
import { prizes } from '../../../../database/schema'
import { defineApiHandler } from '../../../../utils/api-handler'
import { ApiError } from '../../../../utils/api-error'
import { apiData } from '../../../../utils/api-response'
import {
  assertPrizeConfigurationEditable,
  getPrizeOrThrow,
  prizeParamsSchema,
  requireHackathonAdmin,
  serializePrize,
  updatePrizeBodySchema
} from '../../../../utils/hackathon-management'
import { parseValidatedBody, parseValidatedParams } from '../../../../utils/validation'

export default defineApiHandler(async (event) => {
  const actor = await requirePlatformActor(event)
  const { hackathonId, prizeId } = parseValidatedParams(event, prizeParamsSchema)
  const body = await parseValidatedBody(event, updatePrizeBodySchema)
  const database = getDatabase(event)

  const { hackathon } = await requireHackathonAdmin(event, hackathonId)
  assertPrizeConfigurationEditable(hackathon)
  const prize = await getPrizeOrThrow(database, hackathonId, prizeId)

  const mergedRankStart = body.rankStart ?? prize.rankStart
  const mergedRankEnd = body.rankEnd ?? prize.rankEnd

  if (mergedRankStart > mergedRankEnd) {
    throw new ApiError({
      statusCode: 400,
      code: 'invalid_prize_rank_range',
      message: 'Prize rankStart must be less than or equal to rankEnd.',
      details: {
        rankStart: mergedRankStart,
        rankEnd: mergedRankEnd
      }
    })
  }

  await database
    .update(prizes)
    .set(body)
    .where(eq(prizes.id, prizeId))

  const updatedPrize = await getPrizeOrThrow(database, hackathonId, prizeId)

  await writeAuditLog(database, {
    actorUserId: actor.platformUser.id,
    entityType: 'prize',
    entityId: prizeId,
    action: 'prize.updated',
    metadata: {
      hackathonId,
      fields: Object.keys(body)
    }
  })

  return apiData(serializePrize(updatedPrize))
})
