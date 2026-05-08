import { requirePlatformActor } from '#server/auth/actor'
import { getDatabase } from '#server/database/client'
import {
  updatePlatformAccountProfileIconTimestamp
} from '#server/domains/accounts'
import { defineApiHandler } from '#server/http/api-handler'
import { apiData } from '#server/http/api-response'
import { deleteProfileIconObject } from '#server/domains/accounts/profile-icons'

export default defineApiHandler(async (h3Event) => {
  const actor = await requirePlatformActor(h3Event)

  if (actor.platformUser.profileIconUpdatedAt) {
    await deleteProfileIconObject(h3Event, actor.platformUser.id)
  }

  const user = await updatePlatformAccountProfileIconTimestamp(
    getDatabase(h3Event),
    actor.platformUser.id,
    null
  )

  return apiData({
    user
  })
})
