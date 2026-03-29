import { readFileSync } from 'node:fs'

import { describe, expect, test } from 'vitest'

describe('auth0 branding assets', () => {
  test('centers the canonical wordmark within the svg canvas', () => {
    const svg = readFileSync(new URL('../../../../public/auth0/codex-hackathons-wordmark.svg', import.meta.url), 'utf8')

    expect(svg).toContain('x="320"')
    expect(svg).toContain('text-anchor="middle"')
  })
})
