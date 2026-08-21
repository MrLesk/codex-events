import { readFileSync } from 'node:fs'

import { describe, expect, test } from 'vitest'

const entrypointSource = readFileSync(
  new URL('../../../../tools/deploy/cloudflare-worker-entrypoint.mjs', import.meta.url),
  'utf8'
)

describe('Cloudflare Worker cache entrypoint topology', () => {
  test('keeps the Nitro handler behind an uncached gateway and named public entrypoint', () => {
    expect(entrypointSource).toContain('import nitroHandler from \'../../.output/server/index.mjs\'')
    expect(entrypointSource).toContain('export class PublicCache extends WorkerEntrypoint')
    expect(entrypointSource).toContain('ctx.exports.PublicCache.fetch')
    expect(entrypointSource).toContain('isPublicCacheableRequest(request)')
    expect(entrypointSource).toContain('buildPublicCacheRequest(request)')
    expect(entrypointSource).toContain('return nitroHandler.fetch(request, env, ctx)')
  })

  test('does not route non-public requests through the cache entrypoint', () => {
    expect(entrypointSource).toContain('return nitroHandler.fetch(request, env, ctx)')
    expect(entrypointSource).not.toContain('export const routes')
  })
})
