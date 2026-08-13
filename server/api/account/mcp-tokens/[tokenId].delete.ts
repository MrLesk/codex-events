import { requirePlatformActor } from '#server/auth/actor'
import { getDatabase } from '#server/database/client'
import { mcpAccessTokenParamsSchema, revokeMcpAccessToken } from '#server/domains/mcp/tokens'
import { defineApiHandler } from '#server/http/api-handler'
import { apiData } from '#server/http/api-response'
import { parseValidatedParams } from '#server/http/validation'

export default defineApiHandler(async (event) => {
  const actor = await requirePlatformActor(event)
  const { tokenId } = parseValidatedParams(event, mcpAccessTokenParamsSchema)
  return apiData(await revokeMcpAccessToken(getDatabase(event), actor.platformUser.id, tokenId))
})
