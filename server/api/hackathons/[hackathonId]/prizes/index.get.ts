import { asc, desc, eq } from 'drizzle-orm'

import { getDatabase } from '#server/database/client'
import { prizes } from '#server/database/schema'
import { defineApiHandler } from '#server/http/api-handler'
import { apiList } from '#server/http/api-response'
import { getVisibleHackathonOrThrow, routeIdParamsSchema, serializePrize } from '#server/utils/hackathon-management'
import { parseValidatedParams } from '#server/http/validation'

export default defineApiHandler(async (event) => {
  const { hackathonId } = parseValidatedParams(event, routeIdParamsSchema)
  const database = getDatabase(event)

  await getVisibleHackathonOrThrow(event, hackathonId)

  const prizeList = await database.query.prizes.findMany({
    where: eq(prizes.hackathonId, hackathonId),
    orderBy: [asc(prizes.displayOrder), asc(prizes.rankEnd), desc(prizes.rankStart), asc(prizes.createdAt)]
  })

  return apiList(
    prizeList.map(serializePrize),
    {
      total: prizeList.length
    }
  )
})
