import { requirePlatformAccountActor } from '#server/auth/actor'
import { getDatabase } from '#server/database/client'
import { deletePlatformAccount } from '#server/domains/accounts'
import { defineApiHandler } from '#server/http/api-handler'
import { apiData } from '#server/http/api-response'
import { deleteProfileIconObject } from '#server/domains/accounts/profile-icons'

export default defineApiHandler(async (event) => {
  const actor = await requirePlatformAccountActor(event)

  if (actor.platformUser.profileIconUpdatedAt) {
    await deleteProfileIconObject(event, actor.platformUser.id)
  }

  const result = await deletePlatformAccount(getDatabase(event), {
    userId: actor.platformUser.id
  })

  return apiData(result)
})
