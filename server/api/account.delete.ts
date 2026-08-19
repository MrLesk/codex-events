import { requirePlatformAccountActor } from '#server/auth/actor'
import { getDatabase } from '#server/database/client'
import { deletePlatformAccount } from '#server/domains/accounts'
import { deleteProfileIconObjectBestEffort } from '#server/domains/accounts/profile-icons'
import { defineApiHandler } from '#server/http/api-handler'
import { apiData } from '#server/http/api-response'

export default defineApiHandler(async (h3Event) => {
  const actor = await requirePlatformAccountActor(h3Event)
  const previousProfileIconObjectKey = actor.platformUser.profileIconObjectKey

  const result = await deletePlatformAccount(getDatabase(h3Event), {
    userId: actor.platformUser.id
  })

  if (previousProfileIconObjectKey) {
    await deleteProfileIconObjectBestEffort(h3Event, previousProfileIconObjectKey)
  }

  return apiData(result)
})
