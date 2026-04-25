import { defineApiHandler } from '#server/utils/api-handler'
import { apiList } from '#server/utils/api-response'
import { listOwnPendingPrizeRedemptions } from '#server/utils/prize-redemptions'

export default defineApiHandler(async (event) => {
  const redemptions = await listOwnPendingPrizeRedemptions(event)

  return apiList(redemptions, {
    total: redemptions.length
  })
})
