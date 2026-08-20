import { requirePlatformAccountActor } from '#server/auth/actor'
import { getDatabase } from '#server/database/client'
import { deletePlatformAccount } from '#server/domains/accounts'
import { defineApiHandler } from '#server/http/api-handler'
import { apiData } from '#server/http/api-response'

export default defineApiHandler(async (h3Event) => {
  const actor = await requirePlatformAccountActor(h3Event)

  const result = await deletePlatformAccount(getDatabase(h3Event), {
    userId: actor.platformUser.id
  })

  return apiData(result)
})
