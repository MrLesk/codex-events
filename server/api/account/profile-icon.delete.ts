import { requirePlatformActor } from '../../auth/actor'
import { getDatabase } from '../../database/client'
import {
  updatePlatformAccountProfileIconTimestamp
} from '../../utils/account-management'
import { defineApiHandler } from '../../utils/api-handler'
import { apiData } from '../../utils/api-response'
import { deleteProfileIconObject } from '../../utils/profile-icons'

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
