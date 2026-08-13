import { afterEach, describe, expect, test } from 'vitest'

import tokenDeleteHandler from '../../../../server/api/account/mcp-tokens/[tokenId].delete'
import tokenListHandler from '../../../../server/api/account/mcp-tokens/index.get'
import tokenCreateHandler from '../../../../server/api/account/mcp-tokens/index.post'
import { mcpAccessTokens, users } from '../../../../server/database/schema'
import { authenticateMcpCredential, coalesceMcpTokenLastUse } from '../../../../server/domains/mcp/tokens'
import { createApiRouteTestHarness } from '../../../support/backend/api-route'

describe('MCP access token APIs', () => {
  const harnesses: Array<ReturnType<typeof createApiRouteTestHarness>> = []

  afterEach(async () => {
    while (harnesses.length > 0) await harnesses.pop()?.d1Database.close()
  })

  async function setup() {
    const harness = createApiRouteTestHarness({
      routes: [
        { method: 'get', path: '/api/account/mcp-tokens', handler: tokenListHandler },
        { method: 'post', path: '/api/account/mcp-tokens', handler: tokenCreateHandler },
        { method: 'delete', path: '/api/account/mcp-tokens/:tokenId', handler: tokenDeleteHandler }
      ],
      sessionUser: { sub: 'auth0|mcp-user', email: 'mcp@example.com', name: 'MCP User' }
    })
    harnesses.push(harness)
    await harness.database.insert(users).values({
      id: 'mcp_user',
      auth0Subject: 'auth0|mcp-user',
      email: 'mcp@example.com',
      displayName: 'MCP User'
    })
    return harness
  }

  test('creates once-visible credentials, lists safe fields, and revokes immediately', async () => {
    const harness = await setup()
    const before = Date.now()
    const createdResponse = await harness.request('/api/account/mcp-tokens', {
      method: 'POST',
      body: JSON.stringify({ name: 'Codex desktop' })
    })
    expect(createdResponse.status).toBe(200)
    const created = await createdResponse.json() as { data: { token: { id: string, expiresAt: string }, credential: string } }
    expect(created.data.credential).toMatch(/^ce_mcp_/u)
    expect(Date.parse(created.data.token.expiresAt) - before).toBeGreaterThanOrEqual(30 * 24 * 60 * 60 * 1000)

    const stored = await harness.database.select().from(mcpAccessTokens).get()
    expect(stored?.secretHash).not.toBe(created.data.credential)
    expect(JSON.stringify(stored)).not.toContain(created.data.credential)

    const listedResponse = await harness.request('/api/account/mcp-tokens?page=1&pageSize=10')
    const listed = await listedResponse.json() as { data: Array<Record<string, unknown>>, meta: { total: number } }
    expect(listed.meta.total).toBe(1)
    expect(listed.data[0]).not.toHaveProperty('secretHash')
    expect(listed.data[0]).not.toHaveProperty('credential')

    const revokedResponse = await harness.request(`/api/account/mcp-tokens/${created.data.token.id}`, { method: 'DELETE' })
    expect(revokedResponse.status).toBe(200)
    const revoked = await revokedResponse.json() as { data: { revokedAt: string | null } }
    expect(revoked.data.revokedAt).not.toBeNull()
  })

  test('enforces at most five active credentials', async () => {
    const harness = await setup()
    for (let index = 0; index < 5; index += 1) {
      const response = await harness.request('/api/account/mcp-tokens', {
        method: 'POST',
        body: JSON.stringify({ name: `Client ${index}` })
      })
      expect(response.status).toBe(200)
    }
    const rejected = await harness.request('/api/account/mcp-tokens', {
      method: 'POST',
      body: JSON.stringify({ name: 'Too many' })
    })
    expect(rejected.status).toBe(409)
    expect(await rejected.json()).toMatchObject({ error: { code: 'mcp_token_limit_reached' } })
  })

  test('atomically enforces the active cap across concurrent creates', async () => {
    const harness = await setup()
    const responses = await Promise.all(Array.from({ length: 6 }, (_, index) =>
      harness.request('/api/account/mcp-tokens', {
        method: 'POST',
        body: JSON.stringify({ name: `Concurrent client ${index}` })
      })))

    expect(responses.filter(response => response.status === 200)).toHaveLength(5)
    expect(responses.filter(response => response.status === 409)).toHaveLength(1)
    expect(await harness.database.select().from(mcpAccessTokens)).toHaveLength(5)
  })

  test('rejects expired credentials and coalesces last-use writes', async () => {
    const harness = await setup()
    const created = await harness.request('/api/account/mcp-tokens', {
      method: 'POST',
      body: JSON.stringify({ name: 'Lifecycle' })
    }).then(response => response.json()) as { data: { token: { id: string }, credential: string } }

    expect(await authenticateMcpCredential(harness.database, created.data.credential)).not.toBeNull()
    const firstUse = new Date('2026-08-13T12:00:00.000Z')
    await coalesceMcpTokenLastUse(harness.database, created.data.token.id, { now: () => firstUse })
    await coalesceMcpTokenLastUse(harness.database, created.data.token.id, {
      now: () => new Date(firstUse.getTime() + 60_000)
    })
    let token = await harness.database.select().from(mcpAccessTokens).get()
    expect(token?.lastUsedAt).toBe(firstUse.toISOString())

    const laterUse = new Date(firstUse.getTime() + 6 * 60_000)
    await coalesceMcpTokenLastUse(harness.database, created.data.token.id, { now: () => laterUse })
    token = await harness.database.select().from(mcpAccessTokens).get()
    expect(token?.lastUsedAt).toBe(laterUse.toISOString())

    await harness.database.update(mcpAccessTokens)
      .set({ expiresAt: '2026-08-12T00:00:00.000Z' })
    expect(await authenticateMcpCredential(harness.database, created.data.credential, {
      now: () => new Date('2026-08-13T00:00:00.000Z')
    })).toBeNull()
  })
})
