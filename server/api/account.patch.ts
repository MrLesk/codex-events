import { requirePlatformActor } from '#server/auth/actor'
import { getDatabase } from '#server/database/client'
import { defineApiHandler } from '#server/http/api-handler'
import { apiData } from '#server/http/api-response'
import {
  platformAccountProfileBodySchema,
  updatePlatformAccountProfile
} from '#server/domains/accounts'
import { parseValidatedBody } from '#server/http/validation'

export default defineApiHandler(async (h3Event) => {
  const actor = await requirePlatformActor(h3Event)
  const body = await parseValidatedBody(h3Event, platformAccountProfileBodySchema)

  const user = await updatePlatformAccountProfile(getDatabase(h3Event), actor.platformUser.id, body)

  return apiData({
    user
  })
})
