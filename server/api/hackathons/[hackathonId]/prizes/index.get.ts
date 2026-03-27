import { asc, eq } from 'drizzle-orm'

import { getDatabase } from '../../../../database/client'
import { prizes } from '../../../../database/schema'
import { defineApiHandler } from '../../../../utils/api-handler'
import { apiList } from '../../../../utils/api-response'
import { getVisibleHackathonOrThrow, routeIdParamsSchema, serializePrize } from '../../../../utils/hackathon-management'
import { parseValidatedParams } from '../../../../utils/validation'

export default defineApiHandler(async (event) => {
  const { hackathonId } = parseValidatedParams(event, routeIdParamsSchema)
  const database = getDatabase(event)

  await getVisibleHackathonOrThrow(event, hackathonId)

  const prizeList = await database.query.prizes.findMany({
    where: eq(prizes.hackathonId, hackathonId),
    orderBy: [asc(prizes.displayOrder), asc(prizes.rankStart), asc(prizes.rankEnd), asc(prizes.createdAt)]
  })

  return apiList(
    prizeList.map(serializePrize),
    {
      total: prizeList.length
    }
  )
})
