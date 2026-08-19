import { requirePlatformActor } from '#server/auth/actor'
import { getDatabase } from '#server/database/client'
import { getAccountPrizeRedemptionsPage } from '#server/domains/prize-redemptions/account-workspace-page'
import { defineApiHandler } from '#server/http/api-handler'
import { apiData } from '#server/http/api-response'

export default defineApiHandler(async (event) => {
  const actor = await requirePlatformActor(event)

  return apiData(await getAccountPrizeRedemptionsPage(
    getDatabase(event),
    actor.platformUser.id
  ))
})
