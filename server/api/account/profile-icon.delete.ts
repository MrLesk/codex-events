import { requirePlatformActor } from '#server/auth/actor'
import { getDatabase } from '#server/database/client'
import {
  updatePlatformAccountProfileIcon
} from '#server/domains/accounts'
import { defineApiHandler } from '#server/http/api-handler'
import { apiData } from '#server/http/api-response'

export default defineApiHandler(async (h3Event) => {
  const actor = await requirePlatformActor(h3Event)

  const user = await updatePlatformAccountProfileIcon(
    getDatabase(h3Event),
    actor.platformUser.id,
    {
      profileIconUpdatedAt: null,
      profileIconObjectKey: null
    }
  )

  return apiData({
    user
  })
})
