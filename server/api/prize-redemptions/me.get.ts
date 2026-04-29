import { defineApiHandler } from '#server/http/api-handler'
import { apiList } from '#server/http/api-response'
import { listOwnPendingPrizeRedemptions } from '#server/utils/prize-redemptions'

export default defineApiHandler(async (event) => {
  const redemptions = await listOwnPendingPrizeRedemptions(event)

  return apiList(redemptions, {
    total: redemptions.length
  })
})
