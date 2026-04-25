import { getDatabase } from '#server/database/client'
import { defineApiHandler } from '#server/utils/api-handler'
import { apiList } from '#server/utils/api-response'
import {
  getPublicHackathonBySlugOrThrow,
  routeSlugParamsSchema
} from '#server/utils/hackathon-management'
import { assertWinnersVisible, getWinnersView } from '#server/utils/shortlist'
import { parseValidatedParams } from '#server/utils/validation'

export default defineApiHandler(async (event) => {
  const { slug } = parseValidatedParams(event, routeSlugParamsSchema)
  const database = getDatabase(event)
  const hackathon = await getPublicHackathonBySlugOrThrow(database, slug)

  assertWinnersVisible(hackathon)

  const winners = await getWinnersView(database, hackathon.id)

  return apiList(winners, {
    total: winners.length
  })
})
