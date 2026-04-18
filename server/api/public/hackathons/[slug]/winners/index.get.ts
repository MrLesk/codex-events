import { getDatabase } from '../../../../../database/client'
import { defineApiHandler } from '../../../../../utils/api-handler'
import { apiList } from '../../../../../utils/api-response'
import {
  getPublicHackathonBySlugOrThrow,
  routeSlugParamsSchema
} from '../../../../../utils/hackathon-management'
import { assertWinnersVisible, getWinnersView } from '../../../../../utils/shortlist'
import { parseValidatedParams } from '../../../../../utils/validation'

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
