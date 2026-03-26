import { requirePlatformAccountActor } from '../auth/actor'
import { getDatabase } from '../database/client'
import { deletePlatformAccount } from '../utils/account-management'
import { defineApiHandler } from '../utils/api-handler'
import { apiData } from '../utils/api-response'

export default defineApiHandler(async (event) => {
  const actor = await requirePlatformAccountActor(event)
  const result = await deletePlatformAccount(getDatabase(event), {
    userId: actor.platformUser.id
  })

  return apiData(result)
})
