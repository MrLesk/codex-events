import { defineApiHandler } from '#server/http/api-handler'
import { apiList } from '#server/http/api-response'
import { listOwnPendingPrizeRedemptions } from '#server/domains/prize-redemptions'

export default defineApiHandler(async (h3Event) => {
  const redemptions = await listOwnPendingPrizeRedemptions(h3Event)

  return apiList(redemptions, {
    total: redemptions.length
  })
})
