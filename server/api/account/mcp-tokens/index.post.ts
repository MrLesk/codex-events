import { requirePlatformActor } from '#server/auth/actor'
import { getDatabase } from '#server/database/client'
import { createMcpAccessToken, createMcpAccessTokenBodySchema } from '#server/domains/mcp/tokens'
import { defineApiHandler } from '#server/http/api-handler'
import { apiData } from '#server/http/api-response'
import { parseValidatedBody } from '#server/http/validation'

export default defineApiHandler(async (event) => {
  const actor = await requirePlatformActor(event)
  const body = await parseValidatedBody(event, createMcpAccessTokenBodySchema)
  return apiData(await createMcpAccessToken(getDatabase(event), actor.platformUser.id, body))
})
