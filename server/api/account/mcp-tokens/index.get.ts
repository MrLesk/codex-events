import { requirePlatformActor } from '#server/auth/actor'
import { getDatabase } from '#server/database/client'
import { listMcpAccessTokens, mcpAccessTokenListQuerySchema } from '#server/domains/mcp/tokens'
import { defineApiHandler } from '#server/http/api-handler'
import { apiList } from '#server/http/api-response'
import { parseValidatedQuery } from '#server/http/validation'

export default defineApiHandler(async (event) => {
  const actor = await requirePlatformActor(event)
  const query = parseValidatedQuery(event, mcpAccessTokenListQuerySchema)
  const result = await listMcpAccessTokens(getDatabase(event), actor.platformUser.id, query)
  return apiList(result.items, result)
})
