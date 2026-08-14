import type { AppDatabase } from '#server/database/client'
import { authenticateMcpCredential, mcpTokenCredentialPrefix } from '#server/domains/mcp/tokens'
import {
  authenticateMcpOAuthCredential,
  type McpOAuthConfiguration
} from '#server/domains/mcp/oauth'

export type McpAuthentication = {
  method: 'manual_token'
  userId: string
  rateLimitKey: string
  auditEntityType: 'mcp_access_token'
  auditEntityId: string
  tokenId: string
} | {
  method: 'oauth'
  userId: string
  rateLimitKey: string
  auditEntityType: 'mcp_oauth_client'
  auditEntityId: string
  tokenId: null
}

export async function authenticateMcpRequest(
  database: AppDatabase,
  credential: string,
  oauthConfiguration: McpOAuthConfiguration | null
): Promise<McpAuthentication | null> {
  if (credential.startsWith(mcpTokenCredentialPrefix)) {
    const authenticated = await authenticateMcpCredential(database, credential)
    return authenticated
      ? {
          method: 'manual_token',
          userId: authenticated.user.id,
          rateLimitKey: `manual:${authenticated.token.id}`,
          auditEntityType: 'mcp_access_token',
          auditEntityId: authenticated.token.id,
          tokenId: authenticated.token.id
        }
      : null
  }

  if (!oauthConfiguration) return null
  const authenticated = await authenticateMcpOAuthCredential(database, credential, oauthConfiguration)
  return authenticated
    ? {
        method: 'oauth',
        userId: authenticated.user.id,
        rateLimitKey: `oauth:${authenticated.user.id}:${authenticated.clientId}`,
        auditEntityType: 'mcp_oauth_client',
        auditEntityId: authenticated.clientId,
        tokenId: null
      }
    : null
}
