import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { describe, expect, test } from 'vitest'

describe('MCP deployment workflow configuration', () => {
  test.each(['deploy-test.yml', 'deploy-production.yml'])('%s forwards MCP request-target and OAuth resource configuration', async (workflow) => {
    const source = await readFile(join(process.cwd(), '.github/workflows', workflow), 'utf8')
    expect(source).toContain('NUXT_MCP_ALLOWED_HOSTNAMES: ${{ vars.NUXT_MCP_ALLOWED_HOSTNAMES || vars.BASE_DOMAIN }}')
    expect(source).toContain('NUXT_MCP_ALLOWED_ORIGIN_HOSTNAMES: ${{ vars.NUXT_MCP_ALLOWED_ORIGIN_HOSTNAMES || vars.BASE_DOMAIN }}')
    expect(source).toContain('NUXT_MCP_RESOURCE_URL: https://${{ vars.BASE_DOMAIN }}/mcp')
    expect(source).not.toContain('NUXT_MCP_OAUTH_REQUIRED_SCOPES')
    expect(source).toContain('AUTH0_MCP_CLIENT_METADATA_URLS: ${{ vars.AUTH0_MCP_CLIENT_METADATA_URLS }}')
    expect(source).toContain('AUTH0_GOOGLE_CONNECTION_NAME: ${{ vars.AUTH0_GOOGLE_CONNECTION_NAME }}')
  })
})
