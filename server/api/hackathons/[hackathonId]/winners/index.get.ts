import { getDatabase } from '#server/database/client'
import { defineApiHandler } from '#server/http/api-handler'
import { apiList } from '#server/http/api-response'
import { getVisibleHackathonOrThrow, routeIdParamsSchema } from '#server/utils/hackathon-management'
import { assertWinnersVisible, getWinnersView } from '#server/utils/shortlist'
import { parseValidatedParams } from '#server/http/validation'

export default defineApiHandler(async (event) => {
  const { hackathonId } = parseValidatedParams(event, routeIdParamsSchema)
  const database = getDatabase(event)
  const hackathon = await getVisibleHackathonOrThrow(event, hackathonId)

  assertWinnersVisible(hackathon)

  const winners = await getWinnersView(database, hackathonId)

  return apiList(winners, {
    total: winners.length
  })
})
