import { describe, expect, test } from 'vitest'

import { normalizeTabQueryValue, resolveTabQueryValue } from '../../../../app/lib/query-values'

describe('tab query helpers', () => {
  test('normalizes query tab values and selects first array entry', () => {
    expect(normalizeTabQueryValue(' prizes ')).toBe('prizes')
    expect(normalizeTabQueryValue(['DETAILS', 'overview'])).toBe('details')
    expect(normalizeTabQueryValue('')).toBeNull()
    expect(normalizeTabQueryValue(null)).toBeNull()
  })

  test('resolves allowed tabs and falls back for unknown values', () => {
    const allowedTabs = ['overview', 'prizes', 'details'] as const

    expect(resolveTabQueryValue('prizes', allowedTabs, 'overview')).toBe('prizes')
    expect(resolveTabQueryValue('unknown', allowedTabs, 'overview')).toBe('overview')
    expect(resolveTabQueryValue(undefined, allowedTabs, 'overview')).toBe('overview')
    expect(resolveTabQueryValue(['DETAILS'], allowedTabs, 'overview')).toBe('details')
  })
})
