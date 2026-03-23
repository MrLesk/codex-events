import { requirePlatformActor } from '../auth/actor'
import { getDatabase } from '../database/client'
import { defineApiHandler } from '../utils/api-handler'
import { apiData } from '../utils/api-response'
import {
  platformAccountProfileBodySchema,
  updatePlatformAccountProfile
} from '../utils/account-management'
import { parseValidatedBody } from '../utils/validation'

export default defineApiHandler(async (event) => {
  const actor = await requirePlatformActor(event)
  const body = await parseValidatedBody(event, platformAccountProfileBodySchema)

  const user = await updatePlatformAccountProfile(getDatabase(event), actor.platformUser.id, body)

  return apiData({
    user
  })
})
