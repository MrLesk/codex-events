import { requirePlatformAccountActor } from '#server/auth/actor'
import { getDatabase } from '#server/database/client'
import { deletePlatformAccount } from '#server/utils/account-management'
import { defineApiHandler } from '#server/utils/api-handler'
import { apiData } from '#server/utils/api-response'
import { deleteProfileIconObject } from '#server/utils/profile-icons'

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
