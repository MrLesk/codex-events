import { createLocalJWKSet, exportJWK, generateKeyPair, SignJWT } from 'jose'
import { describe, expect, test } from 'vitest'

import {
  buildMcpProtectedResourceMetadata,
  mcpProtectedResourceMetadataUrl,
  resolveMcpOAuthConfiguration,
  verifyMcpOAuthAccessToken
} from '../../../../server/domains/mcp/oauth'

describe('MCP OAuth', () => {
  const configuration = {
    issuer: 'https://auth.example.test/',
    resourceUrl: 'https://events.example.test/mcp'
  }

  test('normalizes configuration and publishes protected-resource metadata', () => {
    const resolved = resolveMcpOAuthConfiguration({
      auth0Domain: 'auth.example.test',
      resourceUrl: 'https://events.example.test/mcp'
    })
    expect(resolved).toEqual(configuration)
    expect(buildMcpProtectedResourceMetadata(configuration)).toEqual({
      resource: 'https://events.example.test/mcp',
      authorization_servers: ['https://auth.example.test/'],
      bearer_methods_supported: ['header'],
      scopes_supported: ['mcp']
    })
    expect(mcpProtectedResourceMetadataUrl(configuration))
      .toBe('https://events.example.test/.well-known/oauth-protected-resource')
  })

  test('rejects insecure or non-MCP resource configuration', () => {
    expect(resolveMcpOAuthConfiguration({
      auth0Domain: 'http://auth.example.test',
      resourceUrl: 'https://events.example.test/mcp'
    })).toBeNull()
    expect(resolveMcpOAuthConfiguration({
      auth0Domain: 'auth.example.test',
      resourceUrl: 'https://events.example.test/api'
    })).toBeNull()
  })

  test('validates signature, issuer, audience, expiry, subject, and client without requiring OIDC scope claims', async () => {
    const { publicKey, privateKey } = await generateKeyPair('RS256')
    const publicJwk = await exportJWK(publicKey)
    const keySet = createLocalJWKSet({ keys: [{ ...publicJwk, kid: 'mcp-key' }] })
    const now = Math.floor(Date.now() / 1000)

    async function sign(overrides: {
      issuer?: string
      audience?: string
      scope?: string | null
      subject?: string
      clientId?: string
      expiry?: number
    } = {}) {
      const payload = {
        ...(typeof overrides.scope === 'string' ? { scope: overrides.scope } : {}),
        client_id: overrides.clientId ?? 'codex-client'
      }
      return await new SignJWT(payload)
        .setProtectedHeader({ alg: 'RS256', kid: 'mcp-key' })
        .setIssuer(overrides.issuer ?? configuration.issuer)
        .setAudience(overrides.audience ?? configuration.resourceUrl)
        .setSubject(overrides.subject ?? 'auth0|user')
        .setIssuedAt(now)
        .setExpirationTime(overrides.expiry ?? now + 300)
        .sign(privateKey)
    }

    await expect(verifyMcpOAuthAccessToken(await sign(), configuration, keySet))
      .resolves.toEqual({ subject: 'auth0|user', clientId: 'codex-client' })
    await expect(verifyMcpOAuthAccessToken(await sign({ scope: 'openid email offline_access' }), configuration, keySet))
      .resolves.toEqual({ subject: 'auth0|user', clientId: 'codex-client' })
    await expect(verifyMcpOAuthAccessToken(await sign({ issuer: 'https://wrong.example/' }), configuration, keySet))
      .rejects.toThrow()
    await expect(verifyMcpOAuthAccessToken(await sign({ audience: 'https://wrong.example/mcp' }), configuration, keySet))
      .rejects.toThrow()
    await expect(verifyMcpOAuthAccessToken(await sign({ expiry: now - 1 }), configuration, keySet))
      .rejects.toThrow()

    const { privateKey: untrustedKey } = await generateKeyPair('RS256')
    const untrustedToken = await new SignJWT({ client_id: 'codex-client' })
      .setProtectedHeader({ alg: 'RS256', kid: 'mcp-key' })
      .setIssuer(configuration.issuer)
      .setAudience(configuration.resourceUrl)
      .setSubject('auth0|user')
      .setIssuedAt(now)
      .setExpirationTime(now + 300)
      .sign(untrustedKey)
    await expect(verifyMcpOAuthAccessToken(untrustedToken, configuration, keySet)).rejects.toThrow()
  })
})
