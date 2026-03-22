import { getDatabase } from '../../../../database/client'
import { defineApiHandler } from '../../../../utils/api-handler'
import { apiData } from '../../../../utils/api-response'
import { requireHackathonAdmin, routeIdParamsSchema } from '../../../../utils/hackathon-management'
import { listHackathonPrizeRedemptions } from '../../../../utils/prize-redemptions'
import { getWinnersView } from '../../../../utils/shortlist'
import { parseValidatedParams } from '../../../../utils/validation'

export default defineApiHandler(async (event) => {
  const { hackathonId } = parseValidatedParams(event, routeIdParamsSchema)
  const database = getDatabase(event)

  await requireHackathonAdmin(event, hackathonId)

  const [winners, redemptions] = await Promise.all([
    getWinnersView(database, hackathonId),
    listHackathonPrizeRedemptions(database, hackathonId)
  ])

  return apiData({
    winners,
    redemptions
  })
})
