import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { describe, expect, test } from 'vitest'

describe('MCP deployment workflow configuration', () => {
  test.each(['deploy-test.yml', 'deploy-production.yml'])('%s forwards both request-target allowlists', async (workflow) => {
    const source = await readFile(join(process.cwd(), '.github/workflows', workflow), 'utf8')
    expect(source).toContain('NUXT_MCP_ALLOWED_HOSTNAMES: ${{ vars.NUXT_MCP_ALLOWED_HOSTNAMES || vars.BASE_DOMAIN }}')
    expect(source).toContain('NUXT_MCP_ALLOWED_ORIGIN_HOSTNAMES: ${{ vars.NUXT_MCP_ALLOWED_ORIGIN_HOSTNAMES || vars.BASE_DOMAIN }}')
  })
})
