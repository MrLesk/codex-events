import { describe, expect, test } from 'vitest'

import {
  generateMcpCredential,
  mcpTokenCredentialPrefix,
  mcpTokenLifetimeMilliseconds
} from '../../../../server/domains/mcp/tokens'

describe('MCP access token primitives', () => {
  test('generates distinct high-entropy credentials and non-secret display prefixes', async () => {
    const first = await generateMcpCredential()
    const second = await generateMcpCredential()

    expect(first.credential).toMatch(/^ce_mcp_[0-9a-f-]{36}\.[A-Za-z0-9_-]{43}$/u)
    expect(first.credential).not.toBe(second.credential)
    expect(first.secretHash).toMatch(/^[0-9a-f]{64}$/u)
    expect(first.secretHash).not.toContain(first.credential)
    expect(first.displayPrefix).toBe(`${mcpTokenCredentialPrefix}${first.tokenId.slice(0, 8)}`)
    expect(first.displayPrefix).not.toContain(first.credential.split('.')[1]!)
  })

  test('defines expiry as exactly thirty 24-hour days', () => {
    expect(mcpTokenLifetimeMilliseconds).toBe(30 * 24 * 60 * 60 * 1000)
  })
})
