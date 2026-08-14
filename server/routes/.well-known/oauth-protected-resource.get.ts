import { createError, defineEventHandler, setResponseHeader } from 'h3'

import {
  buildMcpProtectedResourceMetadata,
  resolveMcpOAuthConfiguration
} from '#server/domains/mcp/oauth'

export default defineEventHandler((event) => {
  const runtimeConfig = useRuntimeConfig(event)
  const configuration = resolveMcpOAuthConfiguration({
    auth0Domain: runtimeConfig.auth0.domain,
    resourceUrl: runtimeConfig.mcp.resourceUrl,
    scope: runtimeConfig.mcp.oauthScope
  })

  if (!configuration) {
    throw createError({ statusCode: 503, statusMessage: 'MCP OAuth is not configured.' })
  }

  setResponseHeader(event, 'cache-control', 'public, max-age=300')
  return buildMcpProtectedResourceMetadata(configuration)
})
