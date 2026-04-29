import { asc, desc, eq } from 'drizzle-orm'

import { getDatabase } from '#server/database/client'
import { prizes } from '#server/database/schema'
import { defineApiHandler } from '#server/http/api-handler'
import { apiList } from '#server/http/api-response'
import { getPublicHackathonBySlugOrThrow, routeSlugParamsSchema, serializePublicPrize } from '#server/utils/hackathon-management'
import { parseValidatedParams } from '#server/http/validation'

export default defineApiHandler(async (event) => {
  const { slug } = parseValidatedParams(event, routeSlugParamsSchema)
  const database = getDatabase(event)
  const hackathon = await getPublicHackathonBySlugOrThrow(database, slug)

  const prizeList = await database.query.prizes.findMany({
    where: eq(prizes.hackathonId, hackathon.id),
    orderBy: [asc(prizes.displayOrder), asc(prizes.rankEnd), desc(prizes.rankStart), asc(prizes.createdAt)]
  })

  return apiList(
    prizeList.map(serializePublicPrize),
    {
      total: prizeList.length
    }
  )
})
