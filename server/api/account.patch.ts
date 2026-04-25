import { requirePlatformActor } from '#server/auth/actor'
import { getDatabase } from '#server/database/client'
import { defineApiHandler } from '#server/utils/api-handler'
import { apiData } from '#server/utils/api-response'
import {
  platformAccountProfileBodySchema,
  updatePlatformAccountProfile
} from '#server/utils/account-management'
import { parseValidatedBody } from '#server/utils/validation'

export default defineApiHandler(async (event) => {
  const actor = await requirePlatformActor(event)
  const body = await parseValidatedBody(event, platformAccountProfileBodySchema)

  const user = await updatePlatformAccountProfile(getDatabase(event), actor.platformUser.id, body)

  return apiData({
    user
  })
})
