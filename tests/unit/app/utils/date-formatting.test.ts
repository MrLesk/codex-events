import { describe, expect, test } from 'vitest'

import { formatTimestamp } from '../../../../app/utils/date-formatting'

describe('date formatting utilities', () => {
  test('formats timestamps with the shared Intl date-time formatter', () => {
    const value = '2026-04-03T20:09:00.930Z'

    expect(formatTimestamp(value)).toBe(new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit'
    }).format(new Date(value)))
  })

  test('returns the provided fallback when the timestamp is missing', () => {
    expect(formatTimestamp(null, 'Unavailable')).toBe('Unavailable')
  })

  test('returns the provided fallback when the timestamp is invalid', () => {
    expect(formatTimestamp('not-a-date', 'Unavailable')).toBe('Unavailable')
  })
})
