import { asc, eq } from 'drizzle-orm'

import { getDatabase } from '../../../../../database/client'
import { prizes } from '../../../../../database/schema'
import { defineApiHandler } from '../../../../../utils/api-handler'
import { apiList } from '../../../../../utils/api-response'
import { getPublicHackathonBySlugOrThrow, routeSlugParamsSchema, serializePublicPrize } from '../../../../../utils/hackathon-management'
import { parseValidatedParams } from '../../../../../utils/validation'

export default defineApiHandler(async (event) => {
  const { slug } = parseValidatedParams(event, routeSlugParamsSchema)
  const database = getDatabase(event)
  const hackathon = await getPublicHackathonBySlugOrThrow(database, slug)

  const prizeList = await database.query.prizes.findMany({
    where: eq(prizes.hackathonId, hackathon.id),
    orderBy: [asc(prizes.displayOrder), asc(prizes.rankStart), asc(prizes.rankEnd), asc(prizes.createdAt)]
  })

  return apiList(
    prizeList.map(serializePublicPrize),
    {
      total: prizeList.length
    }
  )
})
