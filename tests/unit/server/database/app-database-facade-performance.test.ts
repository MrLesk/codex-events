import { readFileSync } from 'node:fs'

import { describe, expect, test } from 'vitest'

const facadeSource = readFileSync(
  new URL('../../../../server/database/non-http.ts', import.meta.url),
  'utf8'
)

describe('AppDatabase facade performance boundary', () => {
  test('keeps table construction lazy and avoids recursive reflective membranes', () => {
    expect(facadeSource).toContain('const tableFacades = new Map<string, object>()')
    expect(facadeSource).toContain('supportedQueryTableNameSet')
    expect(facadeSource).toContain('hasDangerousBuilderCapability')
    expect(facadeSource).not.toContain('Object.entries(query)')
    expect(facadeSource).not.toContain('findPropertyDescriptor')
    expect(facadeSource).not.toContain('createSafeConstructorChain')
  })
})
