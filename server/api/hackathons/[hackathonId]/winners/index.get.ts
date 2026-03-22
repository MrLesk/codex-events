import { getDatabase } from '../../../../database/client'
import { defineApiHandler } from '../../../../utils/api-handler'
import { apiList } from '../../../../utils/api-response'
import { getVisibleHackathonOrThrow, routeIdParamsSchema } from '../../../../utils/hackathon-management'
import { assertWinnersVisible, getWinnersView } from '../../../../utils/shortlist'
import { parseValidatedParams } from '../../../../utils/validation'

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
