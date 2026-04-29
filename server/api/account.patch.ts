import { requirePlatformActor } from '#server/auth/actor'
import { getDatabase } from '#server/database/client'
import { defineApiHandler } from '#server/http/api-handler'
import { apiData } from '#server/http/api-response'
import {
  platformAccountProfileBodySchema,
  updatePlatformAccountProfile
} from '#server/domains/accounts'
import { parseValidatedBody } from '#server/http/validation'

export default defineApiHandler(async (event) => {
  const actor = await requirePlatformActor(event)
  const body = await parseValidatedBody(event, platformAccountProfileBodySchema)

  const user = await updatePlatformAccountProfile(getDatabase(event), actor.platformUser.id, body)

  return apiData({
    user
  })
})
