import type { JWTVerifyGetKey } from 'jose'
import { createRemoteJWKSet, jwtVerify } from 'jose'

import type { AppDatabase } from '#server/database/client'
import { findPlatformUserByAuth0Subject } from '#server/domains/accounts/auth-identities'

export const defaultMcpOAuthScope = 'mcp:access'

export interface McpOAuthConfiguration {
  issuer: string
  resourceUrl: string
  scope: string
}

export interface McpOAuthIdentity {
  user: NonNullable<Awaited<ReturnType<typeof findPlatformUserByAuth0Subject>>>
  subject: string
  clientId: string
}

const remoteKeySets = new Map<string, JWTVerifyGetKey>()

function normalizeIssuer(domain: string | undefined) {
  const value = domain?.trim()
  if (!value) return null

  try {
    const url = new URL(value.startsWith('http://') || value.startsWith('https://') ? value : `https://${value}`)
    if (url.protocol !== 'https:' && url.hostname !== 'localhost') return null
    url.pathname = '/'
    url.search = ''
    url.hash = ''
    return url.toString()
  } catch {
    return null
  }
}

function normalizeResourceUrl(value: string | undefined) {
  try {
    const url = new URL(value?.trim() ?? '')
    if ((url.protocol !== 'https:' && url.hostname !== 'localhost') || url.pathname !== '/mcp') return null
    url.search = ''
    url.hash = ''
    return url.toString()
  } catch {
    return null
  }
}

export function resolveMcpOAuthConfiguration(input: {
  auth0Domain?: string
  resourceUrl?: string
  scope?: string
}): McpOAuthConfiguration | null {
  const issuer = normalizeIssuer(input.auth0Domain)
  const resourceUrl = normalizeResourceUrl(input.resourceUrl)
  const scope = input.scope?.trim() || defaultMcpOAuthScope
  return issuer && resourceUrl ? { issuer, resourceUrl, scope } : null
}

export function buildMcpProtectedResourceMetadata(configuration: McpOAuthConfiguration) {
  return {
    resource: configuration.resourceUrl,
    authorization_servers: [configuration.issuer],
    scopes_supported: [configuration.scope],
    bearer_methods_supported: ['header']
  }
}

export function mcpProtectedResourceMetadataUrl(configuration: McpOAuthConfiguration) {
  return new URL('/.well-known/oauth-protected-resource', configuration.resourceUrl).toString()
}

function remoteKeySet(configuration: McpOAuthConfiguration) {
  const existing = remoteKeySets.get(configuration.issuer)
  if (existing) return existing

  const created = createRemoteJWKSet(new URL('.well-known/jwks.json', configuration.issuer))
  remoteKeySets.set(configuration.issuer, created)
  return created
}

export async function verifyMcpOAuthAccessToken(
  credential: string,
  configuration: McpOAuthConfiguration,
  keySet: JWTVerifyGetKey = remoteKeySet(configuration)
) {
  const { payload } = await jwtVerify(credential, keySet, {
    issuer: configuration.issuer,
    audience: configuration.resourceUrl,
    requiredClaims: ['sub', 'exp', 'iat']
  })
  const scopes = new Set(typeof payload.scope === 'string' ? payload.scope.split(/\s+/u).filter(Boolean) : [])
  if (!scopes.has(configuration.scope)) return null

  const subject = payload.sub?.trim() ?? ''
  const clientId = typeof payload.client_id === 'string'
    ? payload.client_id.trim()
    : typeof payload.azp === 'string'
      ? payload.azp.trim()
      : ''
  if (!subject || !clientId) return null

  return { subject, clientId }
}

export async function authenticateMcpOAuthCredential(
  database: AppDatabase,
  credential: string,
  configuration: McpOAuthConfiguration,
  keySet?: JWTVerifyGetKey
): Promise<McpOAuthIdentity | null> {
  try {
    const claims = await verifyMcpOAuthAccessToken(credential, configuration, keySet)
    if (!claims) return null
    const user = await findPlatformUserByAuth0Subject(database, claims.subject)
    return user ? { user, ...claims } : null
  } catch {
    return null
  }
}
