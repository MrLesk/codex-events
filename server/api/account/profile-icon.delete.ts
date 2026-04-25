import { requirePlatformActor } from '#server/auth/actor'
import { getDatabase } from '#server/database/client'
import {
  updatePlatformAccountProfileIconTimestamp
} from '#server/utils/account-management'
import { defineApiHandler } from '#server/utils/api-handler'
import { apiData } from '#server/utils/api-response'
import { deleteProfileIconObject } from '#server/utils/profile-icons'

export default defineApiHandler(async (event) => {
  const actor = await requirePlatformActor(event)

  if (actor.platformUser.profileIconUpdatedAt) {
    await deleteProfileIconObject(event, actor.platformUser.id)
  }

  const user = await updatePlatformAccountProfileIconTimestamp(
    getDatabase(event),
    actor.platformUser.id,
    null
  )

  return apiData({
    user
  })
})
