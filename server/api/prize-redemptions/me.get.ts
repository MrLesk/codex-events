import { defineApiHandler } from '../../utils/api-handler'
import { apiList } from '../../utils/api-response'
import { listOwnPendingPrizeRedemptions } from '../../utils/prize-redemptions'

export default defineApiHandler(async (event) => {
  const redemptions = await listOwnPendingPrizeRedemptions(event)

  return apiList(redemptions, {
    total: redemptions.length
  })
})
