import { createLocalJWKSet, exportJWK, generateKeyPair, SignJWT } from 'jose'
import { afterEach, describe, expect, test, vi } from 'vitest'
import { eq } from 'drizzle-orm'

import accountPatchHandler from '../../../../server/api/account.patch'
import protectedResourceHandler from '../../../../server/routes/.well-known/oauth-protected-resource.get'
import mcpHandler from '../../../../server/routes/mcp.post'
import { auditLogs, eventRoleAssignments, events, mcpAccessTokens, platformDocuments, userPlatformDocumentAcceptances, users } from '../../../../server/database/schema'
import { authenticateMcpOAuthCredential } from '../../../../server/domains/mcp/oauth'
import { createMcpAccessToken } from '../../../../server/domains/mcp/tokens'
import { mcpRateLimitBindingName } from '../../../../server/utils/rate-limit'
import { createApiRouteTestHarness } from '../../../support/backend/api-route'

describe('stateless MCP protocol', () => {
  const harnesses: Array<ReturnType<typeof createApiRouteTestHarness>> = []

  afterEach(async () => {
    while (harnesses.length > 0) await harnesses.pop()?.d1Database.close()
  })

  async function setup(options: { isPlatformAdmin?: boolean, isEventOrganizer?: boolean, eventRole?: 'judge' | 'staff' | 'event_admin' } = {}) {
    const rateLimiter = { limit: vi.fn(async () => ({ success: true })) }
    const harness = createApiRouteTestHarness({
      routes: [
        { method: 'post', path: '/mcp', handler: mcpHandler },
        { method: 'get', path: '/.well-known/oauth-protected-resource', handler: protectedResourceHandler },
        { method: 'patch', path: '/api/account', handler: accountPatchHandler }
      ],
      sessionUser: { sub: 'auth0|mcp-user', email: 'mcp@example.com', name: 'MCP User' },
      autoAcceptCurrentPlatformDocuments: false,
      cloudflareEnv: { [mcpRateLimitBindingName]: rateLimiter },
      runtimeConfig: {
        auth0: { domain: 'https://auth.example.test' },
        mcp: {
          resourceUrl: 'http://localhost:3000/mcp',
          oauthScope: 'mcp:access',
          allowedHostnames: 'localhost,test.example',
          allowedOriginHostnames: 'localhost,test.example'
        }
      }
    })
    harnesses.push(harness)
    await harness.database.insert(users).values({
      id: 'mcp_user',
      auth0Subject: 'auth0|mcp-user',
      email: 'mcp@example.com',
      displayName: 'MCP User',
      isPlatformAdmin: options.isPlatformAdmin ?? false,
      isEventOrganizer: options.isEventOrganizer ?? false
    })
    await harness.database.insert(platformDocuments).values([
      { id: 'privacy_v1', documentType: 'privacy_policy', version: 1, title: 'Privacy', content: 'Privacy', publishedAt: '2026-08-01T00:00:00.000Z' },
      { id: 'terms_v1', documentType: 'platform_terms', version: 1, title: 'Terms', content: 'Terms', publishedAt: '2026-08-01T00:00:00.000Z' }
    ])
    await harness.database.insert(userPlatformDocumentAcceptances).values([
      { id: 'accept_privacy', userId: 'mcp_user', platformDocumentId: 'privacy_v1', acceptedAt: '2026-08-02T00:00:00.000Z' },
      { id: 'accept_terms', userId: 'mcp_user', platformDocumentId: 'terms_v1', acceptedAt: '2026-08-02T00:00:00.000Z' }
    ])
    if (options.eventRole) {
      await harness.database.insert(events).values({
        id: 'mcp_event', eventType: 'hackathon', name: 'MCP Event', slug: `mcp-event-${options.eventRole}`,
        description: 'MCP role fixture', city: 'Vienna', country: 'Austria', address: 'Fixture',
        registrationOpensAt: '2026-08-01T00:00:00.000Z', registrationClosesAt: '2026-08-02T00:00:00.000Z',
        submissionOpensAt: '2026-08-02T00:00:00.000Z', submissionClosesAt: '2026-08-03T00:00:00.000Z',
        maxTeamMembers: 5, createdByUserId: 'mcp_user'
      })
      await harness.database.insert(eventRoleAssignments).values({
        id: `mcp_role_${options.eventRole}`, eventId: 'mcp_event', userId: 'mcp_user', role: options.eventRole,
        isInJudgePool: options.eventRole === 'judge', isStaff: options.eventRole === 'staff'
      })
    }
    const created = await createMcpAccessToken(harness.database, 'mcp_user', { name: 'Test client' })
    return { harness, credential: created.credential, rateLimiter }
  }

  async function oauthCredential(harness: ReturnType<typeof createApiRouteTestHarness>, overrides: {
    issuer?: string
    audience?: string
    scope?: string
    subject?: string
    clientId?: string
    expiresAt?: number
  } = {}) {
    const { publicKey, privateKey } = await generateKeyPair('RS256')
    const publicJwk = await exportJWK(publicKey)
    const now = Math.floor(Date.now() / 1000)
    const issuer = overrides.issuer ?? 'https://auth.example.test/'
    const audience = overrides.audience ?? 'http://localhost:3000/mcp'
    const credential = await new SignJWT({
      scope: overrides.scope ?? 'mcp:access',
      client_id: overrides.clientId ?? 'codex-test-client'
    })
      .setProtectedHeader({ alg: 'RS256', kid: 'test-key' })
      .setIssuer(issuer)
      .setAudience(audience)
      .setSubject(overrides.subject ?? 'auth0|mcp-user')
      .setIssuedAt(now)
      .setExpirationTime(overrides.expiresAt ?? now + 300)
      .sign(privateKey)
    const authenticated = await authenticateMcpOAuthCredential(harness.database, credential, {
      issuer: 'https://auth.example.test/',
      resourceUrl: 'http://localhost:3000/mcp',
      scope: 'mcp:access'
    }, createLocalJWKSet({ keys: [{ ...publicJwk, kid: 'test-key' }] }))
    return { credential, authenticated, publicJwk: { ...publicJwk, kid: 'test-key' } }
  }

  async function rpc(harness: ReturnType<typeof createApiRouteTestHarness>, credential: string, body: unknown) {
    return await harness.request('/mcp', {
      method: 'POST',
      headers: {
        authorization: `Bearer ${credential}`,
        host: 'localhost',
        accept: 'application/json, text/event-stream'
      },
      body: JSON.stringify(body)
    })
  }

  async function modernRpc(
    harness: ReturnType<typeof createApiRouteTestHarness>,
    credential: string,
    id: number,
    method: string,
    params: Record<string, unknown> = {}
  ) {
    return await harness.request('/mcp', {
      method: 'POST',
      headers: {
        'authorization': `Bearer ${credential}`,
        'host': 'localhost',
        'accept': 'application/json, text/event-stream',
        'mcp-protocol-version': '2026-07-28',
        'mcp-method': method
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id,
        method,
        params: {
          ...params,
          _meta: {
            'io.modelcontextprotocol/protocolVersion': '2026-07-28',
            'io.modelcontextprotocol/clientInfo': { name: 'vitest', version: '1' },
            'io.modelcontextprotocol/clientCapabilities': {}
          }
        }
      })
    })
  }

  async function rpcPayload(response: Response) {
    const text = await response.text()
    if (response.headers.get('content-type')?.includes('text/event-stream')) {
      const dataLine = text.split('\n').find(line => line.startsWith('data: '))
      return JSON.parse(dataLine?.slice(6) ?? 'null') as Record<string, unknown>
    }
    return JSON.parse(text) as Record<string, unknown>
  }

  test('negotiates 2026-07-28, initializes legacy clients, lists tools, and calls a public discovery operation', async () => {
    const { harness, credential, rateLimiter } = await setup()

    const discovered = await modernRpc(harness, credential, 1, 'server/discover')
    const discoveredPayload = await rpcPayload(discovered)
    expect(discovered.status, JSON.stringify(discoveredPayload)).toBe(200)
    expect(discoveredPayload).toMatchObject({
      result: { supportedVersions: expect.arrayContaining(['2026-07-28']) }
    })

    const modernList = await modernRpc(harness, credential, 2, 'tools/list')
    const modernListPayload = await rpcPayload(modernList) as { result: { tools: Array<{ name: string }> } }
    expect(modernList.status, JSON.stringify(modernListPayload)).toBe(200)
    expect(modernListPayload.result.tools.some(tool => tool.name === 'get_events')).toBe(true)

    const initialized = await rpc(harness, credential, {
      jsonrpc: '2.0', id: 3, method: 'initialize',
      params: { protocolVersion: '2026-07-28', capabilities: {}, clientInfo: { name: 'vitest', version: '1' } }
    })
    const initializedPayload = await rpcPayload(initialized)
    expect(initialized.status, JSON.stringify(initializedPayload)).toBe(200)
    expect(initializedPayload).toMatchObject({
      result: { protocolVersion: '2025-11-25', serverInfo: { name: 'codex-events' } }
    })

    const listed = await rpc(harness, credential, { jsonrpc: '2.0', id: 4, method: 'tools/list', params: {} })
    const listPayload = await rpcPayload(listed) as { result: { tools: Array<{ name: string, inputSchema: Record<string, unknown>, outputSchema: Record<string, unknown>, annotations: Record<string, unknown> }> } }
    expect(listPayload.result.tools.some(tool => tool.name === 'get_events')).toBe(true)
    const eventsTool = listPayload.result.tools.find(tool => tool.name === 'get_events')!
    expect(eventsTool.inputSchema).toMatchObject({ type: 'object', properties: { query: expect.any(Object) } })
    expect(eventsTool.outputSchema).toMatchObject({
      type: 'object',
      properties: {
        data: {
          type: 'array',
          items: { type: 'object', properties: { id: { type: 'string' }, eventType: expect.any(Object), name: { type: 'string' } } }
        },
        meta: expect.any(Object)
      }
    })
    expect(eventsTool.annotations).toMatchObject({ readOnlyHint: true, destructiveHint: false, idempotentHint: true })

    const called = await rpc(harness, credential, {
      jsonrpc: '2.0', id: 5, method: 'tools/call',
      params: { name: 'get_events', arguments: { query: {} } }
    })
    expect(called.status).toBe(200)
    expect(await rpcPayload(called)).toMatchObject({ result: { structuredContent: { data: [] } } })
    expect(rateLimiter.limit).toHaveBeenCalledWith({ key: expect.stringContaining('mcp-credential:manual:') })
  })

  test('publishes OAuth protected-resource metadata and challenges unauthenticated clients', async () => {
    const { harness } = await setup()
    const metadata = await harness.request('/.well-known/oauth-protected-resource')
    expect(metadata.status).toBe(200)
    expect(await metadata.json()).toEqual({
      resource: 'http://localhost:3000/mcp',
      authorization_servers: ['https://auth.example.test/'],
      scopes_supported: ['mcp:access'],
      bearer_methods_supported: ['header']
    })

    const response = await rpc(harness, 'invalid', { jsonrpc: '2.0', id: 1, method: 'tools/list', params: {} })
    expect(response.status).toBe(401)
    expect(response.headers.get('www-authenticate')).toBe(
      'Bearer resource_metadata="http://localhost:3000/.well-known/oauth-protected-resource", scope="mcp:access"'
    )
  })

  test('validates OAuth claims and maps the subject to the current platform user', async () => {
    const { harness } = await setup()
    const valid = await oauthCredential(harness)
    expect(valid.authenticated).toMatchObject({
      subject: 'auth0|mcp-user',
      clientId: 'codex-test-client',
      user: { id: 'mcp_user' }
    })

    expect((await oauthCredential(harness, { issuer: 'https://wrong.example.test/' })).authenticated).toBeNull()
    expect((await oauthCredential(harness, { audience: 'https://wrong.example.test/mcp' })).authenticated).toBeNull()
    expect((await oauthCredential(harness, { scope: 'profile' })).authenticated).toBeNull()
    expect((await oauthCredential(harness, { subject: 'auth0|missing-user' })).authenticated).toBeNull()
    expect((await oauthCredential(harness, { expiresAt: Math.floor(Date.now() / 1000) - 1 })).authenticated).toBeNull()
  })

  test('uses a valid Auth0 OAuth access token for the same MCP operation pipeline', async () => {
    const { harness, rateLimiter } = await setup()
    const fixture = await oauthCredential(harness)
    const originalFetch = globalThis.fetch
    vi.stubGlobal('fetch', vi.fn(async (input: RequestInfo | URL) => {
      if (String(input) === 'https://auth.example.test/.well-known/jwks.json') {
        return Response.json({ keys: [fixture.publicJwk] })
      }
      return await originalFetch(input)
    }))

    try {
      const response = await rpc(harness, fixture.credential, {
        jsonrpc: '2.0', id: 1, method: 'tools/list', params: {}
      })
      const payload = await rpcPayload(response) as { result: { tools: Array<{ name: string }> } }
      expect(response.status, JSON.stringify(payload)).toBe(200)
      expect(payload.result.tools.some(tool => tool.name === 'patch_account')).toBe(true)
      expect(rateLimiter.limit).toHaveBeenCalledWith({
        key: expect.stringContaining('mcp-credential:oauth:mcp_user:codex-test-client')
      })

      const mutation = await rpc(harness, fixture.credential, {
        jsonrpc: '2.0', id: 2, method: 'tools/call',
        params: {
          name: 'patch_account',
          arguments: { body: { firstName: 'OAuth', familyName: 'User' } }
        }
      })
      expect(mutation.status).toBe(200)
      expect(await rpcPayload(mutation)).toMatchObject({
        result: { structuredContent: { data: { user: { firstName: 'OAuth', familyName: 'User' } } } }
      })
      const audit = await harness.database.select().from(auditLogs)
        .where(eq(auditLogs.action, 'mcp.mutation_attempted')).get()
      expect(audit).toMatchObject({
        entityType: 'mcp_oauth_client',
        entityId: 'codex-test-client',
        metadata: {
          authenticationMethod: 'oauth',
          toolName: 'patch_account',
          outcome: 'succeeded'
        }
      })
      expect(JSON.stringify(audit)).not.toContain(fixture.credential)
    } finally {
      vi.stubGlobal('fetch', originalFetch)
    }
  })

  test('rejects cookies and invalid, expired, revoked, or deleted-owner credentials', async () => {
    const { harness, credential } = await setup()
    const cookieResponse = await harness.request('/mcp', {
      method: 'POST',
      headers: { authorization: `Bearer ${credential}`, cookie: 'session=value', host: 'localhost' },
      body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'tools/list', params: {} })
    })
    expect(cookieResponse.status).toBe(400)

    const invalid = await rpc(harness, 'invalid', { jsonrpc: '2.0', id: 2, method: 'tools/list', params: {} })
    expect(invalid.status).toBe(401)

    const [token] = await harness.database.select().from(mcpAccessTokens)
    await harness.database.update(mcpAccessTokens).set({ expiresAt: '2026-08-12T00:00:00.000Z' }).where(eq(mcpAccessTokens.id, token!.id))
    const expired = await rpc(harness, credential, { jsonrpc: '2.0', id: 3, method: 'tools/list', params: {} })
    expect(expired.status).toBe(401)

    await harness.database.update(mcpAccessTokens).set({ expiresAt: '2099-08-12T00:00:00.000Z' }).where(eq(mcpAccessTokens.id, token!.id))
    await harness.database.update(mcpAccessTokens).set({ revokedAt: new Date().toISOString() }).where(eq(mcpAccessTokens.id, token!.id))
    const revoked = await rpc(harness, credential, { jsonrpc: '2.0', id: 4, method: 'tools/list', params: {} })
    expect(revoked.status).toBe(401)

    const second = await createMcpAccessToken(harness.database, 'mcp_user', { name: 'Deleted owner' })
    await harness.database.update(users).set({ deletedAt: new Date().toISOString() }).where(eq(users.id, 'mcp_user'))
    const deletedOwner = await rpc(harness, second.credential, { jsonrpc: '2.0', id: 5, method: 'tools/list', params: {} })
    expect(deletedOwner.status).toBe(401)
  })

  test('enforces host, origin, and rate limit checks', async () => {
    const { harness, credential, rateLimiter } = await setup()
    const body = { jsonrpc: '2.0', id: 1, method: 'tools/list', params: {} }
    const allowedBrowserOrigin = await harness.request('/mcp', {
      method: 'POST',
      headers: {
        authorization: `Bearer ${credential}`,
        host: 'test.example',
        origin: 'https://test.example',
        accept: 'application/json, text/event-stream'
      },
      body: JSON.stringify(body)
    })
    expect(allowedBrowserOrigin.status).toBe(200)
    rateLimiter.limit.mockClear()
    await harness.database.update(mcpAccessTokens).set({ lastUsedAt: null })

    const forbiddenHost = await harness.request('/mcp', {
      method: 'POST', headers: { authorization: `Bearer ${credential}`, host: 'evil.example' }, body: JSON.stringify(body)
    })
    expect(forbiddenHost.status).toBe(403)

    const forbiddenOrigin = await harness.request('/mcp', {
      method: 'POST', headers: { authorization: `Bearer ${credential}`, host: 'localhost', origin: 'https://evil.example' }, body: JSON.stringify(body)
    })
    expect(forbiddenOrigin.status).toBe(403)

    const malformedOrigin = await harness.request('/mcp', {
      method: 'POST', headers: { authorization: 'Bearer invalid', host: 'localhost', origin: 'not a URL' }, body: JSON.stringify(body)
    })
    expect(malformedOrigin.status).toBe(403)
    expect(await malformedOrigin.json()).toEqual({
      error: { code: 'mcp_request_target_forbidden', message: 'The MCP request target is not allowed.' }
    })
    expect(rateLimiter.limit).not.toHaveBeenCalled()
    expect((await harness.database.select().from(mcpAccessTokens).get())?.lastUsedAt).toBeNull()

    rateLimiter.limit.mockResolvedValueOnce({ success: false })
    const limited = await rpc(harness, credential, body)
    expect(limited.status).toBe(429)
  })

  test('re-reads legal consent for discovery and audits mutation attempts without arguments', async () => {
    const { harness, credential } = await setup()
    const listBefore = await rpcPayload(await rpc(harness, credential, { jsonrpc: '2.0', id: 1, method: 'tools/list', params: {} })) as { result: { tools: Array<{ name: string }> } }
    expect(listBefore.result.tools.some(tool => tool.name === 'patch_account')).toBe(true)

    await harness.database.delete(userPlatformDocumentAcceptances)
    const listAfter = await rpcPayload(await rpc(harness, credential, { jsonrpc: '2.0', id: 2, method: 'tools/list', params: {} })) as { result: { tools: Array<{ name: string }> } }
    expect(listAfter.result.tools.some(tool => tool.name === 'patch_account')).toBe(false)
    expect(listAfter.result.tools.some(tool => tool.name === 'get_events')).toBe(true)

    await harness.database.insert(userPlatformDocumentAcceptances).values([
      { id: 'accept_privacy_again', userId: 'mcp_user', platformDocumentId: 'privacy_v1', acceptedAt: '2026-08-03T00:00:00.000Z' },
      { id: 'accept_terms_again', userId: 'mcp_user', platformDocumentId: 'terms_v1', acceptedAt: '2026-08-03T00:00:00.000Z' }
    ])
    const argumentsPayload = { body: { firstName: '', familyName: '' } }
    const called = await rpcPayload(await rpc(harness, credential, {
      jsonrpc: '2.0', id: 3, method: 'tools/call', params: { name: 'patch_account', arguments: argumentsPayload }
    })) as { result: { isError: boolean } }
    expect(called.result.isError).toBe(true)

    const mutationAudit = await harness.database.select().from(auditLogs)
      .where(eq(auditLogs.action, 'mcp.mutation_attempted')).get()
    expect(mutationAudit?.metadata).toMatchObject({
      authenticationMethod: 'manual_token',
      toolName: 'patch_account',
      outcome: 'failed'
    })
    expect(JSON.stringify(mutationAudit?.metadata)).not.toContain('firstName')
    expect(JSON.stringify(mutationAudit?.metadata)).not.toContain(credential)
  })

  test('re-reads platform roles for discovery on every request', async () => {
    const { harness, credential } = await setup({ isPlatformAdmin: true })
    const before = await rpcPayload(await rpc(harness, credential, {
      jsonrpc: '2.0', id: 1, method: 'tools/list', params: {}
    })) as { result: { tools: Array<{ name: string }> } }
    expect(before.result.tools.some(tool => tool.name === 'get_platform-admins')).toBe(true)

    await harness.database.update(users).set({ isPlatformAdmin: false }).where(eq(users.id, 'mcp_user'))
    const after = await rpcPayload(await rpc(harness, credential, {
      jsonrpc: '2.0', id: 2, method: 'tools/list', params: {}
    })) as { result: { tools: Array<{ name: string }> } }
    expect(after.result.tools.some(tool => tool.name === 'get_platform-admins')).toBe(false)
    expect(after.result.tools.some(tool => tool.name === 'patch_account')).toBe(true)
  })

  test('advertises role-aware catalogs for participant, staff, event admin, organizer, and platform admin actors', async () => {
    async function toolNames(options: Parameters<typeof setup>[0]) {
      const { harness, credential } = await setup(options)
      const payload = await rpcPayload(await rpc(harness, credential, {
        jsonrpc: '2.0', id: 1, method: 'tools/list', params: {}
      })) as { result: { tools: Array<{ name: string }> } }
      return new Set(payload.result.tools.map(tool => tool.name))
    }

    const participant = await toolNames({})
    expect(participant).toContain('get_events_by_eventId_staff')
    expect(participant).not.toContain('get_events_by_eventId_talk-proposals')
    expect(participant).not.toContain('post_events')

    const staff = await toolNames({ eventRole: 'staff' })
    expect(staff).toContain('get_events_by_eventId_talk-proposals')
    expect(staff).not.toContain('post_events_by_eventId_talk-proposals_by_proposalId_actions_reject')

    const eventAdmin = await toolNames({ eventRole: 'event_admin' })
    expect(eventAdmin).toContain('post_events_by_eventId_talk-proposals_by_proposalId_actions_reject')
    expect(eventAdmin).not.toContain('post_events')

    const organizer = await toolNames({ isEventOrganizer: true })
    expect(organizer).toContain('post_events')
    expect(organizer).not.toContain('get_platform-admins')

    const platformAdmin = await toolNames({ isPlatformAdmin: true })
    expect(platformAdmin).toContain('post_events')
    expect(platformAdmin).toContain('get_platform-admins')
  })

  test('REST and MCP use the same profile operation output and side effects', async () => {
    const { harness, credential } = await setup()
    const body = { firstName: 'Ada', familyName: 'Lovelace', company: 'Analytical Engines' }
    const restResponse = await harness.request('/api/account', {
      method: 'PATCH',
      body: JSON.stringify(body)
    })
    expect(restResponse.status).toBe(200)
    const restPayload = await restResponse.json() as { data: { user: Record<string, unknown> } }
    expect(restPayload.data.user).toMatchObject(body)

    const mcpPayload = await rpcPayload(await rpc(harness, credential, {
      jsonrpc: '2.0', id: 1, method: 'tools/call',
      params: { name: 'patch_account', arguments: { body } }
    })) as { result: { structuredContent: { data: { user: Record<string, unknown> } } } }
    expect(mcpPayload.result.structuredContent.data.user).toMatchObject(body)
    expect(Object.keys(mcpPayload.result.structuredContent.data.user).sort())
      .toEqual(Object.keys(restPayload.data.user).sort())

    const stored = await harness.database.select().from(users).where(eq(users.id, 'mcp_user')).get()
    expect(stored).toMatchObject(body)
    const accountAudits = await harness.database.select().from(auditLogs).where(eq(auditLogs.action, 'account.updated'))
    expect(accountAudits).toHaveLength(2)
    const mcpAudit = await harness.database.select().from(auditLogs).where(eq(auditLogs.action, 'mcp.mutation_attempted')).get()
    expect(mcpAudit?.metadata).toMatchObject({ toolName: 'patch_account', outcome: 'succeeded' })
  })
})
