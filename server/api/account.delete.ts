import { requirePlatformAccountActor } from '../auth/actor'
import { getDatabase } from '../database/client'
import { deletePlatformAccount } from '../utils/account-management'
import { defineApiHandler } from '../utils/api-handler'
import { apiData } from '../utils/api-response'
import { deleteProfileIconObject } from '../utils/profile-icons'

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
