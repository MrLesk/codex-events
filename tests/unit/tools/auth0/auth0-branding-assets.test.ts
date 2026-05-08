import { readFileSync } from 'node:fs'

import { describe, expect, test } from 'vitest'

describe('auth0 branding assets', () => {
  test('includes the distinct platform mark and left-aligned wordmark', () => {
    const svg = readFileSync(new URL('../../../../public/auth0/codex-events-wordmark.svg', import.meta.url), 'utf8')

    expect(svg).toContain('data-platform-mark="codex-events"')
    expect(svg).toContain('<text')
    expect(svg).toContain('x="120"')
    expect(svg).toContain('Codex Events')
    expect(svg).not.toContain('text-anchor="middle"')
  })
})
