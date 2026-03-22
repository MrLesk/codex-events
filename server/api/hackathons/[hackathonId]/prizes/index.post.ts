import { eq } from 'drizzle-orm'

import { requirePlatformActor } from '../../../../auth/actor'
import { writeAuditLog } from '../../../../database/audit-log'
import { getDatabase } from '../../../../database/client'
import { prizes } from '../../../../database/schema'
import { defineApiHandler } from '../../../../utils/api-handler'
import { apiData } from '../../../../utils/api-response'
import {
  createPrizeBodySchema,
  requireHackathonAdmin,
  routeIdParamsSchema,
  serializePrize
} from '../../../../utils/hackathon-management'
import { parseValidatedBody, parseValidatedParams } from '../../../../utils/validation'

export default defineApiHandler(async (event) => {
  const actor = await requirePlatformActor(event)
  const { hackathonId } = parseValidatedParams(event, routeIdParamsSchema)
  const body = await parseValidatedBody(event, createPrizeBodySchema)
  const database = getDatabase(event)

  await requireHackathonAdmin(event, hackathonId)

  const prizeId = crypto.randomUUID()
  const createdAt = new Date().toISOString()

  await database.insert(prizes).values({
    id: prizeId,
    hackathonId,
    name: body.name,
    description: body.description,
    rewardType: body.rewardType,
    rewardValue: body.rewardValue,
    rewardCurrency: body.rewardCurrency ?? null,
    awardScope: body.awardScope,
    rankStart: body.rankStart,
    rankEnd: body.rankEnd,
    createdAt
  })

  const prize = await database.query.prizes.findFirst({
    where: eq(prizes.id, prizeId)
  })

  await writeAuditLog(database, {
    actorUserId: actor.platformUser.id,
    entityType: 'prize',
    entityId: prizeId,
    action: 'prize.created',
    metadata: {
      hackathonId,
      awardScope: body.awardScope,
      rankStart: body.rankStart,
      rankEnd: body.rankEnd
    }
  })

  return apiData(serializePrize(prize!))
})
