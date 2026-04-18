import { desc, eq } from 'drizzle-orm'

import { requirePlatformActor } from '../../../../auth/actor'
import { writeAuditLog } from '../../../../database/audit-log'
import { getDatabase } from '../../../../database/client'
import { prizes } from '../../../../database/schema'
import { defineApiHandler } from '../../../../utils/api-handler'
import { apiData } from '../../../../utils/api-response'
import {
  assertPrizeConfigurationEditable,
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

  const { hackathon } = await requireHackathonAdmin(event, hackathonId)
  assertPrizeConfigurationEditable(hackathon)

  const prizeId = crypto.randomUUID()
  const createdAt = new Date().toISOString()
  const latestPrize = await database.query.prizes.findFirst({
    where: eq(prizes.hackathonId, hackathonId),
    orderBy: [desc(prizes.displayOrder), desc(prizes.createdAt)]
  })
  const displayOrder = body.displayOrder ?? ((latestPrize?.displayOrder ?? 0) + 1)

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
    displayOrder,
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
